import { useState, useEffect, useMemo } from 'react';
import { Card, Form, Input, Button, DatePicker, Select, InputNumber, Row, Col, Typography, message, Divider } from 'antd';
import dayjs from 'dayjs';

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

const CONTRACT_TEMPLATE = `
<h1 style="text-align: center;">合同预览测试</h1>
<p>合同编号：[合同编号]</p>
`;

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
      content = content.replace(/\[合同编号\]/g, contractNo || '________________');
      return content;
  }, [contractNo, formValues]);

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <Card title="Test Form" style={{ width: 400 }}>
        <Form form={form} onValuesChange={handleValuesChange}>
            <Form.Item name="test" label="Test"><Input /></Form.Item>
        </Form>
      </Card>
      <Card title="Preview" style={{ flex: 1 }}>
        <div dangerouslySetInnerHTML={{ __html: contractContent }} />
      </Card>
    </div>
  );
};

export default ContractPage;