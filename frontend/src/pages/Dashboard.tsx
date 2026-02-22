import { useEffect, useState } from 'react';
import { Card, Table, Tag, App, Progress, Statistic, Row, Col, DatePicker } from 'antd';
import { DollarOutlined, TeamOutlined, RiseOutlined, FileDoneOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const Dashboard = () => {
  const { message } = App.useApp();
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs());

  useEffect(() => {
    fetchStats();
  }, [selectedMonth]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const monthStr = selectedMonth.format('YYYY-MM');
      const response = await api.get('/stats/team', { params: { month: monthStr } });
      setStats(response.data);
    } catch (error) {
      console.error('Fetch stats error:', error);
      if (import.meta.env.DEV) {
          // Mock data
          const mockStats = [
              { id: 1, name: '张三', role: '销售经理', leadCount: 10, chanceCount: 5, callCount: 8, touchCount: 3, dealCount: 2, contractAmount: 50000, targetAmount: 100000, completionRate: 50 },
              { id: 2, name: '李四', role: '销售顾问', leadCount: 15, chanceCount: 8, callCount: 10, touchCount: 5, dealCount: 3, contractAmount: 75000, targetAmount: 80000, completionRate: 93.75 },
          ];
          setStats(mockStats);
          message.success('开发模式：使用模拟数据');
          return;
      }
      message.error('获取团队数据失败');
    } finally {
      setLoading(false);
    }
  };

  const totalSales = stats.reduce((sum, item) => sum + Number(item.contractAmount || 0), 0);
  const totalDeals = stats.reduce((sum, item) => sum + Number(item.dealCount || 0), 0);
  const totalLeads = stats.reduce((sum, item) => sum + Number(item.leadCount || 0), 0);
  const totalTarget = stats.reduce((sum, item) => sum + Number(item.targetAmount || 0), 0);
  const completionRate = totalTarget ? (totalSales / totalTarget) * 100 : 0;

  const summaryCards = [
      { title: '月总销售额', value: totalSales, prefix: '¥', icon: <DollarOutlined /> },
      { title: '月新增线索', value: totalLeads, suffix: '条', icon: <TeamOutlined /> },
      { title: '月签约数', value: totalDeals, suffix: '单', icon: <FileDoneOutlined /> },
      { title: '整体完成率', value: completionRate, suffix: '%', precision: 1, icon: <RiseOutlined /> },
  ];

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <Tag color="blue">{record.role}</Tag>
        </div>
      )
    },
    {
      title: '本月线索',
      dataIndex: 'leadCount',
      key: 'leadCount',
      sorter: (a: any, b: any) => a.leadCount - b.leadCount,
    },
    {
      title: '本月客资',
      dataIndex: 'chanceCount',
      key: 'chanceCount',
      sorter: (a: any, b: any) => a.chanceCount - b.chanceCount,
    },
    {
      title: '本月约访',
      dataIndex: 'callCount',
      key: 'callCount',
      sorter: (a: any, b: any) => a.callCount - b.callCount,
    },
    {
      title: '本月接待',
      dataIndex: 'touchCount',
      key: 'touchCount',
      sorter: (a: any, b: any) => a.touchCount - b.touchCount,
    },
    {
      title: '本月签约',
      dataIndex: 'dealCount',
      key: 'dealCount',
      sorter: (a: any, b: any) => a.dealCount - b.dealCount,
    },
    {
      title: '完成金额',
      dataIndex: 'contractAmount',
      key: 'contractAmount',
      render: (val: number) => `¥${val.toLocaleString()}`,
      sorter: (a: any, b: any) => a.contractAmount - b.contractAmount,
    },
    {
      title: '当月计划',
      dataIndex: 'targetAmount',
      key: 'targetAmount',
      render: (val: number) => val ? `¥${val.toLocaleString()}` : '-',
    },
    {
      title: '完成率',
      dataIndex: 'completionRate',
      key: 'completionRate',
      render: (val: number) => (
        <Progress percent={val} size="small" status={val >= 100 ? 'success' : 'active'} />
      ),
      sorter: (a: any, b: any) => a.completionRate - b.completionRate,
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>团队工作台</h2>
        <DatePicker 
            picker="month" 
            value={selectedMonth} 
            onChange={(val) => val && setSelectedMonth(val)} 
            allowClear={false}
        />
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        {summaryCards.map((stat, index) => (
          <Col span={6} key={index}>
            <Card bordered={false} hoverable>
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
                precision={stat.precision}
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
        ))}
      </Row>
      
      <Card bordered={false} styles={{ body: { padding: 0 } }}>
        <Table 
            columns={columns} 
            dataSource={stats} 
            rowKey="id" 
            loading={loading}
            pagination={false}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
