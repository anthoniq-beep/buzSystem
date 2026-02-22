import { useEffect, useState } from 'react';
import { Card, Tree, Button, Table, Space, Tag, Modal, Form, Input, Select, App, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserAddOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { Role } from '../../types';
import api from '../../services/api';

const OrganizationPage = () => {
  const { message } = App.useApp();
  const [departments, setDepartments] = useState<any[]>([]);
  const [rawDepartments, setRawDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deptRes, userRes] = await Promise.all([
        api.get('/organization'),
        api.get('/users')
      ]);

      setRawDepartments(deptRes.data);
      setAllUsers(userRes.data);
      
      // Build Tree
      const tree = buildDeptTree(deptRes.data);
      setDepartments(tree);
      setUsers(userRes.data);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const buildDeptTree = (items: any[], parentId: number | null = null): any[] => {
    return items
      .filter(item => item.parentId === parentId)
      .map(item => ({
        title: item.name,
        key: item.id,
        ...item,
        children: buildDeptTree(items, item.id),
      }));
  };

  const handleDeptSelect = (selectedKeys: any[], info: any) => {
    const node = info.node;
    setSelectedDept(node);
    if (node) {
      // Filter users by department
      // Recursively find all department IDs including children
      const deptIds = getAllChildDeptIds(node);
      const filtered = allUsers.filter((u: any) => deptIds.includes(u.departmentId));
      setUsers(filtered);
    } else {
      setUsers(allUsers);
    }
  };

  const getAllChildDeptIds = (node: any): number[] => {
      let ids = [node.id];
      if (node.children) {
          node.children.forEach((child: any) => {
              ids = [...ids, ...getAllChildDeptIds(child)];
          });
      }
      return ids;
  };

  const handleSaveUser = async (values: any) => {
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/users', {
            ...values,
            username: values.phone, // Phone as username
            status: 'REGULAR', // Default
            departmentId: Number(values.departmentId), // Ensure number
            supervisorId: values.supervisorId ? Number(values.supervisorId) : undefined, // Ensure number or undefined
        });
        message.success('员工添加成功');
      }
      setIsUserModalOpen(false);
      setEditingUser(null);
      form.resetFields();
      fetchData();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || (editingUser ? '更新失败' : '添加失败');
      message.error(msg);
    }
  };

  const handleEdit = (record: any) => {
    setEditingUser(record);
    form.setFieldsValue(record);
    setIsUserModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/users/${id}`);
      message.success('删除成功');
      fetchData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '职位', dataIndex: 'role', key: 'role', render: (role: string) => <Tag color="blue">{role}</Tag> },
    { title: '电话/账号', dataIndex: 'phone', key: 'phone' },
    { title: '状态', dataIndex: 'status', key: 'status' },
    { title: '部门', dataIndex: 'departmentId', key: 'dept', render: (id: number) => rawDepartments.find(d => d.id === id)?.name || '-' },
    { title: '直属领导', dataIndex: 'supervisorId', key: 'supervisor', render: (id: number) => allUsers.find(u => u.id === id)?.name || '-' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除该员工吗?" onConfirm={() => handleDelete(record.id)}>
             <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', gap: 24, height: '100%' }}>
      {/* Left: Department Tree */}
      <Card title="组织架构" variant="borderless" style={{ width: 300, height: '100%', overflowY: 'auto' }} extra={<Button type="link" icon={<PlusOutlined />} />}>
        <Tree
          treeData={departments}
          onSelect={handleDeptSelect}
          blockNode
        />
      </Card>

      {/* Right: User List */}
      <Card 
        title={selectedDept ? `${selectedDept.title} - 人员管理` : '人员管理'} 
        variant="borderless"
        style={{ flex: 1, overflowY: 'auto' }}
        extra={
          <Space>
            <Button icon={<UploadOutlined />}>导入</Button>
            <Button icon={<DownloadOutlined />}>导出</Button>
            <Button type="primary" icon={<UserAddOutlined />} onClick={() => {
              setEditingUser(null);
              form.resetFields();
              setIsUserModalOpen(true);
            }}>添加员工</Button>
          </Space>
        }
      >
        <Table dataSource={users} columns={columns} rowKey="id" loading={loading} />
      </Card>

      <Modal 
        title={editingUser ? "编辑员工" : "添加员工"} 
        open={isUserModalOpen} 
        onCancel={() => {
          setIsUserModalOpen(false);
          setEditingUser(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveUser}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="电话 (作为登录账号)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="职位" rules={[{ required: true }]}>
             <Select>
                <Select.Option value={Role.ADMIN}>超级管理员</Select.Option>
                <Select.Option value={Role.MANAGER}>部门主管</Select.Option>
                <Select.Option value={Role.SUPERVISOR}>销售经理</Select.Option>
                <Select.Option value={Role.EMPLOYEE}>销售专员</Select.Option>
                <Select.Option value={Role.FINANCE}>财务</Select.Option>
                <Select.Option value={Role.HR}>人事</Select.Option>
             </Select>
          </Form.Item>
          <Form.Item name="departmentId" label="所属部门" rules={[{ required: true }]}>
             <Select>
                 {rawDepartments.map(dept => (
                     <Select.Option key={dept.id} value={dept.id}>{dept.name}</Select.Option>
                 ))}
             </Select>
          </Form.Item>
          <Form.Item name="supervisorId" label="直属领导">
             <Select allowClear>
                 {allUsers.map(u => (
                     <Select.Option key={u.id} value={u.id}>{u.name} - {u.role}</Select.Option>
                 ))}
             </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OrganizationPage;
