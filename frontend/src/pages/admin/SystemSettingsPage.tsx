import { useEffect, useState } from 'react';
import { Card, Upload, Button, Form, Input, Select, App, Tabs, Space, Table, Switch, Checkbox, List, Tag } from 'antd';
import { UploadOutlined, DownloadOutlined, SaveOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { Role } from '../../types';
import { useAuth } from '../../context/AuthContext';

const SystemSettingsPage = () => {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [announcementForm] = Form.useForm();
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const fetchAnnouncements = async () => {
    if (user?.role !== Role.ADMIN) return;
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data || []);
    } catch {
      setAnnouncements([]);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [user?.role]);

  // Mock permission data (In real app, this should come from API)
  const [permissions, setPermissions] = useState([
      { role: Role.MANAGER, view: true, entry: true, import: true, channel: false },
      { role: Role.SUPERVISOR, view: true, entry: true, import: false, channel: false },
      { role: Role.EMPLOYEE, view: true, entry: true, import: false, channel: false },
      { role: Role.FINANCE, view: true, entry: false, import: false, channel: false },
      { role: Role.HR, view: true, entry: false, import: false, channel: false },
  ]);

  const handleUpload = async (info: any) => {
    const formData = new FormData();
    formData.append('file', info.file);
    formData.append('sourceId', '1'); // 默认来源 ID

    try {
      await api.post('/excel/import/customers', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      message.success('导入成功');
    } catch (error) {
      message.error('导入失败');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/excel/export/customers', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'customers.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      message.error('导出失败');
    }
  };

  const handleSingleAdd = async (values: any) => {
    try {
      await api.post('/customer', { ...values, sourceId: 1 });
      message.success('添加成功');
      form.resetFields();
    } catch (error) {
      message.error('添加失败');
    }
  };

  const handlePermissionChange = (role: string, field: string, checked: boolean) => {
      const newPermissions = permissions.map(p => {
          if (p.role === role) {
              return { ...p, [field]: checked };
          }
          return p;
      });
      setPermissions(newPermissions);
      message.success('设置已保存 (模拟)');
  };

  const permissionColumns = [
      { title: '角色', dataIndex: 'role', key: 'role' },
      { 
          title: '查看权限 (本级及下属)', 
          dataIndex: 'view', 
          key: 'view',
          render: (val: boolean, record: any) => (
              <Switch checked={val} onChange={(checked) => handlePermissionChange(record.role, 'view', checked)} />
          )
      },
      { 
          title: '客资录入', 
          dataIndex: 'entry', 
          key: 'entry',
          render: (val: boolean, record: any) => (
              <Switch checked={val} onChange={(checked) => handlePermissionChange(record.role, 'entry', checked)} />
          )
      },
      { 
          title: '客资导入', 
          dataIndex: 'import', 
          key: 'import',
          render: (val: boolean, record: any) => (
              <Switch checked={val} onChange={(checked) => handlePermissionChange(record.role, 'import', checked)} />
          )
      },
      { 
          title: '渠道管理', 
          dataIndex: 'channel', 
          key: 'channel',
          render: (val: boolean, record: any) => (
              <Switch checked={val} onChange={(checked) => handlePermissionChange(record.role, 'channel', checked)} />
          )
      },
  ];

  const items = [
    {
      key: '1',
      label: '权限设置',
      children: (
          <Card title="各岗位权限配置" size="small" bordered={false}>
              <Table 
                  dataSource={permissions} 
                  columns={permissionColumns} 
                  pagination={false} 
                  rowKey="role"
              />
          </Card>
      ),
    },
    {
      key: '2',
      label: '系统参数设置',
      children: <div>更多设置开发中...</div>,
    },
    ...(user?.role === Role.ADMIN ? [{
      key: '3',
      label: '通告管理',
      children: (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card title="发布通告" size="small" bordered={false}>
            <Form
              form={announcementForm}
              layout="vertical"
              onFinish={async (values) => {
                try {
                  await api.post('/announcements', {
                    title: values.title,
                    mediaUrl: values.mediaUrl,
                    isActive: true
                  });
                  message.success('通告已发布');
                  announcementForm.resetFields();
                  fetchAnnouncements();
                } catch (error: any) {
                  message.error(error.response?.data?.message || '发布失败');
                }
              }}
            >
              <Form.Item name="title" label="通告标题" rules={[{ required: true, message: '请输入标题' }]}>
                <Input maxLength={60} />
              </Form.Item>
              <Form.Item name="mediaUrl" label="图片/动图链接" rules={[{ required: true, message: '请输入图片或动图链接' }]}>
                <Input placeholder="https://..." />
              </Form.Item>
              <Button type="primary" htmlType="submit">发布</Button>
            </Form>
          </Card>

          <Card title="通告列表" size="small" bordered={false}>
            <List
              dataSource={announcements}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Switch
                      key="active"
                      checked={!!item.isActive}
                      onChange={async (checked) => {
                        try {
                          await api.put(`/announcements/${item.id}/active`, { isActive: checked });
                          message.success('已更新状态');
                          fetchAnnouncements();
                        } catch (error: any) {
                          message.error(error.response?.data?.message || '更新失败');
                        }
                      }}
                    />
                  ]}
                >
                  <Space direction="vertical" size={0}>
                    <Space>
                      <span>{item.title}</span>
                      {item.isActive ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>}
                    </Space>
                    <a href={item.mediaUrl} target="_blank" rel="noreferrer">{item.mediaUrl}</a>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Space>
      )
    }] : []),
  ];

  return (
    <Card bordered={false}>
      <Tabs defaultActiveKey="1" items={items} />
    </Card>
  );
};

export default SystemSettingsPage;
