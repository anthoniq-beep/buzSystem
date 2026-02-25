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
<h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 8px;">上海空域领航航空科技有限公司</h1>
<h2 style="text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 24px;">民用无人驾驶航空器操控员执照培训合同</h2>

<div style="margin-bottom: 24px;">
  <p><strong>合同编号</strong>：空域领航【2026】[合同编号]</p>
</div>

<div style="display: flex; justify-content: space-between;">
  <div style="width: 48%;">
    <p><strong>甲方（学员）</strong>：[学员姓名]</p>
    <p><strong>身份证号</strong>：[身份证号]</p>
    <p><strong>联系电话</strong>：[手机号]</p>
  </div>
  <div style="width: 48%;">
    <p><strong>乙方（培训机构）</strong>：上海空域领航航空科技有限公司</p>
    <p><strong>统一社会信用代码</strong>：91310117MAEGK0807Y</p>
    <p><strong>签订日期</strong>：[today]</p>
    <p><strong>签订地址</strong>：上海市</p>
  </div>
</div>

<hr style="margin: 24px 0; border: 0; border-top: 1px solid #eee;" />

<p style="text-indent: 2em; line-height: 1.8;">根据《中华人民共和国民法典》及其他有关法律、行政法规规定，本着公平、公正、自愿、诚实信用的原则，经双方协商一致，就民用无人驾驶航空器操控员执照培训合同事宜，达成如下协议：</p>

<h3 style="font-size: 16px; font-weight: bold; margin: 16px 0;">一、合同内容</h3>
<p style="line-height: 1.8;">1. 甲方或甲方学员自愿接受乙方的培训服务，参加<strong>[课程名称]</strong>课程的培训。</p>
<p style="line-height: 1.8;">2. 乙方是经过中国民用航空局CAAC授权CATA协会审定合格的培训机构，具备甲方要求提供的培训课程的办学资质。</p>
<p style="line-height: 1.8;">3. 甲方已经对乙方提供的课程、师资、教材、学习时间、学习形式、结业成果形式、收费、退费等有关事项进行详细咨询，并表示认可；乙方也了解甲方参加培训的目的和要求。</p>
<p style="line-height: 1.8;">4. 甲、乙双方共同签订的培训合同，作为双方今后解决争议纠纷的依据。</p>

<h3 style="font-size: 16px; font-weight: bold; margin: 16px 0;">二、合同方案</h3>
<table border="1" cellspacing="0" cellpadding="8" style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 16px;">
  <tr style="background-color: #f5f5f5;">
    <th>名称</th>
    <th>课程单价</th>
    <th>合同单价</th>
    <th>其他费用</th>
    <th>金额</th>
    <th>备注</th>
  </tr>
  <tr>
    <td>[课程名称]</td>
    <td>[课程价格]</td>
    <td>[合同单价]</td>
    <td>0</td>
    <td>[合同单价]</td>
    <td></td>
  </tr>
</table>

<h3 style="font-size: 16px; font-weight: bold; margin: 16px 0;">三、支付方式</h3>
<p style="line-height: 1.8;">1. 培训费用总金额：人民币<strong>[合同单价]</strong>元 （大写：<strong>[合同单价大写]</strong>）。</p>
<p style="line-height: 1.8;">2. 费用支付方式为：本合同签订之日起3个工作日内，甲方向乙方支付合同全部款项。</p>
<p style="line-height: 1.8;">支付方式：□对公转账 □扫码支付 □小程序支付 □现金</p>
<p style="line-height: 1.8;">乙方银行账户名称：上海空域领航航空科技有限公司</p>
<p style="line-height: 1.8;">开户行：中国建设银行股份有限公司上海广富林路支行</p>
<p style="line-height: 1.8;">银行账户：3105 0180 4800 0000 2779</p>

<h3 style="font-size: 16px; font-weight: bold; margin: 16px 0;">四、合同期限及培训期限</h3>
<p style="line-height: 1.8;">1. 本合同期限及培训期限自 <strong>[today]</strong> 至 <strong>[end_date]</strong> 止。</p>

<h3 style="font-size: 16px; font-weight: bold; margin: 16px 0;">五、甲方权利和义务</h3>
<p style="line-height: 1.8;">1. 甲方或甲方学员办理完成入学手续，甲方或甲方学员即开始进行相关课程的培训。</p>
<p style="line-height: 1.8;">2. 完成办理入学手续的当日，乙方指导甲方或甲方学员约课并进行相应的课程培训。</p>
<p style="line-height: 1.8;">3. 上课时间经甲方或甲方学员与乙方共同确认后由甲方或甲方学员自行在约课系统里约课，甲方或甲方学员按照约课系统操作要求进行课程预约、取消或更改。对于已约课的课程，甲方或甲方学员如未能来上课需在课程开始前一天17点整（前16小时）之前在系统上申请取消或更改，否则视为学员已上课，消耗完预约的课程。</p>
<p style="line-height: 1.8;">4. 如课程中有特殊约课规则与以上规则冲突，以课程约课规则为准。</p>
<p style="line-height: 1.8;">5. 甲方或甲方学员应服从乙方管理，遵守乙方各项规章制度。甲方或甲方学员违反乙方的各项规章制度，给乙方第三方造成损失的，甲方学员应赔偿乙方或第三方的经济损失。</p>
<p style="line-height: 1.8;">6. 甲方或甲方学员提供的学员证件及相关信息必须真实有效，乙方依据甲方或甲方学员提供的学员档案提供培训服务及安排考试。</p>
<p style="line-height: 1.8;">7. 未经乙方书面同意，甲方或甲方学员不得擅自将本合同课程转让给第三方。</p>
<p style="line-height: 1.8;">8. 未经乙方书面同意，甲方或甲方学员应对本合同内容保密。</p>
<p style="line-height: 1.8;">9. 甲方或甲方学员应当尊重乙方的知识产权，未经乙方同意，甲方或甲方学员不得对课堂教学过程进行录音、录像。</p>

<h3 style="font-size: 16px; font-weight: bold; margin: 16px 0;">六、乙方权利和义务</h3>
<p style="line-height: 1.8;">1. 乙方应按照本协议及附件的约定向甲方或甲方学员提供无人机培训服务。</p>
<p style="line-height: 1.8;">2. 乙方承诺具备民航无人机驾驶员执照培训资质并按照中国民用航空局授权AOPA协会审定合格的教学大纲对学员进行培训。</p>
<p style="line-height: 1.8;">3. 乙方在甲方或甲方学员完成培训后为其预约考试。</p>
<p style="line-height: 1.8;">4. 预约考试时甲方或甲方学员应仔细核对报考信息。</p>
<p style="line-height: 1.8;">5. 乙方应按照《教学大纲》和课程预约制定教学计划。</p>
<p style="line-height: 1.8;">6. 乙方教练员不得以任何方式或理由收取甲方或甲方学员的钱物。</p>
<p style="line-height: 1.8;">7. 在培训、考试期间，非因乙方原因而出现的一切意外，乙方对此不承担任何责任。</p>

<h3 style="font-size: 16px; font-weight: bold; margin: 16px 0;">七、违约责任</h3>
<p style="line-height: 1.8;">1. 本合同签订后，甲方或甲方学员未办理入学手续时，甲方或甲方学员因自身原因要求终止合同，乙方有权要求甲方按照本合同培训金额的10%支付违约金。</p>
<p style="line-height: 1.8;">2. 本合同签订后，甲方或甲方学员办理完成入学手续尚未开始进行课程培训时，甲方或甲方学员因自身原因要求终止合同，乙方有权要求甲方按照本合同培训金额的30%支付违约金。</p>
<p style="line-height: 1.8;">3. 本合同签订后，甲方或甲方学员办理完成入学手续并开始进行课程培训，甲方或甲方学员因自身原因要求终止合同，乙方有权要求甲方按照本合同培训金额的30%支付违约金。</p>
<p style="line-height: 1.8;">4. 本合同期间，因乙方原因未能按约定提供本合同项目下培训及服务的，甲方有权解除合同并要求乙方退还未完成课时部分的培训费。</p>
<p style="line-height: 1.8;">5. 不可抗力条款：因不可抗力事件导致无法履行合同的，双方互不承担违约责任。</p>

<h3 style="font-size: 16px; font-weight: bold; margin: 16px 0;">八、其他</h3>
<p style="line-height: 1.8;">1. 因本协议引起的任何纠纷，双方协商解决。经甲乙双方协商仍无法解决的，任何一方均可向乙方所在地人民法院提起诉讼。</p>
<p style="line-height: 1.8;">2. 本合同一式贰份，双方签字或盖章后生效，甲方持壹份，乙方持壹份，具有同等法律效力。</p>

<div style="display: flex; justify-content: space-between; margin-top: 60px; margin-bottom: 40px;">
  <div style="width: 45%;">
    <p><strong>甲方（签字/盖章）：</strong></p>
    <br/><br/>
    <p>日期：______年___月___日</p>
  </div>
  <div style="width: 45%;">
    <p><strong>乙方（签字/盖章）：</strong></p>
    <p>法定代表人或授权人签字：</p>
    <br/>
    <p>日期：______年___月___日</p>
  </div>
</div>
`;

const ContractPage = () => {
  const [form] = Form.useForm();
  const [contractNo, setContractNo] = useState('');
  const [formValues, setFormValues] = useState<any>({});

  useEffect(() => {
    // Generate Contract Number: CT-YYYYMMDD-Random
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
      // For simplicity, course price = contract price
      const price = formValues.courseAmount ? `¥${formValues.courseAmount}` : '<span style="color: #ccc;">(金额)</span>';
      content = content.replace(/\[课程价格\]/g, price);
      content = content.replace(/\[合同单价\]/g, price);
      
      const priceUpper = formValues.courseAmount ? digitUppercase(formValues.courseAmount) : '________________';
      content = content.replace(/\[合同单价大写\]/g, priceUpper);
      
      return content;
  }, [contractNo, formValues]);

  const handleFinish = (values: any) => {
    console.log('Contract values:', values);
    message.success('合同生成成功（模拟）');
    // Here we would typically send data to backend or generate PDF
    // For printing: window.print() could be used if we hide other elements
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
                </style>
              </head>
              <body>
                ${contractContent}
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
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