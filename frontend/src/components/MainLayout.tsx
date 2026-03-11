import { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, Typography, theme, Modal, Form, Input, App, Button } from 'antd';
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
  BulbOutlined,
  BulbFilled,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Role } from '../types';
import api from '../services/api';

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

  useEffect(() => {
    // Redirect Training Dept users from dashboard/root to training page
    if (user?.department?.name === '教培部' && (location.pathname === '/' || location.pathname === '/dashboard')) {
        navigate('/training');
    }
  }, [user, location.pathname, navigate]);

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
      <Sider trigger={null} collapsible collapsed={collapsed} width={240} style={{ 
          boxShadow: '2px 0 8px 0 rgba(29, 35, 41, 0.05)', 
          zIndex: 10,
          background: isDarkMode ? undefined : '#2C3E50' // Ensure dark sidebar in light mode
      }}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
        </div>
        <Menu
          theme="dark" // Always use dark theme for sidebar
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ 
              background: 'transparent',
              borderRight: 'none',
              padding: '16px 8px'
          }}
        />
      </Sider>
      <Layout>
        <Header style={{ 
            padding: '0 24px', 
            background: isDarkMode ? '#0A192F' : '#ffffff', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            boxShadow: isDarkMode ? 'none' : '0 1px 4px rgba(0,21,41,0.08)',
            zIndex: 9,
            height: 64
        }}>
          <Space>
            {collapsed ? <MenuUnfoldOutlined onClick={() => setCollapsed(!collapsed)} style={{ fontSize: 18 }} /> : <MenuFoldOutlined onClick={() => setCollapsed(!collapsed)} style={{ fontSize: 18 }} />}
            <Typography.Title level={4} style={{ margin: 0, fontWeight: 600 }}>BuzSystem</Typography.Title>
          </Space>
          <Space>
            <Button
              type="text"
              icon={isDarkMode ? <BulbOutlined /> : <BulbFilled />}
              onClick={toggleTheme}
              style={{ fontSize: '18px', color: isDarkMode ? '#fff' : '#64748B' }}
            />
            <Space style={{ cursor: 'pointer' }}>
                <Dropdown menu={userMenu} placement="bottomRight">
                    <Space>
                        <Avatar 
                            icon={<UserOutlined />} 
                            style={{ backgroundColor: isDarkMode ? '#1E3A5F' : '#E2E8F0', color: isDarkMode ? '#fff' : '#475569' }} 
                        />
                        <Text strong style={{ color: isDarkMode ? '#fff' : '#334155' }}>{user?.name || user?.username}</Text>
                    </Space>
                </Dropdown>
            </Space>
          </Space>
        </Header>
        <Content
          style={{
            margin: '24px',
            padding: 24,
            minHeight: 280,
            background: isDarkMode ? '#112240' : '#ffffff',
            borderRadius: 16,
            overflow: 'auto',
            boxShadow: isDarkMode ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.02), 0 2px 8px 0 rgba(0, 0, 0, 0.02)'
          }}
        >
          <Outlet />
        </Content>
      </Layout>

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
