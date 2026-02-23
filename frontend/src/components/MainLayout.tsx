import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, Typography, theme } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  UserOutlined,
  LogoutOutlined,
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
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenu = {
    items: [
      {
        key: 'profile',
        label: '个人信息',
        icon: <UserOutlined />,
      },
      {
        key: 'logout',
        label: '退出登录',
        icon: <LogoutOutlined />,
        onClick: handleLogout,
      },
    ],
  };

  const menuItems = [
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
        <div style={{ height: 32, margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo.png" alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
        </div>
        <Menu
          theme="dark"
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
    </Layout>
  );
};

export default MainLayout;
