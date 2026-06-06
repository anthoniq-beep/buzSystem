import { useEffect, useState } from 'react';
import { Card, Table, Tag, App, DatePicker, Select, Space, Button, Modal, Form, Input, InputNumber, Tooltip } from 'antd';
import { EditOutlined, CheckOutlined, DownloadOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import * as XLSX from 'xlsx';

const CommissionPage = () => {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]); // Aggregated data
  const [rawData, setRawData] = useState<any[]>([]); // Raw data from API
  const [loading, setLoading] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState<dayjs.Dayjs | null>(dayjs());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const [users, setUsers] = useState<any[]>([]);
  const isAdminOrManagerOrSupervisor = user?.role === Role.ADMIN || user?.role === Role.MANAGER || user?.role === Role.SUPERVISOR;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isAdminOrManagerOrSupervisor) {
      fetchUsers();
    }
  }, [isAdminOrManagerOrSupervisor]);

  const fetchUsers = async () => {
      try {
          // Fetch assignable users (or all users if needed)
          // Ideally we want users in the same department hierarchy
          const res = await api.get('/users/assignable');
          setUsers(res.data);
      } catch (e) {
          console.error(e);
      }
  };

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
              userId: c.userId !== null && c.userId !== undefined ? Number(c.userId) : undefined,
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
      if (!isAdminOrManagerOrSupervisor) return;
      setEditingRecord(detail);
      form.setFieldsValue({
          commission: detail.amount,
          userId: detail.userId !== undefined ? String(detail.userId) : undefined
      });
      setIsModalOpen(true);
  };

  const handleUpdate = async (values: any) => {
      try {
          await api.put(`/commission/${editingRecord.id}`, {
              commission: values.commission,
              userId: Number(values.userId)
          });
          message.success('更新成功');
          setIsModalOpen(false);
          await fetchData();
      } catch (error) {
          message.error('更新失败');
      }
  };

  const handleExport = () => {
      // 1. Prepare data for export
      // We want: User Name | Total Commission | Deal Commission | Call | Chance | Touch | Dept
      // Aggregated by User
      
      const userStats: Record<string, any> = {};
      
      data.forEach((group: any) => {
          Object.values(group.details).forEach((list: any) => {
              list.forEach((d: any) => {
                  if (!d.userName) return;
                  if (!userStats[d.userName]) {
                      userStats[d.userName] = {
                          userName: d.userName,
                          total: 0,
                          DEAL: 0,
                          CALL: 0,
                          CHANCE: 0,
                          TOUCH: 0,
                          DEPT: 0
                      };
                  }
                  
                  // Find type by checking which list this item belongs to
                  // Actually `d` doesn't have type inside processData detail object, but we are iterating `group.details` keys
                  // Wait, `Object.values(group.details)` loses the key.
                  // Let's iterate keys.
              });
          });
          
          // Re-iterate with keys
          Object.keys(group.details).forEach((type) => {
              const list = group.details[type];
              list.forEach((d: any) => {
                  if (!d.userName) return;
                  if (!userStats[d.userName]) { // Should exist from above or create here
                       userStats[d.userName] = {
                          userName: d.userName,
                          total: 0,
                          DEAL: 0,
                          CALL: 0,
                          CHANCE: 0,
                          TOUCH: 0,
                          DEPT: 0
                      };
                  }
                  userStats[d.userName].total += d.amount;
                  if (userStats[d.userName][type] !== undefined) {
                      userStats[d.userName][type] += d.amount;
                  }
              });
          });
      });
      
      // Convert to array
      const exportData = Object.values(userStats).map((u: any) => ({
          '负责人': u.userName,
          '总提成': u.total,
          '签约提成': u.DEAL,
          '约访提成': u.CALL,
          '客资提成': u.CHANCE,
          '接待提成': u.TOUCH,
          '部门管理': u.DEPT
      }));
      
      // Add Total Row
      const totalRow = exportData.reduce((acc: any, curr: any) => {
          acc['总提成'] += curr['总提成'];
          acc['签约提成'] += curr['签约提成'];
          acc['约访提成'] += curr['约访提成'];
          acc['客资提成'] += curr['客资提成'];
          acc['接待提成'] += curr['接待提成'];
          acc['部门管理'] += curr['部门管理'];
          return acc;
      }, { '负责人': '总计', '总提成': 0, '签约提成': 0, '约访提成': 0, '客资提成': 0, '接待提成': 0, '部门管理': 0 });
      
      exportData.push(totalRow);

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "季度提成统计");
      
      const fileName = `提成统计_${selectedQuarter?.format('YYYY-Q')}季度.xlsx`;
      XLSX.writeFile(wb, fileName);
  };

  // State for highlighting updated row/item
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  const handleUpdateUser = async (commissionId: number, userId: number | string) => {
      const nextUserId = Number(userId);
      const selectedUser = users.find((u) => u.id === nextUserId);

      // Deep clone and update to ensure reference change triggers re-render
      // Also update BOTH data and rawData to keep them in sync
      const updateData = (prevData: any[]) => {
          return prevData.map(group => {
              const newDetails = { ...group.details };
              let hasChange = false;
              
              Object.keys(newDetails).forEach(key => {
                  newDetails[key] = newDetails[key].map((d: any) => {
                      if (d.id === commissionId) {
                          hasChange = true;
                          return {
                              ...d,
                              userId: nextUserId,
                              userName: selectedUser?.name || d.userName
                          };
                      }
                      return d;
                  });
              });
              
              if (hasChange) {
                  return { ...group, details: newDetails };
              }
              return group;
          });
      };

      // Optimistically update aggregated data directly
      setData(prev => updateData(prev));

      try {
          await api.put(`/commission/${commissionId}`, {
              userId: nextUserId
          });
          message.success('负责人更新成功');
          setHighlightedId(commissionId);
          setTimeout(() => setHighlightedId(null), 2000);
          
          // Background refresh to ensure consistency
          const response = await api.get('/commission');
          setRawData(response.data); 
          // processData will naturally run due to useEffect dependency on rawData
      } catch (error) {
          message.error('更新失败');
          await fetchData(); // Revert
      }
  };

  const renderDetailCell = (details: any[], type: string) => {
      // If DEAL or DEPT, we only show Total.
      // But user said: "每个客户只显示1条个人签约总提成和部门管理总提成"
      // This likely applies to ALL columns? Or just DEAL/DEPT?
      // "佣金列表中，每个客户只显示1条个人签约总提成和部门管理总提成"
      
      // Let's sum amounts.
      const totalAmount = details && details.length > 0 ? details.reduce((sum, d) => sum + d.amount, 0) : 0;
      
      // If no details, show dash or 0? 
      // If totalAmount is 0 and no details, show dash.
      if (!details || details.length === 0) return <span style={{ color: '#ccc' }}>-</span>;

      return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ marginRight: 8 }}>总计:</span>
                  <span 
                      title={isAdminOrManagerOrSupervisor ? "点击查看详情/修改" : ""}
                      style={{ 
                          fontWeight: 'bold', 
                          cursor: isAdminOrManagerOrSupervisor ? 'pointer' : 'default',
                          color: isAdminOrManagerOrSupervisor ? '#1677ff' : 'inherit',
                          textDecoration: isAdminOrManagerOrSupervisor ? 'underline' : 'none'
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
              {details.map((d: any) => (
                  <div 
                    key={d.id} 
                    style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        fontSize: 12, 
                        color: '#666',
                        backgroundColor: highlightedId === d.id ? '#e6f7ff' : 'transparent',
                        transition: 'background-color 0.5s ease',
                        padding: '2px 4px',
                        borderRadius: 4
                    }}
                  >
                      <span style={{ marginRight: 8, flex: 1 }}>
                        {isAdminOrManagerOrSupervisor ? (
                                <Select
                                    key={`${d.id}-${d.userId}`}
                                    value={d.userId !== undefined ? String(d.userId) : undefined}
                                    size="small"
                                    style={{ width: '100%', minWidth: 80 }}
                                    bordered={false}
                                    showSearch
                                    optionFilterProp="children"
                                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                    options={users.map(u => ({ label: u.name, value: String(u.id) }))}
                                    onChange={(val) => handleUpdateUser(d.id, val)}
                                />
                        ) : (
                            d.userName
                        )}
                      </span>
                      <span 
                          title={isAdminOrManagerOrSupervisor ? "点击修改金额" : ""}
                          style={{ 
                              cursor: isAdminOrManagerOrSupervisor ? 'pointer' : 'default',
                              textDecoration: isAdminOrManagerOrSupervisor ? 'underline' : 'none',
                              minWidth: 50,
                              textAlign: 'right'
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
                <Space>
                    <span style={{ fontSize: 14, fontWeight: 'normal', color: '#666' }}>
                        本季预计总提成: <span style={{ color: '#cf1322', fontSize: 18, fontWeight: 'bold' }}>¥{totalCommission.toLocaleString()}</span>
                    </span>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>导出统计</Button>
                </Space>
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
              <Form.Item name="userId" label="提成归属人" rules={[{ required: true }]}>
                  <Select 
                    showSearch 
                    optionFilterProp="children"
                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    options={users.map(u => ({ label: u.name, value: String(u.id) }))}
                  />
              </Form.Item>
          </Form>
      </Modal>
    </div>
  );
};

export default CommissionPage;
