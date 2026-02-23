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
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
        {/* Background Layer with Blur */}
        <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: 'url(/2.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(10px)',
            zIndex: 0,
            transform: 'scale(1.05)'
        }} />

        {/* CSS Injection for Glassmorphism */}
        <style>
            {`
            .apple-glass-card {
                background: rgba(255, 255, 255, 0.25) !important;
                box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2) !important;
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-radius: 24px !important;
                border: 1px solid rgba(255, 255, 255, 0.6) !important;
                border-top: 1px solid rgba(255, 255, 255, 0.9) !important;
                border-left: 1px solid rgba(255, 255, 255, 0.9) !important;
            }
            
            .glass-input.ant-input-affix-wrapper {
                background: rgba(255, 255, 255, 0.4) !important; /* Light color glass */
                border: 1px solid rgba(255, 255, 255, 0.6) !important;
                border-radius: 12px !important;
                backdrop-filter: blur(10px);
            }
            .glass-input input {
                background: transparent !important;
                color: #003a8c !important; /* Dark blue for contrast */
                font-weight: 500;
            }
            .glass-input input::placeholder {
                color: rgba(0, 58, 140, 0.5) !important;
            }
            .glass-input .anticon {
                color: rgba(0, 58, 140, 0.7) !important;
            }
            
            .glass-btn.ant-btn {
                background: rgba(255, 255, 255, 0.3) !important;
                border: 1px solid rgba(255, 255, 255, 0.6) !important;
                color: #003a8c !important;
                font-weight: bold;
                height: 48px;
                border-radius: 12px !important;
                backdrop-filter: blur(4px);
                box-shadow: 0 4px 12px rgba(0, 58, 140, 0.1);
            }
            .glass-btn.ant-btn:hover {
                background: rgba(255, 255, 255, 0.5) !important;
                border-color: #fff !important;
                color: #002c6b !important;
            }
            `}
        </style>

        {/* Content Layer */}
        <div style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
        }}>
            <Card className="apple-glass-card" bordered={false} style={{ width: 400 }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <Title level={3} style={{ color: '#003a8c', marginBottom: 0, textShadow: '0 1px 2px rgba(255,255,255,0.5)' }}>蜂之翼业务系统</Title>
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
                        <Input prefix={<UserOutlined />} placeholder="用户名" className="glass-input" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: '请输入密码!' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="密码" className="glass-input" />
                    </Form.Item>

                    <Form.Item style={{ marginTop: 32 }}>
                        <Button type="primary" htmlType="submit" block loading={loading} className="glass-btn">
                            登 录
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    </div>
  );
};

export default Login;
