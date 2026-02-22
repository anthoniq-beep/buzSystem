import { useState } from 'react';
import { Form, Input, Button, Card, Typography, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Role, EmployeeStatus } from '../types';

const { Title } = Typography;

const Login = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // REST API for login
      const response = await api.post('/auth/login', {
        username: values.username,
        password: values.password
      });

      const { accessToken, user } = response.data;
      login(accessToken, user);
      message.success('登录成功');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Mock login for demo purposes if backend is not available
      if (import.meta.env.DEV) {
        const { username, password } = values;
        if (password === 'password123') {
           let role = null;
           if (username === 'admin') role = Role.ADMIN;
           else if (username === 'manager1') role = Role.MANAGER;
           else if (username === 'sales1') role = Role.EMPLOYEE; 
           
           if (role) {
             const mockUser = {
               id: 1,
               username,
               name: username.toUpperCase(),
               role,
               status: EmployeeStatus.REGULAR,
               phone: '13800000000',
               createdAt: new Date().toISOString(),
               updatedAt: new Date().toISOString(),
             };
             login('mock-token', mockUser as any);
             message.success('开发模式：模拟登录成功');
             navigate('/dashboard');
             return;
           }
        }
      }

      message.error(error.message || '登录失败，请检查用户名或密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ color: '#1677ff' }}>CRM 系统登录</Title>
        </div>
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名 (admin / manager1 / sales1)" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码 (password123)" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
          
          <div style={{ textAlign: 'center', color: '#888' }}>
             测试账号: admin / manager1 / sales1 <br/> 密码: password123
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
