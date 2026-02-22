import { useRef, useState } from 'react';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, App, Modal, Form, Input, InputNumber, Select, Tag, Popconfirm } from 'antd';
import api from '../../services/api';

type ChannelItem = {
  id: number;
  name: string;
  type: 'COMPANY' | 'INDIVIDUAL';
  points: number;
  cost: number;
  isActive: boolean;
  createdAt: string;
};

const ChannelPage = () => {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<ChannelItem | null>(null);
  const [form] = Form.useForm();

  const handleEdit = (record: ChannelItem) => {
    setCurrentRow(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/channel/${id}`);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleFinish = async (values: any) => {
    try {
      const data = {
        ...values,
        points: Number(values.points || 0),
        cost: Number(values.cost || 0),
      };
      
      if (currentRow) {
        await api.patch(`/channel/${currentRow.id}`, data);
        message.success('更新成功');
      } else {
        await api.post('/channel', data);
        message.success('创建成功');
      }
      setIsModalOpen(false);
      form.resetFields();
      setCurrentRow(null);
      actionRef.current?.reload();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns: ProColumns<ChannelItem>[] = [
    {
      title: '渠道名称',
      dataIndex: 'name',
      copyable: true,
      formItemProps: {
        rules: [{ required: true, message: '此项为必填项' }],
      },
    },
    {
      title: '渠道类型',
      dataIndex: 'type',
      valueEnum: {
        COMPANY: { text: '公司渠道', status: 'Processing' },
        INDIVIDUAL: { text: '个人渠道', status: 'Success' },
      },
    },
    {
      title: '渠道点数',
      dataIndex: 'points',
      valueType: 'digit',
      fieldProps: { precision: 2 },
    },
    {
      title: '渠道费用',
      dataIndex: 'cost',
      valueType: 'money',
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      valueType: 'select',
      valueEnum: {
        true: { text: '启用', status: 'Success' },
        false: { text: '禁用', status: 'Error' },
      },
      hideInForm: true, // Assuming default active on create
      render: (_, record) => (
        <Tag color={record.isActive ? 'green' : 'red'}>
          {record.isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInForm: true,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => [
        <Button 
          key="edit" 
          type="link" 
          icon={<EditOutlined />} 
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>,
        <Popconfirm
          key="delete"
          title="确定删除吗?"
          onConfirm={() => handleDelete(record.id)}
        >
          <Button type="text" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <>
      <ProTable<ChannelItem>
        headerTitle="渠道管理"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Button
            key="button"
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => {
              setCurrentRow(null);
              form.resetFields();
              setIsModalOpen(true);
            }}
          >
            新建渠道
          </Button>,
        ]}
        request={async (params) => {
          // Assuming API supports params, but for now fetching all and filtering client side if needed
          // Or just fetch all since we implemented findAll without params
          const { data } = await api.get('/channel');
          return {
            data: data,
            success: true,
          };
        }}
        columns={columns}
      />

      <Modal
        title={currentRow ? '编辑渠道' : '新建渠道'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item name="name" label="渠道名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="渠道类型" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="COMPANY">公司渠道</Select.Option>
              <Select.Option value="INDIVIDUAL">个人渠道</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="points" label="渠道点数">
            <InputNumber style={{ width: '100%' }} precision={2} />
          </Form.Item>
          <Form.Item name="cost" label="渠道费用">
            <InputNumber style={{ width: '100%' }} prefix="¥" precision={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ChannelPage;
