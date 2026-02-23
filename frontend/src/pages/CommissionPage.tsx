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
      const response = await api.get('/commission');
      setData(response.data);
    } catch (error) {
      message.error('获取提成数据失败');
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    // Basic date filtering based on createdAt (simplified)
    if (!selectedQuarter) {
      setFilteredData(data);
      return;
    }
    setFilteredData(data.filter((item: any) => {
        return dayjs(item.createdAt).isSame(selectedQuarter, 'quarter');
    }));
  };

  const handleEdit = (record: any) => {
      setEditingRecord(record);
      form.setFieldsValue({
          commission: record.commission,
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
          {/* Role not populated in include, assume handled by backend or add include */}
        </div>
      )
    },
    {
      title: '客户',
      dataIndex: ['customer', 'name'],
      key: 'customer',
    },
    {
      title: '签约金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => `¥${Number(val).toLocaleString()}`,
    },
    {
      title: '提成金额',
      dataIndex: 'commission',
      key: 'commission',
      render: (val: number) => <span style={{ color: '#cf1322', fontWeight: 'bold' }}>¥{Number(val).toLocaleString()}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
          if (status === 'APPROVED') return <Tag color="green">已审核</Tag>;
          if (status === 'PAID') return <Tag color="blue">已发放</Tag>;
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
                    {record.status === 'PENDING' && (
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

  const totalCommission = filteredData.reduce((sum, item) => sum + Number(item.commission || 0), 0);

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
            columns={columns} 
            dataSource={filteredData} 
            rowKey="id" 
            loading={loading}
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
