import { useState, useEffect, useMemo } from 'react';
import { Card, Form, Input, Button, DatePicker, Select, InputNumber, Row, Col, Typography, App, Divider, Space } from 'antd';
import dayjs from 'dayjs';
import api from '../services/api';
import { CONTRACT_TEMPLATE } from '../constants/contractTemplate';

const { Title } = Typography;

const COURSE_STD_PRICES: Record<string, number> = {
  '小型视距内': 7000,
  '小型超视距': 9000,
  '中型视距内': 8000,
  '中型超视距': 12000,
  '教员': 19500
};

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
  const { message, modal } = App.useApp(); // Use App.useApp() hook
  const [form] = Form.useForm();
  const [contractNo, setContractNo] = useState('');
  const [formValues, setFormValues] = useState<any>({});
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [coursePrices, setCoursePrices] = useState<Record<string, number>>({});
  const [instructors, setInstructors] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    const dateStr = dayjs().format('YYYYMMDD');
    const randomStr = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setContractNo(`${dateStr}${randomStr}`);
    
    // Fetch customers for selection
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
      try {
          const res = await api.get('/customers');
          // Only show customers owned by user (or all if admin, but typically sign for own leads)
          setCustomers(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
          console.error('Failed to fetch customers');
          setCustomers([]);
      }
  };

  const handleValuesChange = (changedValues: any, allValues: any) => {
      setFormValues(allValues);
      
      // Handle Customer Selection
      if (changedValues.customerId) {
          const customer = customers.find(c => c.id === changedValues.customerId);
          if (customer) {
              form.setFieldsValue({
                  studentName: customer.name,
                  phone: customer.phone,
                  // idCard: customer.idCard // If we had it
              });
              // Update formValues manually because setFieldsValue doesn't trigger onValuesChange
              setFormValues(prev => ({ ...prev, studentName: customer.name, phone: customer.phone }));
          }
      }
      
      // Handle Course Selection
      if (changedValues.courseName) {
          const courses = changedValues.courseName;
          setSelectedCourses(courses);
          
          // Init prices for new courses if not set
          const newPrices = { ...coursePrices };
          courses.forEach((c: string) => {
              if (newPrices[c] === undefined) {
                  newPrices[c] = COURSE_STD_PRICES[c] || 0;
              }
          });
          setCoursePrices(newPrices);
          
          // Update form fields for prices
          const fields = courses.reduce((acc: any, c: string) => {
              acc[`price_${c}`] = newPrices[c];
              return acc;
          }, {});
          form.setFieldsValue(fields);
      }
      
      // Handle Price Change
      Object.keys(changedValues).forEach(key => {
          if (key.startsWith('price_')) {
              const course = key.replace('price_', '');
              setCoursePrices(prev => ({ ...prev, [course]: changedValues[key] }));
          }
      });
  };

  const contractContent = useMemo(() => {
      let content = CONTRACT_TEMPLATE;
      
      const wrapBlue = (text: string) => `<span style="color: #1677ff; font-weight: bold; padding: 0 4px;">${text}</span>`;
      const placeholder = (text: string) => `<span style="color: #ccc;">${text}</span>`;

      // Replace placeholders
      content = content.replace(/\[合同编号\]/g, wrapBlue(contractNo || '________________'));
      content = content.replace(/\[学员姓名\]/g, formValues.studentName ? wrapBlue(formValues.studentName) : placeholder('(学员姓名)'));
      content = content.replace(/\[身份证号\]/g, formValues.idCard ? wrapBlue(formValues.idCard) : placeholder('(身份证号)'));
      content = content.replace(/\[手机号\]/g, formValues.phone ? wrapBlue(formValues.phone) : placeholder('(手机号)'));
      
      const today = dayjs().format('YYYY年MM月DD日');
      const endDate = dayjs().add(1, 'year').format('YYYY年MM月DD日');
      content = content.replace(/\[today\]/g, wrapBlue(today));
      content = content.replace(/\[end_date\]/g, wrapBlue(endDate));
      
      // Generate Course Rows
      let courseRows = '';
      let totalPrice = 0;
      
      if (selectedCourses.length > 0) {
          content = content.replace(/\[课程名称\]/g, wrapBlue(selectedCourses.join('、'))); // For text description
          
          selectedCourses.forEach(course => {
              const stdPrice = COURSE_STD_PRICES[course] || 0;
              const actualPrice = coursePrices[course] || stdPrice;
              totalPrice += actualPrice;
              
              courseRows += `
              <tr>
                <td>${wrapBlue(course)}</td>
                <td>${wrapBlue(`¥${stdPrice}`)}</td>
                <td>${wrapBlue(`¥${actualPrice}`)}</td>
                <td>0</td>
                <td>${wrapBlue(`¥${actualPrice}`)}</td>
                <td></td>
              </tr>`;
          });
      } else {
          content = content.replace(/\[课程名称\]/g, placeholder('(课程名称)'));
          courseRows = `
              <tr>
                <td>${placeholder('(课程名称)')}</td>
                <td>${placeholder('(课程单价)')}</td>
                <td>${placeholder('(合同单价)')}</td>
                <td>0</td>
                <td>${placeholder('(金额)')}</td>
                <td></td>
              </tr>`;
      }
      
      content = content.replace('[课程列表行]', courseRows);
      
      content = content.replace(/\[总金额\]/g, wrapBlue(`¥${totalPrice}`));
      content = content.replace(/\[总金额大写\]/g, wrapBlue(digitUppercase(totalPrice)));
      
      return content;
  }, [contractNo, formValues, selectedCourses, coursePrices]);

  const handleFinish = async (values: any) => {
    console.log('Contract Form Values:', values); // Debug Log 1

    // Collect prices
    const prices = selectedCourses.map(c => ({
        course: c,
        price: values[`price_${c}`]
    }));
    
    // Calculate total contract amount
    const totalAmount = prices.reduce((sum, item) => sum + (item.price || 0), 0);
    console.log('Calculated Total:', totalAmount); // Debug Log 2

    try {
        // Prepare Payload
        const payload: any = {
            name: values.studentName,
            phone: values.phone,
            courseType: 'CAAC',
            courseName: selectedCourses.join(','),
            contractAmount: totalAmount,
            status: 'DEAL' // Auto-move to DEAL
        };
        console.log('Sending Payload:', payload); // Debug Log 3

        if (values.customerId) {
             console.log('Updating customer:', values.customerId);
             // Update existing customer
             await api.put(`/customers/${values.customerId}`, payload);
        } else {
             console.log('Creating new customer');
             // Create new
             await api.post('/customers', payload);
        }
        
        console.log('API Success, showing modal'); // Debug Log 4

        // Show Modal instead of simple message
        modal.success({
            title: '签约成功',
            content: '恭喜签约成功！已自动更新客户档案及教培记录。',
            okText: '知道了',
        });
        
    } catch (error: any) {
        console.error('Contract sign error:', error);
        console.error('Error Response:', error.response); // Debug Log 5
        message.error(error.response?.data?.message || '签约失败，请重试');
    }
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
          onFinishFailed={(errorInfo) => {
              console.log('Failed:', errorInfo);
              message.error('请检查表单填写是否完整（如：身份证号、手机号格式等）');
          }}
          onValuesChange={handleValuesChange}
          initialValues={{
            contractDate: dayjs(),
          }}
        >
          <Form.Item name="customerId" label="选择客户" rules={[{ required: true }]}>
             <Select 
                 showSearch
                 placeholder="搜索客户姓名"
                 optionFilterProp="children"
                 onChange={(val) => {
                     const customer = customers.find(c => c.id === val);
                     if (customer) {
                         form.setFieldsValue({
                             studentName: customer.name,
                             phone: customer.phone
                         });
                         // Force update formValues state for template rendering
                         setFormValues((prev: any) => ({ 
                             ...prev, 
                             studentName: customer.name, 
                             phone: customer.phone 
                         }));
                     }
                 }}
             >
                 {customers.map(c => (
                     <Select.Option key={c.id} value={c.id}>{c.name} - {c.phone}</Select.Option>
                 ))}
             </Select>
          </Form.Item>

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
            <Select mode="multiple" placeholder="请选择课程">
              <Select.Option value="小型视距内">小型视距内</Select.Option>
              <Select.Option value="小型超视距">小型超视距</Select.Option>
              <Select.Option value="中型视距内">中型视距内</Select.Option>
              <Select.Option value="中型超视距">中型超视距</Select.Option>
              <Select.Option value="教员">教员</Select.Option>
            </Select>
          </Form.Item>
          
          {selectedCourses.length > 0 && (
              <div style={{ background: '#001529', padding: '12px', borderRadius: '8px', marginBottom: '24px' }}>
                  <p style={{ marginBottom: '12px', fontWeight: 'bold', color: 'white' }}>合同单价</p>
                  {selectedCourses.map(course => (
                      <Form.Item 
                          key={course} 
                          name={`price_${course}`} 
                          label={<span style={{ color: 'white' }}>{`${course} 合同单价`}</span>}
                          rules={[{ required: true }]}
                          initialValue={COURSE_STD_PRICES[course]}
                      >
                        <InputNumber 
                          style={{ width: '100%' }} 
                          prefix="¥" 
                          formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                        />
                      </Form.Item>
                  ))}
              </div>
          )}

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
                color: '#000', // Ensure text is black
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