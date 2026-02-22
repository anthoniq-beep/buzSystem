import { useEffect, useState } from 'react';
import { Card, Table, Tag, App, DatePicker, Select, Space, Button, Modal, Form, Input, InputNumber } from 'antd';
import { EditOutlined, CheckOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

const CommissionPage = () => {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState<dayjs.Dayjs | null>(dayjs());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const isAdminOrManager = user?.role === Role.ADMIN || user?.role === Role.MANAGER;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
  }, [data, selectedQuarter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/commission/estimates');
      setData(response.data);
    } catch (error) {
      message.error('获取提成数据失败');
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    if (!selectedQuarter) {
      setFilteredData(data);
      return;
    }
    const q = Math.ceil((selectedQuarter.month() + 1) / 3);
    const quarterStr = `${selectedQuarter.year()}-Q${q}`;
    setFilteredData(data.filter((item: any) => item.quarter === quarterStr));
  };

  const handleEdit = (record: any) => {
      setEditingRecord(record);
      form.setFieldsValue({
          rate: record.rate, // Use rate instead of amount
          note: record.note
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

  const handleApprove = async (id: number) => {
      try {
          await api.patch(`/commission/${id}/approve`);
          message.success('审批通过');
          fetchData();
      } catch (error) {
          message.error('审批失败');
      }
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: ['user', 'name'],
      key: 'name',
      render: (text: string, record: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <Tag color="blue">{record.user.role}</Tag>
        </div>
      )
    },
    {
      title: '客户',
      dataIndex: ['payment', 'contract', 'customer', 'name'],
      key: 'customer',
    },
    {
      title: '提成阶段',
      dataIndex: 'stage',
      key: 'stage',
      render: (stage: string, record: any) => (
          <Space>
              <Tag>{stage}</Tag>
              {/* Show the actor who performed the action if it's different from the beneficiary */}
              {record.saleLog?.actor && record.saleLog.actorId !== record.userId && (
                  <span style={{ fontSize: 12, color: '#999' }}>
                      (操作人: {record.saleLog.actor.name})
                  </span>
              )}
          </Space>
      )
    },
    {
      title: '回款金额',
      dataIndex: 'baseAmount',
      key: 'baseAmount',
      render: (val: number) => `¥${Number(val).toLocaleString()}`,
    },
    {
      title: '提成比例',
      dataIndex: 'rate',
      key: 'rate',
      render: (val: number) => `${(Number(val) * 100).toFixed(2)}%`,
    },
    {
      title: '提成金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => <span style={{ color: '#cf1322', fontWeight: 'bold' }}>¥{Number(val).toLocaleString()}</span>,
    },
    // Requirement 3.2: Delete status? Or just show "Approved"?
    // Let's show "Status" but simplifying content.
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
          if (status === 'APPROVED') return <Tag color="green">已审核</Tag>;
          return <Tag color="orange">待审核</Tag>;
      }
    },
    {
        title: '生成时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
        title: '操作',
        key: 'action',
        render: (_: any, record: any) => {
            if (!isAdminOrManager) return null;
            return (
                <Space>
                    <Button 
                        type="link" 
                        icon={<EditOutlined />} 
                        onClick={() => handleEdit(record)}
                    >
                        编辑
                    </Button>
                    {record.status !== 'APPROVED' && (
                        <Button 
                            type="link" 
                            style={{ color: '#52c41a' }}
                            icon={<CheckOutlined />} 
                            onClick={() => handleApprove(record.id)}
                        >
                            通过
                        </Button>
                    )}
                </Space>
            );
        }
    }
  ];

  const totalCommission = filteredData.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <div>
      <Card 
        title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>提成测算</span>
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
            columns={columns} 
            dataSource={filteredData} 
            rowKey="id" 
            loading={loading}
        />
      </Card>

      <Modal 
        title="编辑提成记录" 
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)} 
        onOk={() => form.submit()}
      >
          <Form form={form} layout="vertical" onFinish={handleUpdate}>
              <Form.Item name="rate" label="提成比例 (小数, 如 0.03 代表 3%)" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} step={0.01} precision={4} />
              </Form.Item>
              <Form.Item name="note" label="备注">
                  <Input.TextArea rows={3} />
              </Form.Item>
          </Form>
      </Modal>
    </div>
  );
};

export default CommissionPage;
