import { useState, useEffect, useMemo } from 'react';
import { Card, Form, Input, Button, DatePicker, Select, InputNumber, Row, Col, Typography, message, Divider, Space } from 'antd';
import dayjs from 'dayjs';
import { CONTRACT_TEMPLATE } from '../constants/contractTemplate';

const { Title } = Typography;

function digitUppercase(n: number) {
    if (n === undefined || n === null) return '';
    const fraction = ['角', '分'];
    const digit = [
        '零', '壹', '贰', '叁', '肆',
        '伍', '陆', '柒', '捌', '玖'
    ];
    const unit = [
        ['元', '万', '亿'],
        ['', '拾', '佰', '仟']
    ];
    const head = n < 0 ? '欠' : '';
    n = Math.abs(n);
    let s = '';
    for (let i = 0; i < fraction.length; i++) {
        s += (digit[Math.floor(n * 10 * Math.pow(10, i)) % 10] + fraction[i]).replace(/零./, '');
    }
    s = s || '整';
    n = Math.floor(n);
    for (let i = 0; i < unit[0].length && n > 0; i++) {
        let p = '';
        for (let j = 0; j < unit[1].length && n > 0; j++) {
            p = digit[n % 10] + unit[1][j] + p;
            n = Math.floor(n / 10);
        }
        s = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + s;
    }
    return head + s.replace(/(零.)*零元/, '元')
        .replace(/(零.)+/g, '零')
        .replace(/^整$/, '零元整');
}

const ContractPage = () => {
  const [form] = Form.useForm();
  const [contractNo, setContractNo] = useState('');
  const [formValues, setFormValues] = useState<any>({});

  useEffect(() => {
    const dateStr = dayjs().format('YYYYMMDD');
    const randomStr = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setContractNo(`${dateStr}${randomStr}`);
  }, []);

  const handleValuesChange = (_: any, allValues: any) => {
      setFormValues(allValues);
  };

  const contractContent = useMemo(() => {
      let content = CONTRACT_TEMPLATE;
      // Replace placeholders
      content = content.replace(/\[合同编号\]/g, contractNo || '________________');
      content = content.replace(/\[学员姓名\]/g, formValues.studentName || '<span style="color: #ccc;">(学员姓名)</span>');
      content = content.replace(/\[身份证号\]/g, formValues.idCard || '<span style="color: #ccc;">(身份证号)</span>');
      content = content.replace(/\[手机号\]/g, formValues.phone || '<span style="color: #ccc;">(手机号)</span>');
      
      const today = dayjs().format('YYYY年MM月DD日');
      const endDate = dayjs().add(1, 'year').format('YYYY年MM月DD日');
      content = content.replace(/\[today\]/g, today);
      content = content.replace(/\[end_date\]/g, endDate);
      
      content = content.replace(/\[课程名称\]/g, formValues.courseName || '<span style="color: #ccc;">(课程名称)</span>');
      
      const price = formValues.courseAmount ? `¥${formValues.courseAmount}` : '<span style="color: #ccc;">(金额)</span>';
      // Global replace for price (multiple occurrences)
      content = content.split('[课程价格]').join(price);
      content = content.split('[合同单价]').join(price);
      
      const priceUpper = formValues.courseAmount ? digitUppercase(formValues.courseAmount) : '________________';
      content = content.replace(/\[合同单价大写\]/g, priceUpper);
      
      return content;
  }, [contractNo, formValues]);

  const handleFinish = (values: any) => {
    console.log('Contract values:', values);
    message.success('合同生成成功（模拟）');
  };

  const handlePrint = () => {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>合同打印</title>
                <style>
                  body { font-family: SimSun, serif; padding: 40px; }
                  table { border-collapse: collapse; width: 100%; }
                  th, td { border: 1px solid black; padding: 8px; text-align: center; }
                  @media print {
                    @page { margin: 20mm; }
                  }
                </style>
              </head>
              <body>
                ${contractContent}
              </body>
            </html>
          `);
          printWindow.document.close();
          // Wait for images/styles to load
          setTimeout(() => {
              printWindow.print();
          }, 500);
      }
  };

  return (
    <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 120px)' }}>
      {/* Left: Form */}
      <Card style={{ width: 400, overflowY: 'auto' }} title="填写合同信息">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          onValuesChange={handleValuesChange}
          initialValues={{
            contractDate: dayjs(),
          }}
        >
          <Form.Item name="studentName" label="学员姓名" rules={[{ required: true }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true, pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }]}>
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="idCard" label="身份证号" rules={[{ required: true, len: 18, message: '请输入18位身份证号' }]}>
            <Input placeholder="请输入身份证号" />
          </Form.Item>
          
          <Divider />
          
          <Form.Item name="courseName" label="课程名称" rules={[{ required: true }]}>
            <Select placeholder="请选择课程">
              <Select.Option value="民用无人驾驶航空器操控员执照培训">民用无人驾驶航空器操控员执照培训</Select.Option>
              <Select.Option value="行业应用培训">行业应用培训</Select.Option>
              <Select.Option value="青少年无人机科普">青少年无人机科普</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="courseAmount" label="课程金额" rules={[{ required: true }]}>
            <InputNumber 
              style={{ width: '100%' }} 
              prefix="¥" 
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value!.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Space style={{ width: '100%' }} direction="vertical">
                <Button type="primary" htmlType="submit" block>
                确认签约
                </Button>
                <Button block onClick={handlePrint}>
                打印预览
                </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Right: Preview */}
      <Card style={{ flex: 1, overflowY: 'auto', background: '#fff' }} title="合同预览">
        <div 
            style={{ 
                padding: '40px', 
                background: 'white', 
                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                minHeight: '100%',
                fontFamily: 'SimSun, serif' // Songti for contract look
            }}
            dangerouslySetInnerHTML={{ __html: contractContent }}
        />
      </Card>
    </div>
  );
};

export default ContractPage;