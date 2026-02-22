import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, List, Avatar, App } from 'antd';
import { UserOutlined, RiseOutlined, TeamOutlined, DollarOutlined } from '@ant-design/icons';
import { Pie, Column } from '@ant-design/charts';
import api from '../services/api';
import dayjs from 'dayjs';

const AdminDashboard = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/customer');
      setCustomers(data);
    } catch (error) {
      message.error('获取客户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const customerColumns = [
    { title: '客户名称', dataIndex: 'name', key: 'name' },
    { title: '手机号', dataIndex: 'phone', key: 'phone' },
    { title: '渠道来源', dataIndex: ['source', 'name'], key: 'source' },
    { title: '负责人', dataIndex: ['owner', 'name'], key: 'owner' },
    { 
      title: '最后跟进', 
      dataIndex: 'lastContactAt', 
      key: 'lastContactAt',
      render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'
    },
  ];

  // Mock Data

  const stats = [
    { title: '总销售额', value: 1256000, prefix: '¥', icon: <DollarOutlined /> },
    { title: '本月新增客户', value: 128, suffix: '人', icon: <TeamOutlined /> },
    { title: '成交转化率', value: 15.4, suffix: '%', icon: <RiseOutlined /> },
    { title: '活跃销售', value: 32, suffix: '人', icon: <UserOutlined /> },
  ];

  const salesData = [
    { type: '1月', sales: 38 },
    { type: '2月', sales: 52 },
    { type: '3月', sales: 61 },
    { type: '4月', sales: 145 },
    { type: '5月', sales: 48 },
    { type: '6月', sales: 38 },
  ];

  const teamData = [
    { type: '销售一部', value: 27 },
    { type: '销售二部', value: 25 },
    { type: '销售三部', value: 18 },
    { type: '大客户部', value: 15 },
    { type: '渠道部', value: 10 },
    { type: '其他', value: 5 },
  ];

  const columnConfig = {
    data: salesData,
    xField: 'type',
    yField: 'sales',
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    meta: {
      type: {
        alias: '月份',
      },
      sales: {
        alias: '销售额',
      },
    },
  };

  const pieConfig = {
    appendPadding: 10,
    data: teamData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name} {percentage}',
    },
    meta: {
      value: {
        alias: '销售额',
      },
    },
  };

  const recentActivities = [
    { user: '张三', action: '签单成功', target: '某某科技公司', time: '10分钟前' },
    { user: '李四', action: '新增客户', target: '王总', time: '30分钟前' },
    { user: '王五', action: '跟进客户', target: '李经理', time: '1小时前' },
    { user: '赵六', action: '签单成功', target: '某某集团', time: '2小时前' },
  ];

  return (
    <div style={{ padding: '0 24px' }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {stats.map((stat, index) => (
          <Col span={6} key={index}>
            <Card variant="borderless" hoverable>
              <Statistic
                title={
                  <span>
                    <span style={{ marginRight: 8 }}>{stat.icon}</span>
                    {stat.title}
                  </span>
                }
                value={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="全员跟进情况" variant="borderless">
            <Table 
              dataSource={customers} 
              columns={customerColumns} 
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={16}>
          <Card title="销售趋势" variant="borderless" style={{ marginBottom: 24 }}>
             <Column {...columnConfig} height={300} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="部门业绩占比" variant="borderless" style={{ marginBottom: 24 }}>
            <Pie {...pieConfig} height={300} />
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col span={12}>
          <Card title="最新动态" variant="borderless">
            <List
              itemLayout="horizontal"
              dataSource={recentActivities}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar style={{ backgroundColor: '#1677ff' }}>{item.user[0]}</Avatar>}
                    title={<span>{item.user} <Tag color="green">{item.action}</Tag></span>}
                    description={`${item.target} - ${item.time}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="代办事项" variant="borderless">
             <p>待审核回款 (3)</p>
             <p>待审批合同 (5)</p>
             <p>即将到期公海客户 (12)</p>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;
