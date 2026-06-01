import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space,
  message, Popconfirm, Alert, Row, Col, Badge, Tooltip, Statistic,
} from 'antd';
import {
  ToolOutlined,
  PlusOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

interface RepairLog {
  id: number;
  equipment_id: number;
  equipment_name?: string;
  description: string;
  cost: number;
  repaired_by?: string;
  repaired_at?: string;
  status: 'pending' | 'in_progress' | 'done';
  created_at: string;
}

interface MaintenanceAlert {
  id: number;
  name: string;
  last_maintenance_at: string | null;
  days_since: number | null;
}

interface MaintenancePageProps {
  apiUrl: string;
}

const statusConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  pending: { color: 'orange', label: 'Chờ xử lý', icon: <ClockCircleOutlined /> },
  in_progress: { color: 'blue', label: 'Đang sửa', icon: <ToolOutlined /> },
  done: { color: 'green', label: 'Hoàn thành', icon: <CheckCircleOutlined /> },
};

const MaintenancePage: React.FC<MaintenancePageProps> = ({ apiUrl }) => {
  const [logs, setLogs] = useState<RepairLog[]>([]);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLog, setEditingLog] = useState<RepairLog | null>(null);
  const [form] = Form.useForm();

  const token = localStorage.getItem('token');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/maintenance`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setLogs(d?.data || []); }
    } catch {}
    setLoading(false);
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${apiUrl}/maintenance/alerts`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setAlerts(d?.data || []); }
    } catch {}
  };

  useEffect(() => {
    fetchLogs();
    fetchAlerts();
  }, []);

  const openCreate = () => {
    setEditingLog(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEdit = (log: RepairLog) => {
    setEditingLog(log);
    form.setFieldsValue({
      equipment_id: log.equipment_id,
      description: log.description,
      cost: log.cost,
      repaired_by: log.repaired_by,
      repaired_at: log.repaired_at,
      status: log.status,
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const method = editingLog ? 'PUT' : 'POST';
      const url = editingLog ? `${apiUrl}/maintenance/${editingLog.id}` : `${apiUrl}/maintenance`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success(editingLog ? 'Cập nhật thành công!' : 'Thêm log bảo trì thành công!');
        setModalVisible(false);
        fetchLogs();
        fetchAlerts();
      } else {
        let detail = '';
        try {
          const data = await res.json();
          detail = data?.message || data?.error || data?.code || '';
          console.error('[MaintenancePage.handleSubmit] API error', res.status, data);
        } catch {
          try {
            const text = await res.text();
            detail = text;
            console.error('[MaintenancePage.handleSubmit] API error', res.status, text);
          } catch {
            // ignore
          }
        }
        message.error(detail ? `Thao tác thất bại: ${detail}` : `Thao tác thất bại (${res.status})`);
      }
    } catch {}
  };

  const pendingCount = logs.filter((l) => l.status === 'pending').length;
  const totalCost = logs.reduce((s, l) => s + Number(l.cost || 0), 0);

  const columns = [
    {
      title: 'Thiết bị',
      dataIndex: 'equipment_name',
      key: 'equipment_name',
      render: (v: string) => <strong>{v || '—'}</strong>,
    },
    { title: 'Mô tả sự cố', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Chi phí',
      dataIndex: 'cost',
      key: 'cost',
      render: (v: number) => v > 0 ? (
        <span style={{ fontWeight: 700, color: '#f79009' }}>{Number(v).toLocaleString('vi-VN')}đ</span>
      ) : <span style={{ color: 'var(--text-secondary)' }}>Miễn phí</span>,
    },
    {
      title: 'Người sửa',
      dataIndex: 'repaired_by',
      key: 'repaired_by',
      render: (v: string) => v || '—',
    },
    {
      title: 'Ngày sửa',
      dataIndex: 'repaired_at',
      key: 'repaired_at',
      render: (v: string) => v ? new Date(v).toLocaleDateString('vi-VN') : '—',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const cfg = statusConfig[s] || statusConfig.pending;
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: RepairLog) => (
        <Button size="small" onClick={() => openEdit(record)}>Chỉnh sửa</Button>
      ),
    },
  ];

  return (
    <div>
      {/* Stats */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: '14px 18px' }}>
            <Statistic title="Đang chờ xử lý" value={pendingCount} valueStyle={{ color: '#f79009', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: '14px 18px' }}>
            <Statistic
              title="Tổng chi phí"
              value={totalCost}
              suffix="đ"
              valueStyle={{ color: '#f04438', fontWeight: 700 }}
              formatter={(v) => Number(v).toLocaleString('vi-VN')}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cảnh báo bảo trì</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: alerts.length > 0 ? '#f04438' : '#12b76a' }}>
              {alerts.length}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Maintenance alerts */}
      {alerts.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16, borderRadius: 12 }}
          message={`⚠️ ${alerts.length} thiết bị cần bảo trì định kỳ`}
          description={
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {alerts.slice(0, 8).map((a) => (
                <Tag key={a.id} color="orange">
                  {a.name}
                  {a.days_since !== null ? ` (${a.days_since} ngày)` : ' (chưa bảo trì)'}
                </Tag>
              ))}
              {alerts.length > 8 && <Tag>+{alerts.length - 8} thiết bị khác</Tag>}
            </div>
          }
        />
      )}

      <Card
        className="content-card"
        title={<span><ToolOutlined /> Lịch sử bảo trì & sửa chữa</span>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm log
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={logs}
          loading={loading}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingLog ? 'Chỉnh sửa log bảo trì' : 'Thêm log bảo trì'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="ID Thiết bị" name="equipment_id" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Mô tả sự cố" name="description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Mô tả tình trạng hỏng, lỗi..." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Chi phí (VNĐ)" name="cost" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Người sửa" name="repaired_by">
                <Input placeholder="Tên kỹ thuật viên" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Ngày sửa" name="repaired_at">
            <input type="date" style={{ width: '100%', padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--muted-light)', color: 'var(--text)' }} />
          </Form.Item>
          <Form.Item label="Trạng thái" name="status" initialValue="pending">
            <Select options={[
              { value: 'pending', label: '⏳ Chờ xử lý' },
              { value: 'in_progress', label: '🔧 Đang sửa' },
              { value: 'done', label: '✅ Hoàn thành' },
            ]} />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">{editingLog ? 'Cập nhật' : 'Thêm'}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MaintenancePage;
