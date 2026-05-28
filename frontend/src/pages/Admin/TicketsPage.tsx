import { useState, useEffect, type ReactNode } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message, Rate, Popconfirm, Badge } from 'antd';
import { BugOutlined, PlusOutlined, CheckCircleOutlined, ClockCircleOutlined, ToolOutlined } from '@ant-design/icons';

interface Ticket {
  id: number;
  equipment_id: number;
  equipment_name?: string;
  user_id: number;
  user_name?: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

interface TicketsPageProps {
  apiUrl: string;
}

const statusConfig: Record<string, { color: string; label: string; icon: ReactNode }> = {
  open: { color: 'red', label: 'Mới', icon: <BugOutlined /> },
  in_progress: { color: 'blue', label: 'Đang xử lý', icon: <ToolOutlined /> },
  resolved: { color: 'green', label: 'Đã giải quyết', icon: <CheckCircleOutlined /> },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  low: { color: 'default', label: 'Thấp' },
  normal: { color: 'blue', label: 'Bình thường' },
  high: { color: 'orange', label: 'Cao' },
  urgent: { color: 'red', label: '🔥 Khẩn cấp' },
};

const TicketsPage = ({ apiUrl }: TicketsPageProps) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const token = localStorage.getItem('token');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/tickets`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setTickets(data?.data || []);
      }
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      const res = await fetch(`${apiUrl}/tickets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        message.success('Cập nhật trạng thái thành công!');
        fetchTickets();
        setDetailVisible(false);
      }
    } catch (_) {
      message.error('Lỗi kết nối!');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${apiUrl}/tickets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        message.success('Đã xóa ticket!');
        fetchTickets();
      }
    } catch (_) {}
  };

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;

  const columns = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      render: (id: number) => <span style={{ color: 'var(--muted)', fontSize: 12 }}>#{id}</span>,
    },
    {
      title: 'Thiết bị',
      dataIndex: 'equipment_name',
      key: 'equipment_name',
      render: (text: string) => <strong>{text || '—'}</strong>,
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Ticket) => (
        <button
          onClick={() => { setSelectedTicket(record); setDetailVisible(true); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#175cd3', fontWeight: 600, fontSize: 14 }}
        >
          {text}
        </button>
      ),
    },
    { title: 'Người báo', dataIndex: 'user_name', key: 'user_name' },
    {
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      render: (p: string) => {
        const cfg = priorityConfig[p] || priorityConfig.normal;
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const cfg = statusConfig[s] || statusConfig.open;
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>;
      },
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
      render: (_: any, record: Ticket) => (
        <Space>
          {record.status === 'open' && (
            <Button size="small" type="primary" onClick={() => handleStatusUpdate(record.id, 'in_progress')}>
              Xử lý
            </Button>
          )}
          {record.status === 'in_progress' && (
            <Button size="small" style={{ background: '#12b76a', color: '#fff', border: 'none' }} onClick={() => handleStatusUpdate(record.id, 'resolved')}>
              Hoàn thành
            </Button>
          )}
          <Popconfirm title="Xóa ticket này?" onConfirm={() => handleDelete(record.id)} okText="Có" cancelText="Không">
            <Button size="small" danger>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Card style={{ flex: 1, borderRadius: 12 }} bodyStyle={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Ticket mới</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f04438' }}>{openCount}</div>
        </Card>
        <Card style={{ flex: 1, borderRadius: 12 }} bodyStyle={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Đang xử lý</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#175cd3' }}>{inProgressCount}</div>
        </Card>
        <Card style={{ flex: 1, borderRadius: 12 }} bodyStyle={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Tổng ticket</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>{tickets.length}</div>
        </Card>
      </div>

      <Card
        className="content-card"
        title={<span><BugOutlined /> Hệ thống ticket báo lỗi thiết bị</span>}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={tickets}
          loading={loading}
          pagination={{ pageSize: 10 }}
          size="small"
          rowClassName={(record) => record.priority === 'urgent' ? 'ant-table-row-urgent' : ''}
        />
      </Card>

      {/* Detail modal */}
      <Modal
        title={<span><BugOutlined /> Chi tiết ticket #{selectedTicket?.id}</span>}
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={
          selectedTicket && (
            <Space>
              {selectedTicket.status === 'open' && (
                <Button type="primary" onClick={() => handleStatusUpdate(selectedTicket.id, 'in_progress')}>
                  Bắt đầu xử lý
                </Button>
              )}
              {selectedTicket.status === 'in_progress' && (
                <Button style={{ background: '#12b76a', color: '#fff', border: 'none' }} onClick={() => handleStatusUpdate(selectedTicket.id, 'resolved')}>
                  Đánh dấu hoàn thành
                </Button>
              )}
              <Button onClick={() => setDetailVisible(false)}>Đóng</Button>
            </Space>
          )
        }
      >
        {selectedTicket && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><strong>Thiết bị:</strong> {selectedTicket.equipment_name}</div>
            <div><strong>Người báo:</strong> {selectedTicket.user_name}</div>
            <div><strong>Tiêu đề:</strong> {selectedTicket.title}</div>
            <div><strong>Mô tả:</strong><br /><span style={{ color: 'var(--muted)' }}>{selectedTicket.description || 'Không có mô tả'}</span></div>
            <div>
              <strong>Ưu tiên:</strong>{' '}
              <Tag color={priorityConfig[selectedTicket.priority]?.color}>{priorityConfig[selectedTicket.priority]?.label}</Tag>
            </div>
            <div>
              <strong>Trạng thái:</strong>{' '}
              <Tag color={statusConfig[selectedTicket.status]?.color}>{statusConfig[selectedTicket.status]?.label}</Tag>
            </div>
            <div><strong>Ngày tạo:</strong> {new Date(selectedTicket.created_at).toLocaleString('vi-VN')}</div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TicketsPage;
