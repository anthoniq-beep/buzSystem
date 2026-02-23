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
                  contractAmount: Number(c.amount),
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
          group.contractAmount = Math.max(group.contractAmount, Number(c.amount));

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

  const renderDetailCell = (details: any[]) => {
      if (!details || details.length === 0) return <span style={{ color: '#ccc' }}>-</span>;
      return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {details.map((d: any) => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                      <span style={{ marginRight: 8 }}>{d.userName}:</span>
                      <span 
                          title={isAdminOrManager ? "点击修改" : ""}
                          style={{ 
                              fontWeight: 'bold', 
                              cursor: isAdminOrManager ? 'pointer' : 'default',
                              color: isAdminOrManager ? '#1677ff' : 'inherit',
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
      render: (val: any) => renderDetailCell(val),
    },
    {
      title: '约访提成 (CALL)',
      dataIndex: ['details', 'CALL'],
      key: 'CALL',
      width: 180,
      render: (val: any) => renderDetailCell(val),
    },
    {
      title: '接待提成 (TOUCH)',
      dataIndex: ['details', 'TOUCH'],
      key: 'TOUCH',
      width: 180,
      render: (val: any) => renderDetailCell(val),
    },
    {
      title: '签约提成 (DEAL)',
      dataIndex: ['details', 'DEAL'],
      key: 'DEAL',
      width: 180,
      render: (val: any) => renderDetailCell(val),
    },
    {
      title: '部门管理 (DEPT)',
      dataIndex: ['details', 'DEPT'],
      key: 'DEPT',
      width: 180,
      render: (val: any) => renderDetailCell(val),
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
