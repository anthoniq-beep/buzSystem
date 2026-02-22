import { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Card, Modal, Form, Input, Select, App, Tooltip, Popover, InputNumber } from 'antd';
import { PlusOutlined, UserOutlined, ClockCircleOutlined, MessageOutlined, UserAddOutlined, PhoneOutlined, TeamOutlined, FileDoneOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Customer } from '../types';
import { SaleStage } from '../types';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const CustomerList = () => {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [actionStage, setActionStage] = useState<SaleStage | null>(null);
  
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [logForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [customerRes, channelRes, userRes] = await Promise.all([
        api.get('/customer'),
        api.get('/channel'),
        api.get('/users/assignable')
      ]);
      setCustomers(customerRes.data);
      setChannels(channelRes.data);
      setUsers(userRes.data);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (values: any) => {
    try {
      await api.post('/customer', values);
      message.success('线索创建成功');
      setIsModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error('创建失败');
    }
  };

  const handleStageClick = (customer: Customer, stage: SaleStage) => {
      // Check if trying to edit DEAL
      const hasDeal = customer.saleLogs?.some(l => l.stage === SaleStage.DEAL);
      if (stage === SaleStage.DEAL && hasDeal) {
          message.warning('该客户已签约，无法再次修改');
          return;
      }

      setSelectedCustomer(customer);
      setActionStage(stage);
      logForm.resetFields();
      logForm.setFieldsValue({ stage }); // Pre-fill stage
      setIsLogModalOpen(true);
  };

  const handleSubmitLog = async (values: any) => {
      if (!selectedCustomer) return;
      try {
          await api.post(`/customer/${selectedCustomer.id}/log`, {
              stage: values.stage,
              note: values.note,
              contractAmount: values.contractAmount,
              isEffective: true
          });
          message.success('跟进记录添加成功');
          setIsLogModalOpen(false);
          logForm.resetFields();
          fetchData();
      } catch (error: any) {
          message.error(error.response?.data?.message || '添加失败');
      }
  };

  const renderProcess = (customer: Customer) => {
      // Only owner can operate? Or maybe managers too? For now, stick to owner.
      const isOwner = customer.ownerId === user?.id;
      if (!isOwner) return <span style={{ color: '#ccc' }}>仅负责人可见</span>;

      const logs = customer.saleLogs || [];
      const hasChance = logs.some(l => l.stage === SaleStage.CHANCE);
      const hasCall = logs.some(l => l.stage === SaleStage.CALL);
      const hasTouch = logs.some(l => l.stage === SaleStage.TOUCH);
      const hasDeal = logs.some(l => l.stage === SaleStage.DEAL);

      return (
          <Space>
              <Tooltip title="客资 (CHANCE)">
                  <Button 
                      type={hasChance ? 'primary' : 'default'} 
                      shape="circle" 
                      icon={<UserAddOutlined />} 
                      size="small"
                      onClick={() => handleStageClick(customer, SaleStage.CHANCE)}
                  />
              </Tooltip>
              <Tooltip title="约访 (CALL)">
                   <Button 
                      type={hasCall ? 'primary' : 'default'} 
                      shape="circle" 
                      icon={<PhoneOutlined />} 
                      size="small"
                      onClick={() => handleStageClick(customer, SaleStage.CALL)}
                  />
              </Tooltip>
              <Tooltip title="接待 (TOUCH)">
                   <Button 
                      type={hasTouch ? 'primary' : 'default'} 
                      shape="circle" 
                      icon={<TeamOutlined />} 
                      size="small"
                      onClick={() => handleStageClick(customer, SaleStage.TOUCH)}
                  />
              </Tooltip>
              <Tooltip title={hasDeal ? "已签约 (DEAL)" : "签约 (DEAL)"}>
                   <Button 
                      type={hasDeal ? 'primary' : 'default'} 
                      shape="circle" 
                      icon={<FileDoneOutlined />} 
                      size="small"
                      style={hasDeal ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : {}}
                      onClick={() => handleStageClick(customer, SaleStage.DEAL)}
                  />
              </Tooltip>
          </Space>
      );
  };

  const columns = [
    {
      title: '客户名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (text: string, record: Customer) => (
        <a onClick={() => navigate(`/customer/${record.id}`)} style={{ fontWeight: 500 }}>{text}</a>
      ),
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
    },
    {
      title: '渠道来源',
      dataIndex: ['source', 'name'],
      key: 'source',
      width: 100,
    },
    {
      title: '负责人',
      dataIndex: ['owner', 'name'],
      key: 'owner',
      width: 100,
      render: (text: string) => <Space><UserOutlined /> {text}</Space>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <Tag color="blue">{status}</Tag>
    },
    {
      title: '最后跟进',
      key: 'lastContact',
      width: 180,
      render: (_: any, record: any) => {
          const lastLog = record.saleLogs && record.saleLogs[0];
          if (!lastLog) return <span style={{ color: '#ccc' }}>无记录</span>;
          
          return (
              <Space direction="vertical" size={0}>
                  <Space>
                      <ClockCircleOutlined style={{ fontSize: 12 }} /> 
                      {dayjs(lastLog.occurredAt).format('MM-DD HH:mm')}
                  </Space>
                  <Space>
                      <Tag variant="filled">{lastLog.stage}</Tag>
                      {lastLog.note && (
                          <Popover content={lastLog.note} title="跟进记录" trigger="hover">
                              <MessageOutlined style={{ color: '#1677ff', cursor: 'pointer' }} />
                          </Popover>
                      )}
                  </Space>
              </Space>
          );
      }
    },
    {
        title: '销售流程',
        key: 'process',
        render: (_: any, record: Customer) => renderProcess(record)
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>客户管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          录入线索
        </Button>
      </div>
      
      <Card variant="borderless" styles={{ body: { padding: 0 } }}>
        <Table 
            columns={columns} 
            dataSource={customers} 
            rowKey="id" 
            loading={loading}
            pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal title="录入新线索" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="客户姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="联系电话" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sourceId" label="渠道来源" rules={[{ required: true }]}>
             <Select>
                 {channels.filter(c => c.isActive).map(c => (
                     <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                 ))}
             </Select>
          </Form.Item>
          <Form.Item name="ownerId" label="负责人">
             <Select allowClear placeholder="默认为自己">
                 {users.map(u => (
                     <Select.Option key={u.id} value={u.id}>{u.name}</Select.Option>
                 ))}
             </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal 
        title="添加跟进记录" 
        open={isLogModalOpen} 
        onCancel={() => setIsLogModalOpen(false)} 
        onOk={() => logForm.submit()}
      >
          <Form form={logForm} layout="vertical" onFinish={handleSubmitLog}>
              <Form.Item name="stage" label="跟进阶段" rules={[{ required: true }]}>
                  <Select onChange={(val) => setActionStage(val)} disabled={true}> 
                      <Select.Option value={SaleStage.CHANCE}>客资 (CHANCE)</Select.Option>
                      <Select.Option value={SaleStage.CALL}>约访 (CALL)</Select.Option>
                      <Select.Option value={SaleStage.TOUCH}>接待 (TOUCH)</Select.Option>
                      <Select.Option value={SaleStage.DEAL}>签约 (DEAL)</Select.Option>
                  </Select>
              </Form.Item>
              
              {actionStage === SaleStage.DEAL && (
                  <Form.Item name="contractAmount" label="合同金额" rules={[{ required: true }]}>
                      <InputNumber style={{ width: '100%' }} prefix="¥" />
                  </Form.Item>
              )}

              <Form.Item name="note" label="跟进情况" rules={[{ required: true }]}>
                  <Input.TextArea rows={4} placeholder="请输入详细的跟进情况..." />
              </Form.Item>
          </Form>
      </Modal>
    </div>
  );
};

export default CustomerList;
