import { useState, useEffect } from 'react';
import { Badge, Layout, List, Menu, Avatar, Dropdown, Space, Typography, theme, Modal, Form, Input, App, Switch, Button } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  UserOutlined,
  LogoutOutlined,
  LockOutlined,
  DashboardOutlined,
  TeamOutlined,
  DollarOutlined,
  SettingOutlined,
  ApartmentOutlined,
  AimOutlined,
  CreditCardOutlined,
  ShareAltOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FileTextOutlined,
  RocketOutlined,
  SunOutlined,
  MoonOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Role } from '../types';
import api from '../services/api';
import type { Announcement, InternalMail } from '../types';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { message } = App.useApp();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm] = Form.useForm();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMails, setUnreadMails] = useState<InternalMail[]>([]);
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [mailModalShown, setMailModalShown] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const [announcementShown, setAnnouncementShown] = useState(false);

  useEffect(() => {
    // Redirect Training Dept users from dashboard/root to training page
    if (user?.department?.name === '教培部' && (location.pathname === '/' || location.pathname === '/dashboard')) {
        navigate('/training');
    }
  }, [user, location.pathname, navigate]);

  const fetchMailReminder = async (forceShow: boolean) => {
    if (!user) return;
    try {
      const [countRes, listRes] = await Promise.all([
        api.get('/mails/unread-count'),
        api.get('/mails/unread', { params: { limit: 5 } }),
      ]);
      const count = countRes.data?.count ?? 0;
      setUnreadCount(count);
      const list = listRes.data || [];
      setUnreadMails(list);
      if ((forceShow || !mailModalShown) && count > 0) {
        setIsMailModalOpen(true);
        setMailModalShown(true);
      }
    } catch {
      setUnreadCount(0);
      setUnreadMails([]);
    }
  };

  useEffect(() => {
    if (!user) return;
    setMailModalShown(false);
    fetchMailReminder(true);
  }, [user?.id]);

  const fetchAnnouncement = async (forceShow: boolean) => {
    if (!user) return;
    try {
      const res = await api.get('/announcements/latest');
      const a = res.data as Announcement | null;
      setAnnouncement(a);
      if (!a) return;
      if ((forceShow || !announcementShown) && !a.seen) {
        setIsAnnouncementOpen(true);
        setAnnouncementShown(true);
      }
    } catch {
      setAnnouncement(null);
    }
  };

  const markAnnouncementSeen = async () => {
    if (!announcement?.id) return;
    try {
      await api.post(`/announcements/${announcement.id}/seen`);
      setAnnouncement(prev => (prev ? { ...prev, seen: true } : prev));
    } catch {}
  };

  useEffect(() => {
    if (!user) return;
    setAnnouncementShown(false);
    fetchAnnouncement(true);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    fetchMailReminder(false);
    fetchAnnouncement(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePasswordChange = async (values: any) => {
    try {
      await api.post('/auth/change-password', values);
      message.success('密码修改成功，请重新登录');
      setIsPasswordModalOpen(false);
      logout();
      navigate('/login');
    } catch (error: any) {
      message.error(error.response?.data?.message || '密码修改失败');
    }
  };

  const userMenu = {
    items: [
      {
        key: 'profile',
        label: '个人信息',
        icon: <UserOutlined />,
      },
      {
        key: 'password',
        label: '修改密码',
        icon: <LockOutlined />,
        onClick: () => setIsPasswordModalOpen(true),
      },
      {
        key: 'logout',
        label: '退出登录',
        icon: <LogoutOutlined />,
        onClick: handleLogout,
      },
    ],
  };

  const isTrainingDept = user?.department?.name === '教培部';

  const menuItems = isTrainingDept ? [
    {
      key: '/training',
      icon: <RocketOutlined />,
      label: '教培管理',
    },
    {
      key: '/mail',
      icon: <MailOutlined />,
      label: (
        <Space>
          <span>内部邮件</span>
          <Badge count={unreadCount} size="small" />
        </Space>
      ),
    },
    {
      key: '/admin/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    }
  ] : [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/mail',
      icon: <MailOutlined />,
      label: (
        <Space>
          <span>内部邮件</span>
          <Badge count={unreadCount} size="small" />
        </Space>
      ),
    },
    {
      key: '/customers',
      icon: <TeamOutlined />,
      label: '客户管理',
    },
    {
      key: '/commission',
      icon: <DollarOutlined />,
      label: '佣金查询',
    },
    {
      key: '/contract',
      icon: <FileTextOutlined />,
      label: '合同签约',
    },
    {
      key: '/training',
      icon: <RocketOutlined />,
      label: '教培管理',
    },
    // Admin routes
    ...(user?.role === Role.ADMIN || user?.role === Role.MANAGER || user?.role === Role.SUPERVISOR ? [{
      key: '/admin/dashboard',
      icon: <DashboardOutlined />,
      label: '管理仪表盘',
    }] : []),
    ...(user?.role === Role.ADMIN || user?.role === Role.HR ? [{
      key: '/admin/organization',
      icon: <ApartmentOutlined />,
      label: '组织架构',
    }] : []),
    ...(user?.role === Role.ADMIN ? [{
      key: '/admin/targets',
      icon: <AimOutlined />,
      label: '销售目标',
    }] : []),
    ...(user?.role === Role.ADMIN || user?.role === Role.MANAGER ? [{
      key: '/admin/channel',
      icon: <ShareAltOutlined />,
      label: '渠道管理',
    }] : []),
    ...(user?.role === Role.ADMIN || user?.role === Role.FINANCE ? [{
      key: '/admin/payment',
      icon: <CreditCardOutlined />,
      label: '支付审批',
    }] : []),
    ...(user?.role === Role.ADMIN ? [{
      key: '/admin/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    }] : []),
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img
              src="/logo.png"
              alt="Logo"
              style={{
                height: collapsed ? 28 : 34,
                width: 'auto',
                maxWidth: '80%',
                objectFit: 'contain',
              }}
            />
        </div>
        <Menu
          theme={isDarkMode ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            {collapsed ? <MenuUnfoldOutlined onClick={() => setCollapsed(!collapsed)} /> : <MenuFoldOutlined onClick={() => setCollapsed(!collapsed)} />}
            <Typography.Title level={4} style={{ margin: 0 }}>BuzSystem</Typography.Title>
          </Space>
          <Space>
            <Switch
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              checked={isDarkMode}
              onChange={toggleTheme}
            />
            <Text>{user?.name || user?.username}</Text>
            <Dropdown menu={userMenu} placement="bottomRight">
              <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      <Modal
        title={`你有 ${unreadCount} 封未读邮件`}
        open={isMailModalOpen}
        onCancel={() => setIsMailModalOpen(false)}
        footer={[
          <Button key="later" onClick={() => setIsMailModalOpen(false)}>
            稍后
          </Button>,
          <Button
            key="view"
            type="primary"
            onClick={() => {
              setIsMailModalOpen(false);
              navigate('/mail');
            }}
          >
            去查看
          </Button>,
        ]}
        width={640}
      >
        <List
          dataSource={unreadMails}
          renderItem={(item) => (
            <List.Item>
              <Space direction="vertical" size={0}>
                <Text strong>{item.title}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  来自：{item.sender?.name || item.sender?.username || `#${item.senderId}`} · {new Date(item.createdAt).toLocaleString()}
                </Text>
              </Space>
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        title={announcement?.title || '通告'}
        open={isAnnouncementOpen}
        onCancel={() => setIsAnnouncementOpen(false)}
        footer={[
          <Button
            key="ok"
            type="primary"
            onClick={async () => {
              await markAnnouncementSeen();
              setIsAnnouncementOpen(false);
            }}
          >
            我知道了
          </Button>,
        ]}
        width={760}
      >
        {announcement?.mediaUrl ? (
          <div style={{ width: '100%' }}>
            <img
              src={announcement.mediaUrl}
              alt={announcement.title}
              style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 12 }}
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        title="修改密码"
        open={isPasswordModalOpen}
        onCancel={() => setIsPasswordModalOpen(false)}
        onOk={() => passwordForm.submit()}
      >
        <Form form={passwordForm} layout="vertical" onFinish={handlePasswordChange}>
          <Form.Item name="oldPassword" label="原密码" rules={[{ required: true, message: '请输入原密码' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default MainLayout;
