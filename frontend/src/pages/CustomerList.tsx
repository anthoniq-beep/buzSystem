import { useEffect, useState, useRef } from 'react';
import { Table, Tag, Button, Space, Card, Modal, Form, Input, Select, App, Tooltip, Popover, InputNumber, Upload } from 'antd';
import { PlusOutlined, UserOutlined, ClockCircleOutlined, MessageOutlined, UserAddOutlined, PhoneOutlined, TeamOutlined, FileDoneOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import api from '../services/api';
import type { Customer } from '../types';
import { SaleStage } from '../types';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const CustomerList = () => {
  const { message, modal } = App.useApp();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [actionStage, setActionStage] = useState<SaleStage | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [stageLogs, setStageLogs] = useState<any[]>([]);
  const [isCustomCourse, setIsCustomCourse] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [logForm] = Form.useForm();

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

  const handleCreate = async (values: any) => {
    try {
      await api.post('/customers', {
          ...values,
      });
      message.success('线索创建成功');
      setIsModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (error: any) {
      console.error('Create error:', error);
      const errorMsg = error.response?.data?.message || '创建失败，请稍后重试';
      message.error(errorMsg);
    }
  };

  const handleStageClick = (customer: Customer, stage: SaleStage) => {
      // Check if trying to edit DEAL
      const hasDeal = customer.saleLogs?.some(l => l.stage === SaleStage.DEAL);
      
      const isOwner = customer.ownerId === user?.id;
      const canEdit = isOwner && !(stage === SaleStage.DEAL && hasDeal); // Lock edit if deal signed

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
      // But only Owner can operate (or Admin if needed, but user said "no need to modify")
      const isOwner = customer.ownerId === user?.id;
      const canEdit = isOwner;

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

  const handleDownloadTemplate = () => {
    const header = ['客户姓名', '手机号', '渠道来源', '负责人', '公司名称', '课程类型', '课程名称'];
    const data = [
      ['张三', '13800138000', '大众点评', '王五', '某某公司', 'CAAC', '无人机执照'],
      ['李四', '13900139000', '老客户转介绍', '', '', '青少年', '冬令营'],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "客户导入模板.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // Transform data
        // Assume row 0 is header
        if (data.length < 2) {
            message.error('文件内容为空');
            return;
        }

        const rows = data.slice(1);
        
        const customers = rows.map((row: any) => ({
            name: row[0],
            phone: row[1],
            channelName: row[2],
            ownerName: row[3],
            companyName: row[4],
            courseType: row[5],
            courseName: row[6]
        })).filter((c: any) => c.name && c.phone); // Basic validation

        if (customers.length === 0) {
             message.error('未找到有效数据');
             return;
        }

        const res = await api.post('/customers/batch', { customers });
        
        if (res.data.errors && res.data.errors.length > 0) {
            modal.warning({
                title: '导入部分完成',
                content: (
                    <div>
                        <p>{res.data.message}</p>
                        <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 8 }}>
                            {res.data.errors.map((err: any, idx: number) => (
                                <div key={idx} style={{ color: 'red', fontSize: 12 }}>
                                    {err.name}: {err.error}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            });
        } else {
            message.success(`成功导入 ${customers.length} 条数据`);
        }
        fetchData();

      } catch (error: any) {
        console.error('Import error:', error);
        message.error('导入失败: ' + (error.response?.data?.message || error.message));
      } finally {
        setImportLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
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
      width: 100,
      render: (text: string) => <Space><UserOutlined /> {text}</Space>
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
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>客户管理</h2>
        <Space>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                下载模板
            </Button>
            <Button icon={<UploadOutlined />} loading={importLoading} onClick={() => fileInputRef.current?.click()}>
                批量导入
            </Button>
            <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".xlsx, .xls" 
                onChange={handleFileUpload}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            录入线索
            </Button>
        </Space>
      </div>
      
      <Card styles={{ body: { padding: 0 } }}>
        <Table 
            columns={columns}  
            dataSource={customers} 
            rowKey="id" 
            loading={loading}
            pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal title="录入新线索" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
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
