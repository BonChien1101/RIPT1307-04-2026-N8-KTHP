import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message, Popconfirm, Statistic, Row, Col } from 'antd';
import { DollarOutlined, PlusOutlined, CheckOutlined, WarningOutlined } from '@ant-design/icons';

interface Penalty {
  id: number;
  user_id: number;
  user_name?: string;
  borrow_request_id?: number;
  amount: number;
  reason: string;
  paid: boolean;
  created_at: string;
}

interface PenaltiesPageProps {
  apiUrl: string;
}

const PenaltiesPage: React.FC<PenaltiesPageProps> = ({ apiUrl }) => {
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const token = localStorage.getItem('token');

  const fetchPenalties = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/penalties`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setPenalties(data?.data || []);
      }
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchPenalties(); }, []);

  const handleMarkPaid = async (id: number) => {
    try {
      const res = await fetch(`${apiUrl}/penalties/${id}/pay`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        message.success('Đã đánh dấu thanh toán!');
        fetchPenalties();
      }
    } catch (_) {}
  };

  const handleCreate = async (values: any) => {
    try {
      const res = await fetch(`${apiUrl}/penalties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success('Tạo phạt thành công!');
        setModalVisible(false);
        form.resetFields();
        fetchPenalties();
      } else {
        message.error('Tạo phạt thất bại!');
      }
    } catch (_) {}
  };

  const handleExcelExport = async () => {
    try {
      const res = await fetch(`${apiUrl}/export/statistics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'thong-ke.xlsx';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (_) {
      message.error('Xuất Excel thất bại!');
    }
  };

  const unpaidTotal = penalties.filter((p) => !p.paid).reduce((s, p) => s + Number(p.amount), 0);
  const paidTotal = penalties.filter((p) => p.paid).reduce((s, p) => s + Number(p.amount), 0);
  const unpaidCount = penalties.filter((p) => !p.paid).length;

  const columns = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      render: (id: number) => <span style={{ color: 'var(--muted)', fontSize: 12 }}>#{id}</span>,
    },
    {
      title: 'Sinh viên',
      dataIndex: 'user_name',
      key: 'user_name',
      render: (text: string) => <strong>{text || '—'}</strong>,
    },
    {
      title: 'Mã yêu cầu',
      dataIndex: 'borrow_request_id',
      key: 'borrow_request_id',
      render: (v: number) => v ? `#${v}` : '—',
    },
    { title: 'Lý do', dataIndex: 'reason', key: 'reason', ellipsis: true },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => (
        <span style={{ fontWeight: 700, color: '#f04438' }}>
          {Number(v).toLocaleString('vi-VN')}đ
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'paid',
      key: 'paid',
      render: (paid: boolean) =>
        paid ? (
          <Tag color="green" icon={<CheckOutlined />}>Đã thanh toán</Tag>
        ) : (
          <Tag color="red" icon={<WarningOutlined />}>Chưa thanh toán</Tag>
        ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => new Date(v).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: Penalty) =>
        !record.paid ? (
          <Popconfirm
            title="Xác nhận đã nhận tiền phạt?"
            onConfirm={() => handleMarkPaid(record.id)}
            okText="Xác nhận"
            cancelText="Hủy"
          >
            <Button size="small" type="primary" icon={<CheckOutlined />}>
              Đã thu
            </Button>
          </Popconfirm>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>✓ Xong</span>
        ),
    },
  ];

  return (
    <div>
      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title="Chưa thanh toán"
              value={unpaidTotal}
              suffix="đ"
              valueStyle={{ color: '#f04438', fontWeight: 700 }}
              formatter={(v) => Number(v).toLocaleString('vi-VN')}
            />
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{unpaidCount} trường hợp</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title="Đã thu được"
              value={paidTotal}
              suffix="đ"
              valueStyle={{ color: '#12b76a', fontWeight: 700 }}
              formatter={(v) => Number(v).toLocaleString('vi-VN')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title="Tổng phạt"
              value={penalties.length}
              suffix="trường hợp"
              valueStyle={{ fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        className="content-card"
        title={<span><DollarOutlined /> Hệ thống phạt</span>}
        extra={
          <Space>
            <Button icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
              Tạo phạt
            </Button>
            <Button type="primary" onClick={handleExcelExport}>
              Xuất Excel
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={penalties}
          loading={loading}
          pagination={{ pageSize: 10 }}
          size="small"
          rowClassName={(r) => r.paid ? '' : 'ant-table-row-warning'}
        />
      </Card>

      {/* Create penalty modal */}
      <Modal
        title={<span><DollarOutlined /> Tạo khoản phạt</span>}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="ID Sinh viên" name="user_id" rules={[{ required: true }]}>
            <Input type="number" placeholder="User ID" />
          </Form.Item>
          <Form.Item label="Mã yêu cầu mượn" name="borrow_request_id">
            <Input type="number" placeholder="Request ID (không bắt buộc)" />
          </Form.Item>
          <Form.Item label="Số tiền phạt (VNĐ)" name="amount" rules={[{ required: true }]}>
            <Input type="number" placeholder="100000" />
          </Form.Item>
          <Form.Item label="Lý do" name="reason" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Trả trễ / Làm hỏng thiết bị..." />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">Tạo</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PenaltiesPage;
