import { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Card, Modal, Form, Input, Select, App, Tooltip, Popover, InputNumber, Upload } from 'antd';
import { PlusOutlined, UserOutlined, ClockCircleOutlined, MessageOutlined, UserAddOutlined, PhoneOutlined, TeamOutlined, FileDoneOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Customer } from '../types';
import { SaleStage } from '../types';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { Role } from '../types';
// import { COURSE_OPTIONS } from '../constants/courses';

const COURSE_OPTIONS = [
  {
    label: 'CAAC 执照培训',
    options: [
      { label: '多旋翼-视距内驾驶员', value: '多旋翼-视距内驾驶员' },
      { label: '多旋翼-超视距驾驶员', value: '多旋翼-超视距驾驶员' },
      { label: '多旋翼-教员', value: '多旋翼-教员' },
      { label: '垂直起降固定翼-超视距驾驶员', value: '垂直起降固定翼-超视距驾驶员' },
      { label: '垂直起降固定翼-教员', value: '垂直起降固定翼-教员' },
    ]
  },
  {
    label: '青少年培训',
    options: [
      { label: '无人机科普体验课', value: '无人机科普体验课' },
      { label: '无人机编程课', value: '无人机编程课' },
      { label: '无人机考级培训', value: '无人机考级培训' },
      { label: '无人机夏令营', value: '无人机夏令营' },
    ]
  },
  {
    label: '行业应用',
    options: [
      { label: '航拍技术培训', value: '航拍技术培训' },
      { label: '电力巡检培训', value: '电力巡检培训' },
      { label: '测绘技术培训', value: '测绘技术培训' },
      { label: '航拍服务', value: '航拍服务' },
      { label: '幕墙检测', value: '幕墙检测' },
      { label: '空域申请', value: '空域申请' },
      { label: '清洗业务', value: '清洗业务' },
    ]
  }
];

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
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [stageLogs, setStageLogs] = useState<any[]>([]);
  const [isCustomCourse, setIsCustomCourse] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [logForm] = Form.useForm();
  
  // Check if user is Supervisor of specific departments or Admin
  const isTargetSupervisor = user?.role === Role.SUPERVISOR && 
    (user?.department?.name === '市场营销部' || user?.department?.name === '网络运营部');
  
  // Update: Admin, Manager, and Supervisor can edit/delete, but backend will enforce department boundaries for Manager/Supervisor
  const canEditDelete = user?.role === Role.ADMIN || user?.role === Role.MANAGER || user?.role === Role.SUPERVISOR;

  // Fix: Correct logic for Supervisor permissions
  // Market Marketing Supervisor (市场营销部) CANNOT edit/delete customers - Overriding this based on new requirement
  // New requirement: open delete to manager and admin (and supervisor for their dept)
  const canOperateCustomer = user?.role === Role.ADMIN || user?.role === Role.MANAGER || user?.role === Role.SUPERVISOR;

  const isAdminOrManagerOrSupervisor = user?.role === Role.ADMIN || user?.role === Role.MANAGER || user?.role === Role.SUPERVISOR;

  useEffect(() => {
    console.log('CustomerList v2.0 Loaded');
    console.log('Current User Role:', user?.role);
    console.log('Can Operate Customer:', canOperateCustomer);
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch data independently to avoid Promise.all failure blocking everything
      try {
        const customerRes = await api.get('/customers');
        setCustomers(customerRes.data);
      } catch (e) { console.error('Failed to fetch customers', e); }

      try {
        const channelRes = await api.get('/channel');
        setChannels(channelRes.data);
      } catch (e) { console.error('Failed to fetch channels', e); }

      try {
        const userRes = await api.get('/users/assignable');
        setUsers(userRes.data);
      } catch (e) { console.error('Failed to fetch users', e); }

    } catch (error) {
      message.error('获取部分数据失败，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownloadTemplate = () => {
    const template = [
      {
        '客户姓名': '张三',
        '联系电话': '13800000000',
        '渠道来源': '抖音', // 需与系统内渠道名称一致
        '负责人': '李四', // 需与系统内员工姓名一致
        '公司名称': '某某航空公司',
        '课程类型': 'CAAC',
        '课程名称': '多旋翼视距内驾驶员'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, '客户导入模板.xlsx');
  };

  const handleImport = (file: any) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        if (jsonData.length === 0) {
            message.warning('Excel文件为空');
            return;
        }

        setLoading(true);
        let successCount = 0;
        let failCount = 0;
        
        for (const row: any of jsonData) {
             const name = row['客户姓名'];
             const phone = row['联系电话'];
             const channelName = row['渠道来源'];
             const ownerName = row['负责人'];
             
             if (!name || !phone) {
                 failCount++;
                 continue;
             }
             
             const channel = channels.find(c => c.name === channelName);
             const owner = users.find(u => u.name === ownerName);
             
             try {
                 await api.post('/customers', {
                     name,
                     phone: String(phone),
                     companyName: row['公司名称'],
                     sourceId: channel?.id,
                     ownerId: owner?.id,
                     courseType: row['课程类型'],
                     courseName: row['课程名称']
                 });
                 successCount++;
             } catch (err) {
                 console.error('Import row failed', row, err);
                 failCount++;
             }
        }
        
        message.success(`导入完成: 成功 ${successCount} 条, 失败 ${failCount} 条`);
        fetchData();
      } catch (err) {
        console.error('File parse error', err);
        message.error('文件解析失败');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
    return false;
  };

  const handleSave = async (values: any) => {
    try {
      if (editingCustomer) {
          await api.put(`/customers/${editingCustomer.id}`, values);
          message.success('客户信息更新成功');
      } else {
          await api.post('/customers', values);
          message.success('线索创建成功');
      }
      setIsModalOpen(false);
      setEditingCustomer(null);
      form.resetFields();
      fetchData();
    } catch (error: any) {
      console.error('Save error:', error);
      const errorMsg = error.response?.data?.message || '操作失败，请稍后重试';
      message.error(errorMsg);
    }
  };

  const handleEdit = (record: Customer) => {
      setEditingCustomer(record);
      form.setFieldsValue({
          name: record.name,
          phone: record.phone,
          sourceId: record.channel?.id, // Assuming backend returns channel object or sourceId
          // If record has sourceId, use it. If not, maybe it's in channel object?
          // Looking at columns: dataIndex: ['channel', 'name']. 
          // Let's check handleImport: sourceId: channel?.id. 
          // So record likely has sourceId or channel.id.
          // Let's assume record has sourceId based on backend model usually.
          // Or we can find it from channels if needed. 
          // Safest is to set sourceId if exists, or try to find it.
          // Actually, if I look at handleImport, it posts sourceId.
          courseType: record.courseType,
          courseName: record.courseName,
          ownerId: record.ownerId
      });
      // Handle sourceId specifically if it's nested
      if (!record.sourceId && record.channel) {
          form.setFieldValue('sourceId', record.channel.id);
      }
      
      setIsModalOpen(true);
  };

  const handleDelete = (record: Customer) => {
      Modal.confirm({
          title: '确认删除',
          content: `确定要删除客户 "${record.name}" 吗？此操作不可恢复。`,
          okText: '删除',
          okType: 'danger',
          cancelText: '取消',
          onOk: async () => {
              console.log('Confirm delete:', record.id);
              try {
                  await api.put(`/customers/${record.id}`, { status: 'CHURNED' });
                  setCustomers(prev => prev.filter(c => c.id !== record.id));
                  message.success(`客户“${record.name}”已删除`);
              } catch (e: any) {
                  console.error('Delete error:', e);
                  try {
                      await api.delete(`/customers/${record.id}`);
                      setCustomers(prev => prev.filter(c => c.id !== record.id));
                      message.success(`客户“${record.name}”已删除`);
                  } catch (err: any) {
                      const errorMsg = err.response?.data?.message || e.response?.data?.message || '删除失败，请稍后重试';
                      message.error(errorMsg);
                  }
              }
          }
      });
  };

  const handleStageClick = (customer: Customer, stage: SaleStage) => {
        // Check if trying to edit DEAL
        const hasDeal = customer.saleLogs?.some(l => l.stage === SaleStage.DEAL);
        
        const isOwner = customer.ownerId === user?.id;
        // Allow Owner, Admin, Manager to edit stages
        // But if DEAL exists, maybe lock it? Current logic locks if stage is DEAL and hasDeal.
        // Let's keep that lock logic but expand permission.
        const hasPermission = isOwner || user?.role === Role.ADMIN || user?.role === Role.MANAGER;
        
        const canEdit = hasPermission && !(stage === SaleStage.DEAL && hasDeal); // Lock edit if deal signed

        setSelectedCustomer(customer);
      setActionStage(stage);
      
      const logs = customer.saleLogs?.filter(l => l.stage === stage) || [];
      setStageLogs(logs);

      setIsReadOnly(!canEdit);
      setIsLogModalOpen(true);
      
      if (canEdit) {
          logForm.resetFields();
          logForm.setFieldsValue({ stage });
      }
  };

  const handleSubmitLog = async (values: any) => {
      if (!selectedCustomer) return;
      try {
          await api.post(`/customers/${selectedCustomer.id}/log`, {
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
        // Allow viewing process for all accessible customers (filtered by backend)
        // Owner, Admin, Manager can operate
        const isOwner = customer.ownerId === user?.id;
        const canEdit = isOwner || user?.role === Role.ADMIN || user?.role === Role.MANAGER;
        
        // Debug
        // console.log(`Cust ${customer.id} canEdit: ${canEdit} (Owner: ${isOwner}, Role: ${user?.role})`);

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
                      disabled={!canEdit}
                      onClick={() => handleStageClick(customer, SaleStage.CHANCE)}
                  />
              </Tooltip>
              <Tooltip title="约访 (CALL)">
                   <Button 
                      type={hasCall ? 'primary' : 'default'} 
                      shape="circle" 
                      icon={<PhoneOutlined />} 
                      size="small"
                      disabled={!canEdit}
                      onClick={() => handleStageClick(customer, SaleStage.CALL)}
                  />
              </Tooltip>
              <Tooltip title="接待 (TOUCH)">
                   <Button 
                      type={hasTouch ? 'primary' : 'default'} 
                      shape="circle" 
                      icon={<TeamOutlined />} 
                      size="small"
                      disabled={!canEdit}
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
                      disabled={!canEdit}
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
      dataIndex: ['channel', 'name'],
      key: 'channel',
      width: 100,
    },
    {
      title: '负责人',
      dataIndex: ['owner', 'name'],
      key: 'owner',
      width: 150,
      render: (text: string, record: Customer) => {
        // Only Admin, Manager, Supervisor can change owner
        const canChangeOwner = isAdminOrManagerOrSupervisor;
        
        // Find current owner object
        const currentOwner = users.find(u => u.id === record.ownerId) || record.owner;

        if (!canChangeOwner) {
            return <Space><UserOutlined /> {currentOwner?.name}</Space>;
        }

        return (
             <Select
                value={record.ownerId}
                style={{ width: '100%' }}
                bordered={false}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={users.map(u => ({ label: u.name, value: u.id }))}
                onChange={async (newOwnerId) => {
                    try {
                        await api.put(`/customers/${record.id}`, { ownerId: newOwnerId });
                        message.success('负责人已更新');
                        // Optimistic update
                        const newOwner = users.find(u => u.id === newOwnerId);
                        setCustomers(prev => prev.map(c => c.id === record.id ? { ...c, ownerId: newOwnerId, owner: newOwner } : c));
                    } catch (e) {
                        message.error('更新负责人失败');
                    }
                }}
             />
        );
      }
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
                      <Tag color="blue">{lastLog.stage}</Tag>
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
    },
    {
      title: '课程类型',
      dataIndex: 'courseType',
      key: 'courseType',
      width: 100,
    },
    {
      title: '课程名称',
      dataIndex: 'courseName',
      key: 'courseName',
      width: 150,
      render: (text: string, record: Customer) => {
        const isOwner = record.ownerId === user?.id;
        // Assume user role exists in user object
        const canEdit = isOwner || (user as any)?.role === 'ADMIN' || (user as any)?.role === 'MANAGER';
        
        return (
          <Select
            value={text}
            style={{ width: '100%' }}
            placeholder="选择课程"
            bordered={false}
            disabled={!canEdit}
            onChange={async (value) => {
               try {
                   await api.put(`/customers/${record.id}`, { courseName: value });
                   message.success('课程更新成功');
                   // Optimistic update
                   setCustomers(prev => prev.map(c => c.id === record.id ? { ...c, courseName: value } : c));
               } catch (e) {
                   message.error('更新失败');
               }
            }}
            options={COURSE_OPTIONS}
          />
        );
      }
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>客户管理 (v2.0)</h2>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>下载模板</Button>
          <Upload beforeUpload={handleImport} showUploadList={false} accept=".xlsx,.xls">
              <Button icon={<UploadOutlined />}>批量导入</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditingCustomer(null);
            form.resetFields();
            setIsModalOpen(true);
          }}>
            录入线索
          </Button>
        </Space>
      </div>
      
      <Card styles={{ body: { padding: 0 } }}>
        <Table 
            columns={canOperateCustomer ? [...columns, {
                title: '操作',
                key: 'action',
                width: 150,
                render: (_: any, record: Customer) => (
                    <Space>
                        <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
                        <Button type="link" danger size="small" onClick={() => handleDelete(record)}>删除</Button>
                    </Space>
                )
            }] : columns}  
            dataSource={customers} 
            rowKey="id" 
            loading={loading}
            pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal title={editingCustomer ? "编辑客户信息" : "录入新线索"} open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="客户姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="联系电话" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sourceId" label="渠道来源" rules={[{ required: true }]}>
             <Select>
                 {channels.map(c => (
                     <Select.Option key={c.id} value={c.id}>{c.name} {c.isActive ? '' : '(禁用)'}</Select.Option>
                 ))}
             </Select>
          </Form.Item>

          <Form.Item name="courseType" label="课程类型">
             <Select placeholder="选择类型">
                 <Select.Option value="CAAC">CAAC</Select.Option>
                 <Select.Option value="青少年">青少年</Select.Option>
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
        title={isReadOnly ? `${actionStage} 记录` : "添加跟进记录"} 
        open={isLogModalOpen} 
        onCancel={() => setIsLogModalOpen(false)} 
        onOk={() => !isReadOnly && logForm.submit()}
        footer={isReadOnly ? [<Button key="close" onClick={() => setIsLogModalOpen(false)}>关闭</Button>] : undefined}
      >
          {isReadOnly ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {stageLogs.length === 0 ? <p style={{ color: '#999' }}>暂无记录</p> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {stageLogs.map(log => (
                              <Card key={log.id} size="small" type="inner" title={dayjs(log.occurredAt).format('YYYY-MM-DD HH:mm')}>
                                  <div style={{ whiteSpace: 'pre-wrap' }}>{log.note || '无备注'}</div>
                                  {log.dealAmount && <div style={{ marginTop: 4, fontWeight: 'bold', color: '#52c41a' }}>金额: ¥{log.dealAmount}</div>}
                              </Card>
                          ))}
                      </div>
                  )}
              </div>
          ) : (
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
          )}
      </Modal>
    </div>
  );
};

export default CustomerList;
