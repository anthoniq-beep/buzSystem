import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Card, Typography, Timeline, Tag, Button, Modal, Form, Input, Select, App, Descriptions, Avatar, Space } from 'antd';
import { UserOutlined, PhoneOutlined, ClockCircleOutlined, CheckCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import api from '../services/api';
import type { Customer } from '../types';
import { SaleStage } from '../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CustomerDetail = () => {
  const { message } = App.useApp();
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionStage, setActionStage] = useState<SaleStage | null>(null);
  const [form] = Form.useForm();

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/customer/${id}`);
      setCustomer(response.data);
    } catch (error) {
      message.error('获取详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCustomer();
  }, [id]);

  const handleAction = (stage: SaleStage) => {
    setActionStage(stage);
    setIsModalOpen(true);
  };

  const handleSubmitLog = async (values: any) => {
    try {
      await api.post(`/customer/${id}/log`, {
        stage: actionStage,
        note: values.note,
        isEffective: true, // Default true for now
      });
      message.success('记录添加成功');
      setIsModalOpen(false);
      form.resetFields();
      fetchCustomer(); // Refresh
    } catch (error) {
      message.error('添加失败');
    }
  };

  if (!customer) return null;

  const getTimelineIcon = (stage: string) => {
    switch (stage) {
      case 'CHANCE': return <UserOutlined />;
      case 'CALL': return <PhoneOutlined />;
      case 'TOUCH': return <EnvironmentOutlined />;
      case 'DEAL': return <CheckCircleOutlined />;
      default: return <ClockCircleOutlined />;
    }
  };

  const getTimelineColor = (stage: string) => {
    switch (stage) {
      case 'CHANCE': return 'blue';
      case 'CALL': return 'cyan';
      case 'TOUCH': return 'purple';
      case 'DEAL': return 'green';
      default: return 'gray';
    }
  };

  const timelineItems = customer.saleLogs?.map(log => ({
    color: getTimelineColor(log.stage),
    dot: getTimelineIcon(log.stage),
    children: (
        <Card size="small" variant="borderless" style={{ background: '#f9f9f9', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text strong>{log.stage}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(log.occurredAt).format('YYYY-MM-DD HH:mm')}
                </Text>
            </div>
            <div style={{ marginBottom: 8 }}>{log.note}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size="small" style={{ backgroundColor: '#87d068' }}>{log.actor.name[0]}</Avatar>
                <Text type="secondary" style={{ fontSize: 12 }}>{log.actor.name} - {log.actor.role}</Text>
            </div>
        </Card>
    )
  }));

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 24px' }}>
      <Row gutter={24}>
        {/* Left: Info */}
        <Col span={6}>
          <Card variant="borderless" style={{ marginBottom: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Avatar size={64} style={{ backgroundColor: '#1677ff' }}>{customer.name[0]}</Avatar>
              <Title level={3} style={{ marginTop: 16, marginBottom: 8 }}>{customer.name}</Title>
              <Tag color="blue">{customer.status}</Tag>
            </div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="电话">{customer.phone}</Descriptions.Item>
              <Descriptions.Item label="公司">{customer.companyName || '-'}</Descriptions.Item>
              <Descriptions.Item label="负责人">{customer.owner.name}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{dayjs(customer.createdAt).format('YYYY-MM-DD')}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Right: Timeline & Actions */}
        <Col span={18}>
          <Card title="跟进记录" variant="borderless" extra={
            <Space>
               <Button onClick={() => handleAction(SaleStage.CALL)}>记录通话</Button>
               <Button onClick={() => handleAction(SaleStage.TOUCH)}>记录接待</Button>
               <Button type="primary" onClick={() => handleAction(SaleStage.DEAL)}>成交签约</Button>
            </Space>
          }>
            <div style={{ padding: '0 16px' }}>
                <Timeline
                    items={timelineItems}
                />
            </div>
          </Card>
        </Col>
      </Row>

      <Modal 
        title={`添加记录 - ${actionStage}`} 
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleSubmitLog} layout="vertical">
            <Form.Item name="note" label="跟进内容" rules={[{ required: true }]}>
                <TextArea rows={4} placeholder="请输入详细的跟进情况..." />
            </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// Helper for Space
// import { Space } from 'antd'; // Removed as added to top import

export default CustomerDetail;
