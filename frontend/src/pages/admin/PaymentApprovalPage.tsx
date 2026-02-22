import { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, App, Space } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';

const PaymentApprovalPage = () => {
  const { message } = App.useApp();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/payment');
      // Filter for pending payments usually, but let's show all for history
      // Or just filter pending for approval actions
      setPayments(response.data);
    } catch (error) {
      message.error('获取回款数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.patch(`/payment/${id}/approve`);
      message.success('审核通过');
      fetchPayments();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    {
      title: '客户',
      dataIndex: ['contract', 'customer', 'name'],
      key: 'customer',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => `¥${Number(val).toLocaleString()}`,
    },
    {
      title: '录入人',
      dataIndex: ['recorder', 'name'],
      key: 'recorder',
    },
    {
      title: '录入时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '状态',
      dataIndex: 'isApproved',
      key: 'isApproved',
      render: (approved: boolean) => (
        <Tag color={approved ? 'green' : 'orange'}>
          {approved ? '已审核' : '待审核'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        !record.isApproved && (
          <Button 
            type="primary" 
            size="small" 
            icon={<CheckOutlined />} 
            onClick={() => handleApprove(record.id)}
          >
            通过
          </Button>
        )
      )
    }
  ];

  return (
    <Card title="财务审批" variant="borderless">
      <Table 
        columns={columns} 
        dataSource={payments} 
        rowKey="id" 
        loading={loading} 
      />
    </Card>
  );
};

export default PaymentApprovalPage;
