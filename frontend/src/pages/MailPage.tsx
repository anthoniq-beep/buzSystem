import { useEffect, useMemo, useState } from 'react';
import { App, Badge, Button, Card, Checkbox, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { MailOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { InternalMail, User } from '../types';
import { Role } from '../types';

const { Text } = Typography;
const { TextArea } = Input;

const MailPage = () => {
  const { user } = useAuth();
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [mails, setMails] = useState<InternalMail[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeMail, setActiveMail] = useState<InternalMail | null>(null);

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeForm] = Form.useForm();
  const [users, setUsers] = useState<User[]>([]);
  const [isBroadcast, setIsBroadcast] = useState(false);

  const canSend = useMemo(() => {
    if (!user) return false;
    return user.role === Role.ADMIN || !!user.canSendMail;
  }, [user]);

  const fetchUnreadCount = async () => {
    const res = await api.get('/mails/unread-count');
    setUnreadCount(res.data?.count ?? 0);
  };

  const fetchMails = async () => {
    setLoading(true);
    try {
      const res = await api.get('/mails', { params: { includeRead: true } });
      setMails(res.data || []);
    } catch {
      message.error('获取邮件失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data || []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    fetchMails();
    if (canSend) fetchUsers();
  }, [canSend]);

  const markRead = async (mail: InternalMail) => {
    if (mail.readAt) return;
    try {
      await api.post(`/mails/${mail.id}/read`);
      setMails(prev => prev.map(m => (m.id === mail.id ? { ...m, readAt: new Date().toISOString() } : m)));
      fetchUnreadCount();
    } catch {}
  };

  const openDetail = async (mail: InternalMail) => {
    setActiveMail(mail);
    setIsDetailOpen(true);
    await markRead(mail);
  };

  const handleSend = async (values: any) => {
    try {
      if (isBroadcast) {
        const res = await api.post('/mails/broadcast', {
          title: values.title,
          content: values.content,
        });
        message.success(`已发送全员（${res.data?.created ?? 0}人）`);
      } else {
        await api.post('/mails', {
          recipientId: values.recipientId,
          title: values.title,
          content: values.content,
        });
        message.success('发送成功');
      }
      setIsComposeOpen(false);
      composeForm.resetFields();
      fetchUnreadCount();
    } catch (error: any) {
      message.error(error.response?.data?.message || '发送失败');
    }
  };

  const columns = [
    {
      title: '',
      dataIndex: 'readAt',
      key: 'read',
      width: 60,
      render: (readAt: string | null | undefined) =>
        readAt ? <Tag color="default">已读</Tag> : <Tag color="blue">未读</Tag>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (_: any, record: InternalMail) => (
        <Space direction="vertical" size={0}>
          <Text strong={!record.readAt}>{record.title}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            来自：{record.sender?.name || record.sender?.username || `#${record.senderId}`}
          </Text>
        </Space>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: InternalMail) => (
        <Button type="link" icon={<MailOutlined />} onClick={() => openDetail(record)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        variant="borderless"
        title={
          <Space>
            <span>内部通知邮件</span>
            <Badge count={unreadCount} />
          </Space>
        }
        extra={
          canSend ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                composeForm.resetFields();
                setIsBroadcast(false);
                setIsComposeOpen(true);
              }}
            >
              写邮件
            </Button>
          ) : null
        }
      >
        <Table
          rowKey="id"
          dataSource={mails}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={activeMail?.title || '邮件详情'}
        open={isDetailOpen}
        onCancel={() => {
          setIsDetailOpen(false);
          setActiveMail(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsDetailOpen(false);
              setActiveMail(null);
            }}
          >
            关闭
          </Button>,
        ]}
        width={720}
      >
        {activeMail ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space split={<span style={{ color: '#e5e7eb' }}>|</span>}>
              <Text type="secondary">来自：{activeMail.sender?.name || activeMail.sender?.username || `#${activeMail.senderId}`}</Text>
              <Text type="secondary">时间：{new Date(activeMail.createdAt).toLocaleString()}</Text>
              <Text type="secondary">状态：{activeMail.readAt ? '已读' : '未读'}</Text>
            </Space>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{activeMail.content}</div>
          </Space>
        ) : null}
      </Modal>

      <Modal
        title="写邮件"
        open={isComposeOpen}
        onCancel={() => {
          setIsComposeOpen(false);
          composeForm.resetFields();
          setIsBroadcast(false);
        }}
        onOk={() => composeForm.submit()}
        width={720}
      >
        <Form form={composeForm} layout="vertical" onFinish={handleSend}>
          <Form.Item>
            <Checkbox
              checked={isBroadcast}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsBroadcast(checked);
                if (checked) composeForm.setFieldsValue({ recipientId: undefined });
              }}
            >
              一键发送全员
            </Checkbox>
          </Form.Item>
          {!isBroadcast ? (
            <Form.Item name="recipientId" label="收件人" rules={[{ required: true, message: '请选择收件人' }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={users
                  .filter(u => u.id !== user?.id)
                  .map(u => ({
                    value: u.id,
                    label: `${u.name}（${u.role}）`,
                  }))}
              />
            </Form.Item>
          ) : null}
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input maxLength={60} />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
            <TextArea rows={6} maxLength={2000} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default MailPage;
