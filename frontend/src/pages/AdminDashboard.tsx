import { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, App } from 'antd';
import { Column } from '@ant-design/charts';
import api from '../services/api';
import dayjs from 'dayjs';

const AdminDashboard = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalTarget: 0, totalActual: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/stats/admin');
        const rawData = res.data || [];
        
        const chartData: any[] = [];
        let totalTarget = 0;
        let totalActual = 0;

        rawData.forEach((item: any) => {
             chartData.push({ month: item.month, type: '销售目标', value: Number(item.target) });
             chartData.push({ month: item.month, type: '实际签约', value: Number(item.actual) });
             totalTarget += Number(item.target);
             totalActual += Number(item.actual);
        });
        setData(chartData);
        setStats({ totalTarget, totalActual });
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const config = {
    data,
    xField: 'month',
    yField: 'value',
    seriesField: 'type',
    isGroup: true,
    columnStyle: {
      radius: [4, 4, 0, 0],
    },
    label: {
        position: 'middle',
        style: { fill: '#FFFFFF', opacity: 0.6 }
    },
    color: ['#1890ff', '#52c41a'],
  };

  const completionRate = stats.totalTarget ? (stats.totalActual / stats.totalTarget * 100).toFixed(2) : 0;

  return (
    <div>
      <h2>管理仪表盘</h2>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="年度总目标" value={stats.totalTarget} prefix="¥" precision={2} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="年度实际签约" value={stats.totalActual} prefix="¥" precision={2} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="年度完成率" value={completionRate} suffix="%" precision={2} />
          </Card>
        </Col>
      </Row>

      <Card title="近12个月销售趋势" loading={loading}>
        <Column {...config} />
      </Card>
    </div>
  );
};

export default AdminDashboard;
