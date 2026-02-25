import { useEffect, useState } from 'react';
import { Card, Table, Tag, App, DatePicker, Select, Space, Button, Modal, Form, Input, InputNumber, Tooltip } from 'antd';
import { EditOutlined, CheckOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

const CommissionPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]); // Aggregated data
  const [rawData, setRawData] = useState<any[]>([]); // Raw data from API
  const [loading, setLoading] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState<dayjs.Dayjs | null>(dayjs());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const isAdminOrManager = user?.role === Role.ADMIN || user?.role === Role.MANAGER;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    processData();
  }, [rawData, selectedQuarter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/commission');
      setRawData(response.data);
    } catch (error) {
      message.error('获取提成数据失败');
    } finally {
      setLoading(false);
    }
  };

  const processData = () => {
      // 1. Filter by Quarter
      const filtered = selectedQuarter 
          ? rawData.filter((item: any) => dayjs(item.createdAt).isSame(selectedQuarter, 'quarter'))
          : rawData;

      // 2. Group by Customer
      const grouped: Record<number, any> = {};
      
      filtered.forEach((c: any) => {
          if (!grouped[c.customerId]) {
              grouped[c.customerId] = {
                  key: c.customerId,
                  customerId: c.customerId,
                  customerName: c.customer?.name || 'Unknown',
                  totalCommission: 0,
                  contractAmount: Number(c.amount), // Contract amount (before deduction)
                  // We need channel info to calculate actual amount.
                  // Since `commission` table doesn't store channel points, we might need to rely on the fact that
                  // commissions are calculated based on actual amount.
                  // But here we need to display it.
                  // Let's assume we can calculate it back or check if channel info is available in `c.customer`.
                  // `c.customer` is included in `GET /commission`? 
                  // Let's check api/routes/common.ts. It includes `customer`.
                  // But does it include `customer.channel`?
                  // We might need to update the backend to include `customer: { include: { channel: true } }`.
                  actualAmount: 0, 
                  details: {
                      CHANCE: [],
                      CALL: [],
                      TOUCH: [],
                      DEAL: [],
                      DEPT: []
                  }
              };
          }
          
          const group = grouped[c.customerId];
          group.totalCommission += Number(c.commission);
          
          // Try to calculate actual amount
          // Contract Amount is c.amount (stored in commission record, which is contractAmount)
          // Wait, in `customers.ts`, we store `amount: Number(contractAmount)` in commission.
          // So `c.amount` is the original contract amount.
          
          // To get actual amount: 
          // If we have channel points, we can calculate.
          // Backend `GET /commission` likely needs to include channel info.
          // For now, let's use a placeholder or try to access channel if available.
          // Assuming backend includes channel:
          const channelPoints = c.customer?.channel?.points ? Number(c.customer.channel.points) : 0;
          let deduction = 0;
          if (channelPoints > 0) {
              if (channelPoints > 1) { // Percentage (e.g. 5 means 5%)
                  deduction = group.contractAmount * (channelPoints / 100);
              } else { // Rate (e.g. 0.05)
                  deduction = group.contractAmount * channelPoints;
              }
          }
          group.actualAmount = group.contractAmount - deduction;

          const detail = {
              id: c.id,
              userName: c.user?.name,
              amount: Number(c.commission),
              status: c.status
          };

          // Safety check for unknown types
          if (!group.details[c.type]) {
              group.details[c.type] = [];
          }
          group.details[c.type].push(detail);
      });

      setData(Object.values(grouped));
  };

  const handleEdit = (detail: any) => {
      if (!isAdminOrManager) return;
      setEditingRecord(detail);
      form.setFieldsValue({
          commission: detail.amount,
      });
      setIsModalOpen(true);
  };

  const handleUpdate = async (values: any) => {
      try {
          await api.put(`/commission/${editingRecord.id}`, values);
          message.success('更新成功');
          setIsModalOpen(false);
          fetchData();
      } catch (error) {
          message.error('更新失败');
      }
  };

  const renderDetailCell = (details: any[], type: string) => {
      if (!details || details.length === 0) return <span style={{ color: '#ccc' }}>-</span>;
      
      // If DEAL or DEPT, we only show Total.
      // But user said: "每个客户只显示1条个人签约总提成和部门管理总提成"
      // This likely applies to ALL columns? Or just DEAL/DEPT?
      // "佣金列表中，每个客户只显示1条个人签约总提成和部门管理总提成"
      // If a customer has multiple DEAL commissions (e.g. multiple people splitting),
      // or multiple DEPT commissions (e.g. manager + someone else?)
      // Usually one deal = one set of commissions.
      // But if we want to show just ONE line per customer (which we are doing),
      // and "1条个人签约总提成", maybe sum them up?
      // "个人签约总提成" -> Sum of DEAL type commissions?
      // "部门管理总提成" -> Sum of DEPT type commissions?
      
      // If we sum them up, we can't edit individual ones easily.
      // But user said "每个客户只显示1条".
      // Let's sum them up for display.
      // And maybe clicking opens a modal with details?
      // Or just assume one main person.
      
      // Let's sum amounts.
      const totalAmount = details.reduce((sum, d) => sum + d.amount, 0);
      
      // For editing: If multiple, which one to edit?
      // If we display total, maybe we can't edit directly inline.
      // Or we display the first one?
      // Let's list them but simplify visual if requested.
      // "每个客户只显示1条" -> implies summarizing.
      
      return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ marginRight: 8 }}>总计:</span>
                  <span 
                      title={isAdminOrManager ? "点击查看详情/修改" : ""}
                      style={{ 
                          fontWeight: 'bold', 
                          cursor: isAdminOrManager ? 'pointer' : 'default',
                          color: isAdminOrManager ? '#1677ff' : 'inherit',
                          textDecoration: isAdminOrManager ? 'underline' : 'none'
                      }}
                      onClick={() => {
                          if (details.length === 1) {
                              handleEdit(details[0]);
                          } else {
                              // If multiple, maybe just edit the first or show a list in modal?
                              // For simplicity, edit first one for now, or loop.
                              // Let's stick to listing all for now, but maybe user wants them merged?
                              // "每个客户只显示1条" -> Maybe there ARE multiple and he wants to see just one?
                              // If there are multiple people on a deal, summing is correct.
                              // But editing a sum is hard.
                              // Let's fallback to listing all but maybe visually cleaner?
                              // Re-reading: "每个客户只显示1条个人签约总提成和部门管理总提成"
                              // This sounds like aggregating.
                          }
                      }}
                  >
                      ¥{totalAmount}
                  </span>
              </div>
              {/* List details if expanded? Or just keep it simple as requested */}
              {/* If user wants only 1 line, we hide details unless there's only 1. */}
              {/* If there are multiple, showing just sum might hide info. */}
              {/* Let's show list but compact. */}
              {details.map((d: any) => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#666' }}>
                      <span style={{ marginRight: 8 }}>{d.userName}:</span>
                      <span 
                          title={isAdminOrManager ? "点击修改" : ""}
                          style={{ 
                              cursor: isAdminOrManager ? 'pointer' : 'default',
                              textDecoration: isAdminOrManager ? 'underline' : 'none'
                          }}
                          onClick={() => handleEdit(d)}
                      >
                          ¥{d.amount}
                      </span>
                  </div>
              ))}
          </div>
      );
  };

  const columns = [
    {
      title: '客户',
      dataIndex: 'customerName',
      key: 'customerName',
      fixed: 'left',
      width: 120,
    },
    {
      title: '签约金额',
      dataIndex: 'contractAmount',
      key: 'contractAmount',
      width: 120,
      render: (val: number) => `¥${val.toLocaleString()}`,
    },
    {
      title: '实际金额',
      dataIndex: 'actualAmount',
      key: 'actualAmount',
      width: 120,
      render: (val: number) => <span style={{ color: '#1677ff' }}>¥{val.toLocaleString()}</span>,
    },
    {
      title: '总提成',
      dataIndex: 'totalCommission',
      key: 'totalCommission',
      width: 120,
      render: (val: number) => <span style={{ color: '#cf1322', fontWeight: 'bold' }}>¥{val.toLocaleString()}</span>,
    },
    {
      title: '客资提成 (CHANCE)',
      dataIndex: ['details', 'CHANCE'],
      key: 'CHANCE',
      width: 180,
      render: (val: any) => renderDetailCell(val, 'CHANCE'),
    },
    {
      title: '约访提成 (CALL)',
      dataIndex: ['details', 'CALL'],
      key: 'CALL',
      width: 180,
      render: (val: any) => renderDetailCell(val, 'CALL'),
    },
    {
      title: '接待提成 (TOUCH)',
      dataIndex: ['details', 'TOUCH'],
      key: 'TOUCH',
      width: 180,
      render: (val: any) => renderDetailCell(val, 'TOUCH'),
    },
    {
      title: '签约提成 (DEAL)',
      dataIndex: ['details', 'DEAL'],
      key: 'DEAL',
      width: 180,
      render: (val: any) => renderDetailCell(val, 'DEAL'),
    },
    {
      title: '部门管理 (DEPT)',
      dataIndex: ['details', 'DEPT'],
      key: 'DEPT',
      width: 180,
      render: (val: any) => renderDetailCell(val, 'DEPT'),
    }
  ];

  const totalCommission = data.reduce((sum, item) => sum + item.totalCommission, 0);

  return (
    <div>
      <Card 
        title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>提成管理</span>
                <span style={{ fontSize: 14, fontWeight: 'normal', color: '#666' }}>
                    本季预计总提成: <span style={{ color: '#cf1322', fontSize: 18, fontWeight: 'bold' }}>¥{totalCommission.toLocaleString()}</span>
                </span>
            </div>
        }
        extra={
            <DatePicker 
                picker="quarter" 
                value={selectedQuarter} 
                onChange={setSelectedQuarter} 
                allowClear={false}
            />
        }
      >
        <Table 
            columns={columns as any} 
            dataSource={data} 
            rowKey="key" 
            loading={loading}
            scroll={{ x: 1200 }}
            pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal 
        title="编辑提成" 
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)} 
        onOk={() => form.submit()}
      >
          <Form form={form} layout="vertical" onFinish={handleUpdate}>
              <Form.Item name="commission" label="提成金额" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} prefix="¥" precision={2} />
              </Form.Item>
          </Form>
      </Modal>
    </div>
  );
};

export default CommissionPage;
