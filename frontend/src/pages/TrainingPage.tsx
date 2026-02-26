import { useState, useEffect } from 'react';
import { Table, Card, Tag, Button, Modal, Form, Select, Steps, Tabs, InputNumber, Radio, Input, message, App, Space, Popconfirm } from 'antd';
import { RocketOutlined, UserOutlined, CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

const { Step } = Steps;
const { TextArea } = Input;

// Stages
const STAGES = {
  THEORY: '理论测试',
  SIMULATION: '模拟飞行',
  PRACTICAL: '实操飞行',
  GROUND: '地面站',
  RETURN: '返航',
  REPLAN: '重规划'
};

const STAGE_KEYS = ['THEORY', 'SIMULATION', 'PRACTICAL', 'GROUND', 'RETURN', 'REPLAN'];

// Course Types Logic
const getStagesForCourse = (courseName: string) => {
    // If course contains BVLOS or Instructor, return all stages
    if (courseName.includes('超视距') || courseName.includes('教员')) {
        return STAGE_KEYS;
    }
    // Else (VLOS) return only first 3
    return ['THEORY', 'SIMULATION', 'PRACTICAL'];
};

const TrainingPage = () => {
    const { user } = useAuth();
    const { message } = App.useApp();
    const [trainings, setTrainings] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Assign Modal
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignForm] = Form.useForm();
    const [selectedTraining, setSelectedTraining] = useState<any>(null);
    const [instructors, setInstructors] = useState<any[]>([]);

    // Log Modal
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [logForm] = Form.useForm();
    const [currentStage, setCurrentStage] = useState<string>('');
    
    // View Logs Modal
    const [isViewLogsModalOpen, setIsViewLogsModalOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/training');
            setTrainings(res.data);
        } catch (error) {
            message.error('获取培训数据失败');
        } finally {
            setLoading(false);
        }
    };

    const fetchInstructors = async () => {
        try {
            const res = await api.get('/users/assignable'); // Or filter by dept if needed
            setInstructors(res.data);
        } catch (error) {
            console.error('Failed to fetch instructors');
        }
    };

    useEffect(() => {
        fetchData();
        fetchInstructors();
    }, []);

    const handleAssign = async (values: any) => {
        try {
            await api.patch(`/training/${selectedTraining.id}/assign`, values);
            message.success('指派成功');
            setIsAssignModalOpen(false);
            fetchData();
        } catch (error) {
            message.error('指派失败');
        }
    };

    const handleLogSubmit = async (values: any) => {
        try {
            // Validate Score Logic
            if (currentStage === 'THEORY') {
                const score = values.score;
                const courseName = selectedTraining.customer.courseName;
                const isAdvanced = courseName.includes('超视距') || courseName.includes('教员');
                const threshold = isAdvanced ? 90 : 80;
                
                if (score < threshold) {
                    message.error(`分数未达标，需${threshold}分以上才能提交`);
                    return; // Prevent submission? User said "need X score to submit", implying validation block.
                }
            }

            await api.post(`/training/${selectedTraining.id}/log`, {
                stage: currentStage,
                ...values
            });
            message.success('提交成功，等待审批');
            setIsLogModalOpen(false);
            logForm.resetFields();
            fetchData();
        } catch (error) {
            message.error('提交失败');
        }
    };

    const handleApprove = async (logId: number) => {
        try {
            await api.patch(`/training/log/${logId}/approve`);
            message.success('审批通过');
            // Update local state or refetch
            // If viewing logs modal is open, we might need to refresh that data too.
            // Simplest is refetch all and update selectedTraining if needed
            fetchData();
            if (selectedTraining) {
                // We need to re-find the training in the new data to update the modal view if it relies on selectedTraining
                // Actually, let's just close and reopen or handle it better.
                // For now, simple refetch.
            }
        } catch (error) {
            message.error('审批失败');
        }
    };

    const openLogModal = (training: any, stage: string) => {
        setSelectedTraining(training);
        setCurrentStage(stage);
        setIsLogModalOpen(true);
        logForm.resetFields();
    };

    const columns = [
        {
            title: '客户姓名',
            dataIndex: ['customer', 'name'],
            key: 'name',
        },
        {
            title: '课程名称',
            dataIndex: ['customer', 'courseName'],
            key: 'courseName',
        },
        {
            title: '负责人',
            dataIndex: ['assignee', 'name'],
            key: 'assignee',
            render: (text: string, record: any) => (
                <Space>
                    {text || <Tag color="red">未指派</Tag>}
                    {(user?.role === Role.ADMIN || user?.role === Role.MANAGER) && (
                        <Button 
                            type="link" 
                            size="small" 
                            icon={<UserOutlined />}
                            onClick={() => {
                                setSelectedTraining(record);
                                assignForm.setFieldsValue({ assigneeId: record.assigneeId });
                                setIsAssignModalOpen(true);
                            }}
                        >
                            指派
                        </Button>
                    )}
                </Space>
            )
        },
        {
            title: '教学进度',
            key: 'progress',
            width: 400,
            render: (_: any, record: any) => {
                const stages = getStagesForCourse(record.customer.courseName || '');
                // Calculate current step
                // Find the last APPROVED log stage index
                let currentStep = 0;
                
                // Map stages to index
                const stageIndexMap = new Map(stages.map((s, i) => [s, i]));
                
                if (record.logs && record.logs.length > 0) {
                     // Get highest approved stage index
                     const approvedLogs = record.logs.filter((l: any) => l.status === 'APPROVED');
                     if (approvedLogs.length > 0) {
                         // Find max index
                         let maxIdx = -1;
                         approvedLogs.forEach((l: any) => {
                             const idx = stageIndexMap.get(l.stage);
                             if (idx !== undefined && idx > maxIdx) maxIdx = idx;
                         });
                         currentStep = maxIdx + 1;
                     }
                }
                
                return (
                    <Steps size="small" current={currentStep} status="process">
                        {stages.map(stageKey => (
                            <Step key={stageKey} title={(STAGES as any)[stageKey]} />
                        ))}
                    </Steps>
                );
            }
        },
        {
            title: '教学日志',
            key: 'logs',
            render: (_: any, record: any) => (
                <Space>
                    <Button 
                        icon={<FileTextOutlined />} 
                        onClick={() => {
                            setSelectedTraining(record);
                            setIsViewLogsModalOpen(true);
                        }}
                    >
                        查看/填写日志
                    </Button>
                </Space>
            )
        }
    ];

    // Helper to render log input form based on stage
    const renderLogInput = () => {
        if (currentStage === 'THEORY') {
            return (
                <Form.Item 
                    name="score" 
                    label="理论模拟测试分数" 
                    rules={[{ required: true, message: '请输入分数' }]}
                    help={
                        (selectedTraining?.customer?.courseName?.includes('超视距') || selectedTraining?.customer?.courseName?.includes('教员')) 
                        ? '需90分以上提交' 
                        : '需80分以上提交'
                    }
                >
                    <InputNumber min={0} max={100} style={{ width: '100%' }} />
                </Form.Item>
            );
        }
        if (currentStage === 'SIMULATION' || currentStage === 'RETURN' || currentStage === 'REPLAN') {
            return (
                <Form.Item name="result" label="结果" rules={[{ required: true }]}>
                    <Radio.Group>
                        <Radio value="PASS">通过/完成</Radio>
                        <Radio value="FAIL">不通过/未完成</Radio>
                    </Radio.Group>
                </Form.Item>
            );
        }
        if (currentStage === 'GROUND') {
            return (
                <Form.Item name="content" label="地面站测试完成度" rules={[{ required: true }]}>
                    <TextArea rows={4} placeholder="请填写测试题完成情况..." />
                </Form.Item>
            );
        }
        if (currentStage === 'PRACTICAL') {
            return (
                <>
                    <div style={{ marginBottom: 16, background: '#f5f5f5', padding: 12, borderRadius: 8 }}>
                        <p>请参考文档填写飞行安全记录表：</p>
                        <a href="#" onClick={(e) => { e.preventDefault(); /* Maybe show doc modal */ }}>查看记录表模板</a>
                        <p style={{ marginTop: 8, fontSize: 12, color: '#999' }}>* 实际开发中此处可集成Markdown编辑器或表单</p>
                    </div>
                    <Form.Item name="content" label="飞行安全记录" rules={[{ required: true }]}>
                        <TextArea rows={6} placeholder="填写飞行科目、起降次数、留空时间、飞行记录总结..." />
                    </Form.Item>
                    <Form.Item name="result" label="此次训练是否通过" rules={[{ required: true }]}>
                        <Radio.Group>
                            <Radio value="PASS">是</Radio>
                            <Radio value="FAIL">否</Radio>
                        </Radio.Group>
                    </Form.Item>
                </>
            );
        }
        return null;
    };

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <h2>教培管理</h2>
            </div>
            
            <Card styles={{ body: { padding: 0 } }}>
                <Table 
                    columns={columns} 
                    dataSource={trainings} 
                    rowKey="id" 
                    loading={loading}
                />
            </Card>

            {/* Assign Modal */}
            <Modal
                title="指派负责人"
                open={isAssignModalOpen}
                onCancel={() => setIsAssignModalOpen(false)}
                onOk={() => assignForm.submit()}
            >
                <Form form={assignForm} onFinish={handleAssign}>
                    <Form.Item name="assigneeId" label="选择负责人" rules={[{ required: true }]}>
                        <Select>
                            {instructors.map(u => (
                                <Select.Option key={u.id} value={u.id}>{u.name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Log Input Modal */}
            <Modal
                title={`填写日志 - ${(STAGES as any)[currentStage]}`}
                open={isLogModalOpen}
                onCancel={() => setIsLogModalOpen(false)}
                onOk={() => logForm.submit()}
            >
                <Form form={logForm} layout="vertical" onFinish={handleLogSubmit}>
                    {renderLogInput()}
                </Form>
            </Modal>

            {/* View Logs Modal */}
            <Modal
                title="教学日志详情"
                open={isViewLogsModalOpen}
                onCancel={() => setIsViewLogsModalOpen(false)}
                width={800}
                footer={null}
            >
                {selectedTraining && (
                    <Tabs
                        items={getStagesForCourse(selectedTraining.customer.courseName || '').map(stageKey => {
                            // Find log for this stage
                            // There might be multiple logs (retries), showing the latest or list?
                            // Requirement says "display tags", let's list them.
                            // But usually we care about the latest status.
                            
                            const logs = selectedTraining.logs?.filter((l: any) => l.stage === stageKey) || [];
                            const latestLog = logs[0]; // Descending order from API
                            const isApproved = latestLog?.status === 'APPROVED';
                            const isSubmitted = latestLog?.status === 'SUBMITTED';
                            
                            // Can edit/add if: Assigned to Me AND (No Log OR Latest is Rejected/Not Approved)
                            // But requirement says "Instructor submits -> Manager approves".
                            // If submitted, wait for approval.
                            
                            const canSubmit = (user?.id === selectedTraining.assigneeId) && (!latestLog || latestLog.status !== 'APPROVED');
                            const canApprove = (user?.role === Role.MANAGER || user?.role === Role.ADMIN) && isSubmitted;

                            return {
                                key: stageKey,
                                label: (
                                    <span>
                                        {(STAGES as any)[stageKey]} 
                                        {isApproved && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 4 }} />}
                                        {isSubmitted && <ClockCircleOutlined style={{ color: '#faad14', marginLeft: 4 }} />}
                                    </span>
                                ),
                                children: (
                                    <div style={{ padding: 16 }}>
                                        {logs.map((log: any) => (
                                            <Card 
                                                key={log.id} 
                                                size="small" 
                                                style={{ marginBottom: 8, borderColor: log.status === 'APPROVED' ? '#b7eb8f' : undefined }}
                                                title={dayjs(log.submittedAt).format('YYYY-MM-DD HH:mm')}
                                                extra={<Tag color={log.status === 'APPROVED' ? 'green' : 'orange'}>{log.status === 'APPROVED' ? '已审批' : '待审批'}</Tag>}
                                            >
                                                {log.score !== null && <p>分数: <strong>{log.score}</strong></p>}
                                                {log.result && <p>结果: <strong>{log.result === 'PASS' ? '通过' : log.result === 'FAIL' ? '未通过' : log.result}</strong></p>}
                                                {log.content && <div style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 8, borderRadius: 4 }}>{log.content}</div>}
                                                
                                                {log.status === 'APPROVED' && log.approvedAt && (
                                                    <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                                                        审批人ID: {log.approvedBy} 于 {dayjs(log.approvedAt).format('YYYY-MM-DD HH:mm')}
                                                    </div>
                                                )}

                                                {log.status === 'SUBMITTED' && canApprove && (
                                                     <div style={{ marginTop: 8, borderTop: '1px solid #eee', paddingTop: 8, textAlign: 'right' }}>
                                                         <Popconfirm title="确定审批通过吗？" onConfirm={() => handleApprove(log.id)}>
                                                             <Button type="primary" size="small">审批通过</Button>
                                                         </Popconfirm>
                                                     </div>
                                                )}
                                            </Card>
                                        ))}
                                        
                                        {logs.length === 0 && <p style={{ color: '#999', textAlign: 'center' }}>暂无记录</p>}
                                        
                                        {canSubmit && (
                                            <div style={{ marginTop: 24, textAlign: 'center' }}>
                                                <Button type="dashed" onClick={() => openLogModal(selectedTraining, stageKey)}>
                                                    填写{logs.length > 0 ? '新的' : ''}记录
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )
                            };
                        })}
                    />
                )}
            </Modal>
        </div>
    );
};

export default TrainingPage;
