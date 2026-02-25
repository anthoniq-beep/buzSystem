import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, DatePicker, Select, InputNumber, Row, Col, Typography, message, Divider } from 'antd';
import dayjs from 'dayjs';

const { Title } = Typography;

const ContractPage = () => {
  const [form] = Form.useForm();
  const [contractNo, setContractNo] = useState('');

  useEffect(() => {
    // Generate Contract Number: CT-YYYYMMDD-Random
    const dateStr = dayjs().format('YYYYMMDD');
    const randomStr = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setContractNo(`CT-${dateStr}-${randomStr}`);
  }, []);

  const handleFinish = (values: any) => {
    console.log('Contract values:', values);
    message.success('合同生成成功（模拟）');
    // Here we would typically send data to backend or generate PDF
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2}>课程培训服务合同</Title>
          <p>合同编号: {contractNo}</p>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{
            contractDate: dayjs(),
          }}
        >
          <Title level={4}>一、学员信息</Title>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="studentName" label="学员姓名" rules={[{ required: true }]}>
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="phone" label="手机号" rules={[{ required: true, pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }]}>
                <Input placeholder="请输入手机号" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="idCard" label="身份证号" rules={[{ required: true, len: 18, message: '请输入18位身份证号' }]}>
                <Input placeholder="请输入身份证号" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={4}>二、课程信息</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="courseName" label="课程名称" rules={[{ required: true }]}>
                <Select placeholder="请选择课程">
                  <Select.Option value="Java全栈开发">Java全栈开发</Select.Option>
                  <Select.Option value="前端开发工程师">前端开发工程师</Select.Option>
                  <Select.Option value="Python数据分析">Python数据分析</Select.Option>
                  <Select.Option value="UI设计">UI设计</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="courseAmount" label="课程金额" rules={[{ required: true }]}>
                <InputNumber 
                  style={{ width: '100%' }} 
                  prefix="¥" 
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={4}>三、合同条款</Title>
          <div style={{ minHeight: 200, border: '1px dashed #d9d9d9', padding: 16, background: '#fafafa', marginBottom: 24 }}>
            <p style={{ color: '#999', textAlign: 'center', marginTop: 80 }}>
              （合同条款内容区域 - 待上传）
            </p>
          </div>

          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block>
              确认签约
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ContractPage;