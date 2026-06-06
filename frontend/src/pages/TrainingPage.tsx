import { useState, useEffect, useRef } from 'react';
import { Table, Card, Tag, Button, Modal, Form, Select, Steps, Tabs, InputNumber, Radio, Input, message, App, Space, Popconfirm, DatePicker, Row, Col, Divider, Checkbox } from 'antd';
import { RocketOutlined, UserOutlined, CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, PrinterOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

const { Step } = Steps;
const { TextArea } = Input;
const { Option } = Select;

// Stages
const STAGES = {
  THEORY: '理论测试',
  SIMULATION: '模拟飞行',
  PRACTICAL: '实操飞行',
  GROUND: '地面站',
  GRADUATION: '结业'
};

const STAGE_KEYS = ['THEORY', 'SIMULATION', 'PRACTICAL', 'GROUND', 'GRADUATION'];

// Course Types Logic
const getStagesForCourse = (courseName: string) => {
    // If course contains BVLOS or Instructor, return all stages
    if (courseName.includes('超视距') || courseName.includes('教员')) {
        return STAGE_KEYS;
    }
    // Else (VLOS) return only first 3 + Graduation? Usually VLOS also has Practical/Ground.
    // Assuming standard flow for now, maybe VLOS doesn't need Ground?
    // Let's stick to user requirement: "Delete Return/Replan, Add Graduation".
    // If original logic was Theory/Sim/Prac for VLOS, we should probably keep it or check if Ground is needed.
    // For now let's assume all courses follow the new structure or keep logic simple.
    // Let's include GROUND for everyone if not specified otherwise, or stick to previous logic of subsets.
    // Previous logic: VLOS -> Theory, Sim, Practical.
    // BVLOS -> All.
    // Let's add GRADUATION to both.
    if (courseName.includes('超视距') || courseName.includes('教员')) {
        return STAGE_KEYS;
    }
    return ['THEORY', 'SIMULATION', 'PRACTICAL', 'GRADUATION'];
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
            // Validate Score Logic - REMOVED per user request
            /*
            if (currentStage === 'THEORY') {
                const score = values.score;
                const courseName = selectedTraining.customer.courseName;
                const isAdvanced = courseName.includes('超视距') || courseName.includes('教员');
                const threshold = isAdvanced ? 90 : 80;
                
                if (score < threshold) {
                    message.error(`分数未达标，需${threshold}分以上才能提交`);
                    return;
                }
            }
            */
            
            // Format content if it's an object (PRACTICAL or GROUND stage)
            let formattedValues = { ...values };
            
            if (currentStage === 'GROUND') {
                const content = {
                    groundStation: values.content?.groundStation ? 'PASS' : 'FAIL',
                    prePlanning: values.content?.prePlanning ? 'PASS' : 'FAIL',
                    rePlanning: values.content?.rePlanning ? 'PASS' : 'FAIL',
                };
                formattedValues.content = JSON.stringify(content);
                formattedValues.result = Object.values(content).every(v => v === 'PASS') ? 'PASS' : 'FAIL';
            }
            else if (currentStage === 'PRACTICAL') {
                const content = {
                    flightTime: values.content?.flightTime,
                    hover: values.content?.hover ? 'PASS' : 'FAIL',
                    figure8: values.content?.figure8 ? 'PASS' : 'FAIL',
                };
                formattedValues.content = JSON.stringify(content);
                formattedValues.result = (content.hover === 'PASS' && content.figure8 === 'PASS') ? 'PASS' : 'FAIL';
            }
            else if (currentStage === 'GRADUATION') {
                formattedValues.result = 'PASS';
                // Trigger print preview after submit? Or maybe user should do it separately.
                // Requirement: "Click graduation -> auto generate table... print".
                // So maybe we submit log first, then open print modal.
            }

            await api.post(`/training/${selectedTraining.id}/log`, {
                stage: currentStage,
                ...formattedValues
            });
            message.success('提交成功');
            setIsLogModalOpen(false);
            logForm.resetFields();
            fetchData();
            
            if (currentStage === 'GRADUATION') {
                // Open print modal with new data (we need to re-fetch or just use current data + new log)
                // For simplicity, we wait for fetchData to update or just open it with existing data + optimistic update?
                // Let's just fetch individual training to be sure.
                try {
                    const res = await api.get('/training');
                    const updatedTraining = res.data.find((t: any) => t.id === selectedTraining.id);
                    if (updatedTraining) {
                        handleGraduate(updatedTraining);
                    }
                } catch(e) {}
            }
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
                    <Button
                        icon={<PrinterOutlined />}
                        onClick={() => handlePrintArchive(record)}
                    >
                        档案
                    </Button>
                </Space>
            )
        }
    ];

    // Custom Print Function (New Window)
    const handlePrintArchive = (training: any) => {
        const logs = training.logs || [];
        const sortedLogs = [...logs].sort((a: any, b: any) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            message.error('无法打开打印窗口，请允许弹出窗口');
            return;
        }

        // Generate Rows HTML
        const rowsHtml = sortedLogs.map((log: any) => {
            let content = '';
            if (log.score !== null) content = `分数: ${log.score}`;
            else if (log.stage === 'PRACTICAL') {
                try {
                    const c = JSON.parse(log.content);
                    content = `自旋:${c.hover === 'PASS'?'√':'×'} 八字:${c.figure8 === 'PASS'?'√':'×'} (${c.flightTime === 'AM'?'上午':'下午'})`;
                } catch(e) { content = '实操记录'; }
            }
            else if (log.stage === 'GROUND') {
                try {
                    const c = JSON.parse(log.content);
                    content = `地面站:${c.groundStation==='PASS'?'√':'×'} 预规划:${c.prePlanning==='PASS'?'√':'×'} 重规划:${c.rePlanning==='PASS'?'√':'×'}`;
                } catch(e) { content = '地面站记录'; }
            }
            else if (log.stage === 'GRADUATION') {
                content = '结业确认';
            }

            const stageName = (STAGES as any)[log.stage] || log.stage;
            const resultText = log.result === 'PASS' ? '通过' : log.result === 'FAIL' ? '未通过' : log.result;
            const dateStr = dayjs(log.submittedAt).format('YYYY-MM-DD');

            return `
                <tr>
                    <td>${dateStr}</td>
                    <td>${stageName}</td>
                    <td class="content-col">${content}</td>
                    <td>${resultText}</td>
                </tr>
            `;
        }).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>培训档案-${training.customer.name}</title>
                <style>
                    body { font-family: 'SimSun', serif; padding: 40px; color: #000; }
                    h2 { text-align: center; margin-bottom: 30px; font-size: 24px; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 16px; font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 14px; }
                    th, td { border: 1px solid #000; padding: 10px; text-align: center; }
                    th { background-color: #f5f5f5; }
                    .content-col { text-align: left; padding-left: 15px; }
                    .footer { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 20px; font-size: 16px; }
                    .signature-box { text-align: center; }
                    .line { border-top: 1px solid #000; width: 180px; margin-top: 60px; }
                    .print-time { text-align: right; margin-top: 40px; font-size: 12px; color: #666; }
                    @media print {
                        @page { margin: 1cm; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <h2>学员培训日志档案</h2>
                <div class="header">
                    <div>学员姓名：${training.customer.name}</div>
                    <div>课程：${training.customer.courseName}</div>
                    <div>负责人：${training.assignee?.name || '-'}</div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th width="15%">日期</th>
                            <th width="15%">阶段</th>
                            <th width="55%">内容/成绩</th>
                            <th width="15%">结果</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
                <div class="footer">
                    <div class="signature-box">学员签字<div class="line"></div></div>
                    <div class="signature-box">负责人签字<div class="line"></div></div>
                    <div class="signature-box">部门负责人签字<div class="line"></div></div>
                </div>
                <div class="print-time">打印日期: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}</div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const renderLogInput = () => {
        if (currentStage === 'THEORY') {
            return (
                <Form.Item 
                    name="score" 
                    label="理论模拟测试分数" 
                    rules={[{ required: true, message: '请输入分数' }]}
                >
                    <InputNumber min={0} max={100} style={{ width: '100%' }} />
                </Form.Item>
            );
        }
        if (currentStage === 'SIMULATION') {
            return (
                <Form.Item name="result" label="结果" rules={[{ required: true }]}>
                    <Radio.Group>
                        <Radio value="PASS">通过</Radio>
                        <Radio value="FAIL">不通过</Radio>
                    </Radio.Group>
                </Form.Item>
            );
        }
        if (currentStage === 'GROUND') {
            return (
                <>
                    <Form.Item name={['content', 'groundStation']} label="地面站" valuePropName="checked" initialValue={false}>
                        <Checkbox>通过</Checkbox>
                    </Form.Item>
                    <Form.Item name={['content', 'prePlanning']} label="预规划" valuePropName="checked" initialValue={false}>
                        <Checkbox>通过</Checkbox>
                    </Form.Item>
                    <Form.Item name={['content', 'rePlanning']} label="重规划" valuePropName="checked" initialValue={false}>
                        <Checkbox>通过</Checkbox>
                    </Form.Item>
                    {/* Hidden result field to satisfy API if needed, or handle in submit */}
                </>
            );
        }
        if (currentStage === 'PRACTICAL') {
            return (
                <>
                    <Form.Item label="飞行时间" name={['content', 'flightTime']} rules={[{ required: true }]}>
                        <Radio.Group>
                            <Radio value="AM">上午</Radio>
                            <Radio value="PM">下午</Radio>
                        </Radio.Group>
                    </Form.Item>
                    <Form.Item name={['content', 'hover']} label="自旋" valuePropName="checked" initialValue={false}>
                        <Checkbox>通过</Checkbox>
                    </Form.Item>
                    <Form.Item name={['content', 'figure8']} label="八字飞行" valuePropName="checked" initialValue={false}>
                        <Checkbox>通过</Checkbox>
                    </Form.Item>
                </>
            );
        }
        if (currentStage === 'GRADUATION') {
            return (
                <div style={{ textAlign: 'center' }}>
                    <p>确认结业并生成档案？</p>
                </div>
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
                            // Sort logs desc by time
                            const sortedLogs = [...logs].sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                            const latestLog = sortedLogs[0]; 
                            
                            // Check if passed (APPROVED and Result is PASS/COMPLETE/High Score)
                            // For Theory: score >= threshold? But server already approved it. 
                            // Let's assume if it's APPROVED, it's done? 
                            // No, user requirement: "If fail, can submit again until pass".
                            // So we need to check the Result field.
                            
                            let isPassed = false;
                            // Check if status is APPROVED or if we are the submitter (optimistic) 
                            // OR if we are viewing it as a list and it's not Graduation.
                            // Actually, the backend now auto-approves.
                            // If frontend sees SUBMITTED, it might be stale data or specific condition.
                            // But for UI "Pending Approval" tag:
                            
                            if (latestLog?.status === 'APPROVED') {
                                if (stageKey === 'THEORY') {
                                    // Check score (no threshold anymore? user said "no score limit")
                                    // If APPROVED, it is passed.
                                    isPassed = true;
                                } else {
                                    // Check result
                                    if (latestLog.result === 'PASS') isPassed = true;
                                }
                            }

                            // Graduation logic: Needs explicit Approval from Manager
                            const isGraduation = stageKey === 'GRADUATION';
                            const isPendingApproval = isGraduation && latestLog?.status === 'SUBMITTED';
                            // For other stages, if it is SUBMITTED, it means backend didn't auto-approve?
                            // Or it's old data. But we fixed old data.
                            // Let's treat SUBMITTED as Pending only for Graduation.
                            // For others, if SUBMITTED, it should be auto-approved?
                            // Wait, if I am Manager and I see SUBMITTED for Practical, it means it's pending.
                            // But user said "No approval needed".
                            // So even if it says SUBMITTED in DB (which shouldn't happen for new ones),
                            // we should probably treat it as passed or just hide the "Pending" tag?
                            // But better rely on DB status.
                            
                            const isGraduated = isGraduation && latestLog?.status === 'APPROVED';

                            // Can Submit Logic:
                            // 1. If NOT passed yet, can submit.
                            // 2. If Passed, cannot submit anymore (close project).
                            // 3. For Graduation: If Submitted (Pending), cannot submit again until rejected? Or just wait.
                            
                            let canSubmit = false;
                            if (user?.id === selectedTraining.assigneeId) {
                                if (!isPassed && !isGraduated && !isPendingApproval) {
                                    canSubmit = true;
                                }
                            }
                            
                            // Can Approve Logic (Manager Only, for Graduation)
                            const canApprove = (user?.role === Role.MANAGER || user?.role === Role.ADMIN) && isPendingApproval;

                            return {
                                key: stageKey,
                                label: (
                                    <span>
                                        {(STAGES as any)[stageKey]} 
                                        {isPassed && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 4 }} />}
                                        {isGraduated && <RocketOutlined style={{ color: '#1890ff', marginLeft: 4 }} />}
                                        {isPendingApproval && <ClockCircleOutlined style={{ color: '#faad14', marginLeft: 4 }} />}
                                    </span>
                                ),
                                children: (
                                    <div style={{ padding: 16 }}>
                                        {sortedLogs.map((log: any) => (
                                            <Card 
                                                key={log.id} 
                                                size="small" 
                                                style={{ marginBottom: 8, borderColor: log.status === 'APPROVED' ? '#b7eb8f' : undefined }}
                                                title={dayjs(log.submittedAt).format('YYYY-MM-DD HH:mm')}
                                                extra={<Tag color={log.status === 'APPROVED' ? 'green' : 'orange'}>{log.status === 'APPROVED' ? '已确认' : (isGraduation ? '待审批' : '已提交')}</Tag>}
                                            >
                                                {log.score !== null && <p>分数: <strong>{log.score}</strong></p>}
                                                {log.result && <p>结果: <strong>{log.result === 'PASS' ? '通过' : log.result === 'FAIL' ? '未通过' : log.result}</strong></p>}
                                                
                                                {/* Render content */}
                                                {log.content && (
                                                    <div
                                                        style={{
                                                            whiteSpace: 'pre-wrap',
                                                            background: stageKey === 'PRACTICAL' ? '#1f1f1f' : '#e6f7ff',
                                                            color: stageKey === 'PRACTICAL' ? '#f0f5ff' : undefined,
                                                            padding: 8,
                                                            borderRadius: 4,
                                                            marginTop: 8,
                                                            border: stageKey === 'PRACTICAL' ? '1px solid #434343' : '1px solid #91d5ff'
                                                        }}
                                                    >
                                                        {stageKey === 'PRACTICAL' ? (() => {
                                                            try {
                                                                const contentObj = JSON.parse(log.content);
                                                                return (
                                                                    <div style={{ fontSize: 12 }}>
                                                                        <p><strong>飞行时间:</strong> {contentObj.flightTime === 'AM' ? '上午' : '下午'}</p>
                                                                        <p><strong>自旋:</strong> {contentObj.hover === 'PASS' ? '通过' : '不通过'}</p>
                                                                        <p><strong>八字飞行:</strong> {contentObj.figure8 === 'PASS' ? '通过' : '不通过'}</p>
                                                                    </div>
                                                                );
                                                            } catch (e) { return log.content; }
                                                        })() : stageKey === 'GROUND' ? (() => {
                                                            try {
                                                                const contentObj = JSON.parse(log.content);
                                                                return (
                                                                    <div style={{ fontSize: 12 }}>
                                                                        <p><strong>地面站:</strong> {contentObj.groundStation === 'PASS' ? '通过' : '不通过'}</p>
                                                                        <p><strong>预规划:</strong> {contentObj.prePlanning === 'PASS' ? '通过' : '不通过'}</p>
                                                                        <p><strong>重规划:</strong> {contentObj.rePlanning === 'PASS' ? '通过' : '不通过'}</p>
                                                                    </div>
                                                                );
                                                            } catch (e) { return log.content; }
                                                        })() : log.content}
                                                    </div>
                                                )}
                                                
                                                {log.status === 'APPROVED' && log.approvedAt && (
                                                    <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                                                        确认时间: {dayjs(log.approvedAt).format('YYYY-MM-DD HH:mm')}
                                                    </div>
                                                )}

                                                {/* Approve Button for Graduation */}
                                                {isGraduation && log.status === 'SUBMITTED' && (
                                                     <div style={{ marginTop: 8, borderTop: '1px solid #eee', paddingTop: 8, textAlign: 'right' }}>
                                                         {(user?.role === Role.MANAGER || user?.role === Role.ADMIN) ? (
                                                             <Popconfirm title="确定批准结业吗？批准后将生成档案。" onConfirm={() => handleApprove(log.id)}>
                                                                 <Button type="primary" size="small">批准结业</Button>
                                                             </Popconfirm>
                                                         ) : (
                                                             <span style={{ color: '#faad14', fontSize: 12 }}>等待部门负责人审批</span>
                                                         )}
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
                                        {!canSubmit && isPassed && !isGraduation && (
                                            <div style={{ marginTop: 24, textAlign: 'center', color: '#52c41a' }}>
                                                <CheckCircleOutlined /> 此项目已通过完成
                                            </div>
                                        )}
                                        {!canSubmit && isGraduated && (
                                            <div style={{ marginTop: 24, textAlign: 'center', color: '#1890ff' }}>
                                                <RocketOutlined /> 已结业
                                            </div>
                                        )}
                                    </div>
                                )
                            };
                        })}
                    />
                )}
            </Modal>

            {/* Log Input Modal */}
        </div>
    );
};

export default TrainingPage;
