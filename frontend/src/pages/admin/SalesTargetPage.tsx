import { useState, useEffect } from 'react';
import { Card, Table, Button, DatePicker, InputNumber, Form, Modal, Tag, App } from 'antd';
import { EditOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';

const SalesTargetPage = () => {
  const { message } = App.useApp();
  const [selectedQuarter, setSelectedQuarter] = useState<dayjs.Dayjs | null>(dayjs());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form] = Form.useForm();
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, targetRes] = await Promise.all([
        api.get('/users'),
        api.get('/sales-target')
      ]);
      
      // Filter relevant users (Sales, Managers)
      const relevantRoles = ['MANAGER', 'SUPERVISOR', 'EMPLOYEE'];
      const salesUsers = userRes.data.filter((u: any) => relevantRoles.includes(u.role));
      setUsers(salesUsers);
      setTargets(targetRes.data);
    } catch (error) {
      message.error('获取数据失败');
    }
  };

  const getQuarterMonths = (date: dayjs.Dayjs) => {
    const startMonth = Math.floor(date.month() / 3) * 3;
    return [
      date.year() + '-' + String(startMonth + 1).padStart(2, '0'),
      date.year() + '-' + String(startMonth + 2).padStart(2, '0'),
      date.year() + '-' + String(startMonth + 3).padStart(2, '0'),
    ];
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    const months = getQuarterMonths(selectedQuarter || dayjs());
    
    // Find existing targets for this user and these months
    const userTargets: any = {}; // Explicitly any to allow dynamic keys
    months.forEach((month, index) => {
        const target = targets.find((t: any) => t.userId === user.id && t.month === month);
        userTargets[`month${index + 1}`] = target ? target.amount : 0;
    });

    form.setFieldsValue(userTargets);
    setIsModalOpen(true);
  };

  const handleSave = async (values: any) => {
    try {
      const months = getQuarterMonths(selectedQuarter || dayjs());
      const promises = months.map((month, index) => {
          const amount = values[`month${index + 1}`];
          return api.post('/sales-target', {
              userId: editingUser.id,
              month,
              amount: Number(amount)
          });
      });

      await Promise.all(promises);
      message.success('保存成功');
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      message.error('保存失败');
    }
  };

  const getTargetAmount = (userId: number, monthOffset: number) => {
      if (!selectedQuarter) return 0;
      const months = getQuarterMonths(selectedQuarter);
      const targetMonth = months[monthOffset];
      const target = targets.find(t => t.userId === userId && t.month === targetMonth);
      return target ? target.amount : 0;
  };

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '职位', dataIndex: 'role', key: 'role', render: (role: string) => <Tag color="blue">{role}</Tag> },
    { 
      title: `${getQuarterMonths(selectedQuarter || dayjs())[0]} 目标`, 
      key: 'm1',
      render: (_: any, record: any) => `¥${Number(getTargetAmount(record.id, 0)).toLocaleString()}`
    },
    { 
      title: `${getQuarterMonths(selectedQuarter || dayjs())[1]} 目标`, 
      key: 'm2',
      render: (_: any, record: any) => `¥${Number(getTargetAmount(record.id, 1)).toLocaleString()}`
    },
    { 
      title: `${getQuarterMonths(selectedQuarter || dayjs())[2]} 目标`, 
      key: 'm3',
      render: (_: any, record: any) => `¥${Number(getTargetAmount(record.id, 2)).toLocaleString()}`
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
      ),
    },
  ];

  return (
    <Card 
      title="业绩指标管理 (季度)" 
      variant="borderless"
      extra={
        <DatePicker picker="quarter" 
          defaultValue={dayjs()} 
          onChange={(date) => setSelectedQuarter(date)} 
          placeholder="选择季度"
          allowClear={false}
        />
      }
    >
      <Table dataSource={users} columns={columns} rowKey="id" />

      <Modal 
        title={`编辑业绩目标 - ${editingUser?.name}`} 
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          {selectedQuarter && getQuarterMonths(selectedQuarter).map((month, index) => (
              <Form.Item key={month} name={`month${index + 1}`} label={`${month} 目标`}>
                <InputNumber style={{ width: '100%' }} prefix="¥" />
              </Form.Item>
          ))}
        </Form>
      </Modal>
    </Card>
  );
};

export default SalesTargetPage;
