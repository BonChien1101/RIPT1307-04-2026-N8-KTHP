import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  Layout,
  Menu,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Statistic,
  Row,
  Col,
  Badge,
  Popconfirm,
  Avatar,
  Dropdown,
  Select,
  Space,
  Progress,
  Tag,
  Tooltip,
} from 'antd';
import {
  DashboardOutlined,
  LogoutOutlined,
  UserOutlined,
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  CloseCircleOutlined,
  SaveOutlined,
  BarChartOutlined,
  BgColorsOutlined,
  CalendarOutlined,
  ToolOutlined,
  BugOutlined,
  DollarOutlined,
  QrcodeOutlined,
  TeamOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  MailOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import './styles.less';
import { isStudentRole } from '../../utils/auth';
import { getApiUrl } from '../../utils/api';
import NotificationBell from '../../components/NotificationBell';
import QRModal from '../../components/QRModal';
import CalendarPage from './CalendarPage';
import MaintenancePage from './MaintenancePage';
import TicketsPage from './TicketsPage';
import PenaltiesPage from './PenaltiesPage';
import ChatBot from '../../components/ChatBot';

const AdminEmailWarningPanel: React.FC<{ apiUrl: string; onUnauthorized: () => void }> = ({ apiUrl, onUnauthorized }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [borrowed, setBorrowed] = useState<any[]>([]);
  const [borrowedLoading, setBorrowedLoading] = useState(false);

  const fetchBorrowed = useCallback(async () => {
    setBorrowedLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/admin/borrowed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setBorrowed(data?.data || []);
        return;
      }
      // eslint-disable-next-line no-console
      console.error('[AdminEmailWarningPanel.fetchBorrowed] API error', res.status, await res.text());
    } catch {}
    setBorrowedLoading(false);
  }, [apiUrl, onUnauthorized]);

  useEffect(() => {
    fetchBorrowed();
  }, [fetchBorrowed]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const values = await form.validateFields();
      const res = await fetch(`${apiUrl}/admin/emails/borrow-warning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ request_id: values.request_id, content: values.content }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const previewUrl = data?.data?.previewUrl;
        message.success(previewUrl ? `Đã gửi email! (Preview: ${previewUrl})` : 'Đã gửi email cảnh báo!');
        form.resetFields();
        return;
      }
      let detail = '';
      try {
        const data = await res.json();
        // eslint-disable-next-line no-console
        console.error('[AdminEmailWarningPanel] API error', res.status, data);
        detail = data?.message || data?.error || data?.code || '';
      } catch {
        try {
          const text = await res.text();
          // eslint-disable-next-line no-console
          console.error('[AdminEmailWarningPanel] API error', res.status, text);
          detail = text;
        } catch {}
      }
      if (res.status === 404) {
        message.error('API gửi email không tồn tại (404). Có thể backend Render chưa deploy bản mới hoặc API_URL đang trỏ sai.');
      } else {
        message.error(detail ? `Gửi email thất bại: ${detail}` : `Gửi email thất bại (${res.status})`);
      }
    } catch (e: any) {
      message.error(e?.message || 'Gửi email thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Gửi email cảnh báo (thủ công)" style={{ marginTop: 12 }}>
      <Form form={form} layout="vertical">
        <Form.Item
          label="Chọn người đang mượn / phiếu mượn"
          name="request_id"
          rules={[{ required: true, message: 'Vui lòng chọn đối tượng' }]}
        >
          <Select
            showSearch
            loading={borrowedLoading}
            placeholder="Chọn phiếu đang mượn..."
            optionFilterProp="label"
            options={(borrowed || []).map((r: any) => ({
              value: r.request_id,
              label: `#${r.request_id} • ${r.full_name || 'N/A'} • ${r.email || 'no-email'} • ${r.equipments || ''} • hạn ${r.expected_return_date || ''}`,
            }))}
          />
        </Form.Item>
        <Form.Item
          label="Nội dung cảnh báo"
          name="content"
          rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}
        >
          <Input.TextArea rows={6} placeholder="Nhập nội dung email gửi cho người mượn..." />
        </Form.Item>
        <Space>
          <Button type="primary" icon={<MailOutlined />} loading={loading} onClick={handleSubmit}>
            Gửi email
          </Button>
          <Button onClick={() => form.resetFields()}>
            Xóa nhập
          </Button>
        </Space>
      </Form>
    </Card>
  );
};

const { Header, Content, Sider } = Layout;

interface Equipment {
  id: number;
  name: string;
  category?: string;
  total_quantity: number;
  available_quantity: number;
  description: string;
  image_url?: string;
  status?: 'available' | 'maintenance' | 'unavailable';
  condition_status?: string;
  rating_avg?: number;
}

interface BorrowRequest {
  id: number;
  user_id: number;
  borrow_date: string;
  expected_return_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'borrowed' | 'returned' | 'overdue';
  note?: string;
}

interface BorrowRequestDetail extends BorrowRequest {
  actual_return_date?: string;
  items?: Array<{ id: number; equipment_id: number; quantity: number }>;
}

interface EquipmentDetail extends Equipment {
  created_at?: string;
  updated_at?: string;
}

// Dark mode helpers
const getDarkMode = () => {
  try {
    return localStorage.getItem('borrowx_dark') === '1';
  } catch {
    return false;
  }
};

const setDarkMode = (val: boolean) => {
  localStorage.setItem('borrowx_dark', val ? '1' : '0');
  document.documentElement.setAttribute('data-theme', val ? 'dark' : 'light');
};

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isEquipmentModalVisible, setIsEquipmentModalVisible] = useState(false);
  const [isEquipmentDetailModalVisible, setIsEquipmentDetailModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [equipmentForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [requestDetailLoading, setRequestDetailLoading] = useState(false);
  const [equipmentDetailLoading, setEquipmentDetailLoading] = useState(false);
  const [isRequestDetailModalVisible, setIsRequestDetailModalVisible] = useState(false);
  const [selectedRequestDetail, setSelectedRequestDetail] = useState<BorrowRequestDetail | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedEquipmentDetail, setSelectedEquipmentDetail] = useState<EquipmentDetail | null>(null);

  const [topEquipment, setTopEquipment] = useState<Array<{ id: number; name: string; tongMuon: number }>>([]);
  const [topEquipmentLoading, setTopEquipmentLoading] = useState(false);
  const [statYear, setStatYear] = useState(new Date().getFullYear());
  const [statMonth, setStatMonth] = useState(new Date().getMonth() + 1);
  const [user, setUser] = useState<any>(null);
  const [isDark, setIsDark] = useState(getDarkMode());
  const [monthlyData, setMonthlyData] = useState<number[]>(Array(12).fill(0));
  const [overdueRate, setOverdueRate] = useState({ total_borrows: 0, overdue_count: 0, overdue_rate_percent: 0 });
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ name: string; reason: string; equipment: string[] }>>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [usersWithTrust, setUsersWithTrust] = useState<any[]>([]);
  const apiUrl = getApiUrl();

  const [stats, setStats] = useState({ totalEquipment: 0, totalBorrowed: 0, pendingRequests: 0 });

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    message.warning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    window.location.hash = '#/';
    window.location.reload();
  }, []);

  const totalInventory = equipment.reduce((sum, item) => sum + (item.total_quantity || 0), 0);
  const totalAvailable = equipment.reduce((sum, item) => sum + (item.available_quantity || 0), 0);
  const totalBorrowedItems = Math.max(totalInventory - totalAvailable, 0);
  const usageRate = totalInventory > 0 ? Math.round((totalBorrowedItems / totalInventory) * 100) : 0;
  const recentRequests = [...borrowRequests]
    .sort((a, b) => new Date(b.borrow_date).getTime() - new Date(a.borrow_date).getTime())
    .slice(0, 5);
  const maxTopBorrow = Math.max(...topEquipment.map((item) => item.tongMuon || 0), 0);

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    setDarkMode(next);
  };

  useEffect(() => {
    setDarkMode(isDark);
  }, [isDark]);

  useLayoutEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData && userData !== 'undefined' && userData !== 'null') {
      try {
        const parsedUser = JSON.parse(userData);
        if (isStudentRole(parsedUser.role)) window.location.hash = '#/';
        setUser(parsedUser);
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.hash = '#/';
        return;
      }
    } else {
      window.location.hash = '#/';
    }
    fetchBorrowRequests();
    fetchEquipment();
    fetchStats();
    fetchTopBorrowedEquipment(new Date().getFullYear(), new Date().getMonth() + 1); // Initial fetch
    fetchMonthlyTrend();
    fetchOverdueRate();
    fetchAiSuggestions();
    fetchUsersWithTrust();
  }, []);

  const fetchBorrowRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/borrow-requests`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (response.ok) { const payload = await response.json(); setBorrowRequests(payload?.data || []); }
    } catch { message.error('Lỗi tải danh sách yêu cầu!'); }
  };

  const fetchMonthlyTrend = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/statistics/monthly-trend?year=${new Date().getFullYear()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const months = Array(12).fill(0);
        (data?.data || []).forEach((d: any) => { if (d.month >= 1 && d.month <= 12) months[d.month - 1] = Number(d.count || 0); });
        setMonthlyData(months);
      }
    } catch {}
  };

  const fetchOverdueRate = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/statistics/overdue-rate`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setOverdueRate(data?.data || {}); }
    } catch {}
  };

  const fetchAiSuggestions = async () => {
    setAiLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/statistics/ai-suggestion`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setAiSuggestions(data?.data || []); }
    } catch {}
    setAiLoading(false);
  };

  const fetchUsersWithTrust = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/trust`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setUsersWithTrust(data?.data || []); }
    } catch {}
  };

  const fetchViewRequestDetail = async (requestId: number) => {
    setRequestDetailLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/borrow-requests/${requestId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (!response.ok) { message.error('Không tải được chi tiết yêu cầu!'); return; }
      const payload = await response.json();
      setSelectedRequestDetail(payload?.data || null);
      setIsRequestDetailModalVisible(true);
    } catch { message.error('Lỗi tải chi tiết yêu cầu!'); }
    finally { setRequestDetailLoading(false); }
  };

  const fetchViewEquipmentDetail = async (equipmentId: number) => {
    setEquipmentDetailLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/equipments/${equipmentId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (!response.ok) { message.error('Không tải được chi tiết thiết bị!'); return; }
      const payload = await response.json();
      setSelectedEquipmentDetail(payload?.data || null);
      setIsEquipmentDetailModalVisible(true);
    } catch { message.error('Lỗi tải chi tiết thiết bị!'); }
    finally { setEquipmentDetailLoading(false); }
  };

  const fetchTopBorrowedEquipment = async (year = statYear, month = statMonth) => {
    setTopEquipmentLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/statistics/top-equipment?year=${year}&month=${month}&limit=10`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (!response.ok) { setTopEquipment([]); return; }
      const payload = await response.json();
      setTopEquipment(payload?.data || []);
    } catch { setTopEquipment([]); }
    finally { setTopEquipmentLoading(false); }
  };

  const fetchEquipment = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/equipments`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (response.ok) { const payload = await response.json(); setEquipment(payload?.data || []); }
    } catch { message.error('Lỗi tải danh sách thiết bị!'); }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/statistics/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (response.ok) {
        const payload = await response.json();
        const data = payload?.data || {};
        setStats({ totalEquipment: data.tongThietBi || 0, totalBorrowed: data.tongYeuCau || 0, pendingRequests: data.dangChoDuyet || 0 });
      }
    } catch {}
  };

  const handleApprove = async (requestId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/borrow-requests/${requestId}/approve`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (response.ok) { message.success('Phê duyệt yêu cầu thành công!'); fetchBorrowRequests(); fetchStats(); fetchEquipment(); fetchTopBorrowedEquipment(); }
      else { message.error('Phê duyệt yêu cầu thất bại!'); }
    } catch { message.error('Lỗi kết nối đến server!'); }
  };

  const handleReject = async (requestId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/borrow-requests/${requestId}/reject`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (response.ok) { message.success('Từ chối yêu cầu thành công!'); fetchBorrowRequests(); fetchStats(); }
      else { message.error('Từ chối yêu cầu thất bại!'); }
    } catch { message.error('Lỗi kết nối đến server!'); }
  };

  const handleMarkBorrowed = async (requestId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/borrow-requests/${requestId}/mark-borrowed`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (response.ok) { message.success('Đã ghi nhận thiết bị được mượn!'); fetchBorrowRequests(); fetchEquipment(); fetchStats(); }
      else { message.error('Ghi nhận mượn thất bại!'); }
    } catch { message.error('Lỗi kết nối đến server!'); }
  };

  const handleMarkReturned = async (requestId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/borrow-requests/${requestId}/mark-returned`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (response.ok) { message.success('Đã ghi nhận thiết bị được trả!'); fetchBorrowRequests(); fetchEquipment(); fetchStats(); }
      else { message.error('Ghi nhận trả thất bại!'); }
    } catch { message.error('Lỗi kết nối đến server!'); }
  };

  const handleSaveEquipment = async (values: any) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const isEditing = !!selectedEquipment;
      const response = await fetch(isEditing ? `${apiUrl}/equipments/${selectedEquipment!.id}` : `${apiUrl}/equipments`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (response.ok) {
        message.success(isEditing ? 'Cập nhật thiết bị thành công!' : 'Thêm thiết bị thành công!');
        setIsEquipmentModalVisible(false);
        equipmentForm.resetFields();
        setSelectedEquipment(null);
        fetchEquipment(); fetchStats(); fetchTopBorrowedEquipment();
      } else { message.error(isEditing ? 'Cập nhật thiết bị thất bại!' : 'Thêm thiết bị thất bại!'); }
    } catch { message.error('Lỗi kết nối đến server!'); }
    finally { setLoading(false); }
  };

  const handleDeleteEquipment = async (equipmentId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/equipments/${equipmentId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (response.ok) { message.success('Xóa thiết bị thành công!'); fetchEquipment(); fetchStats(); }
      else { message.error('Xóa thiết bị thất bại!'); }
    } catch { message.error('Lỗi kết nối đến server!'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    message.success('Đã đăng xuất!');
    window.location.hash = '#/';
    window.location.reload();
  };


  const openAddEquipmentModal = () => {
    setSelectedEquipment(null);
    equipmentForm.resetFields();
    equipmentForm.setFieldsValue({ total_quantity: 1, available_quantity: 1 });
    setIsEquipmentModalVisible(true);
  };

  const handleEditEquipment = (item: Equipment) => {
    setSelectedEquipment(item);
    equipmentForm.setFieldsValue({
      name: item.name, category: item.category, description: item.description,
      total_quantity: item.total_quantity, available_quantity: item.available_quantity,
      image_url: item.image_url, status: item.status,
    });
    setIsEquipmentModalVisible(true);
  };

  const availableEq = equipment.filter((e) => e.status === 'available' && e.available_quantity > 0).length;
  const borrowedEq = equipment.filter((e) => e.available_quantity < e.total_quantity).length;
  const maintenanceEq = equipment.filter((e) => e.status === 'maintenance').length;
  const unavailableEq = equipment.filter((e) => e.status === 'unavailable').length;

  const equipmentBreakdown = [
    { label: 'Có sẵn', value: availableEq, color: '#12b76a' },
    { label: 'Đang mượn', value: borrowedEq, color: '#f79009' },
    { label: 'Bảo trì', value: maintenanceEq, color: '#7a5af8' },
    { label: 'Không dùng', value: unavailableEq, color: '#f04438' },
  ];

  const monthlyMax = Math.max(...monthlyData, 1);
  const overduePercent = Math.max(0, Math.round(overdueRate.overdue_rate_percent || 0));
  const overdueColor = overduePercent > 20 ? '#f04438' : overduePercent > 10 ? '#f79009' : '#12b76a';

  // ============ STATUS BADGE ============
  const statusBadge = (status: string) => {
    const map: Record<string, JSX.Element> = {
      pending: <Badge status="processing" text="Chờ Duyệt" />,
      approved: <Badge status="success" text="Đã Duyệt" />,
      borrowed: <Badge status="warning" text="Đang Mượn" />,
      rejected: <Badge status="error" text="Từ Chối" />,
      returned: <Badge status="default" text="Đã Trả" />,
      overdue: <Badge color="red" text="Quá Hạn" />,
    };
    return map[status] || <Badge status="default" text={status} />;
  };

  // ============ COLUMNS ============
  const requestColumns = [
    { title: 'Mã', dataIndex: 'id', key: 'id', width: 60, render: (id: number) => `#${id}` },
    { title: 'User ID', dataIndex: 'user_id', key: 'user_id', width: 80 },
    { title: 'Ngày Mượn', dataIndex: 'borrow_date', key: 'borrow_date' },
    { title: 'Ngày Trả', dataIndex: 'expected_return_date', key: 'expected_return_date' },
    { title: 'Trạng Thái', dataIndex: 'status', key: 'status', render: statusBadge },
    {
      title: 'Hành Động',
      key: 'action',
      render: (_: any, record: BorrowRequest) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => fetchViewRequestDetail(record.id)}>Chi tiết</Button>
          {record.status === 'pending' && (
            <>
              <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleApprove(record.id)}>Duyệt</Button>
              <Popconfirm title="Từ chối yêu cầu này?" onConfirm={() => handleReject(record.id)} okText="Có" cancelText="Không">
                <Button danger size="small" icon={<CloseCircleOutlined />}>Từ chối</Button>
              </Popconfirm>
            </>
          )}
          {record.status === 'approved' && <Button size="small" onClick={() => handleMarkBorrowed(record.id)}>Ghi Nhận Mượn</Button>}
          {record.status === 'borrowed' && <Button size="small" onClick={() => handleMarkReturned(record.id)}>Ghi Nhận Trả</Button>}
        </Space>
      ),
    },
  ];

  const equipmentColumns = [
    {
      title: 'Thiết bị',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Equipment) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {record.image_url ? (
            <img src={record.image_url} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} alt="" />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📦</div>
          )}
          <div>
            <strong style={{ fontSize: 14 }}>{text}</strong>
            {record.condition_status && (
              <div><Tag style={{ marginTop: 2, fontSize: 11, borderRadius: 4 }} color={
                record.condition_status === 'new' ? 'green' :
                record.condition_status === 'good' ? 'blue' :
                record.condition_status === 'fair' ? 'orange' : 'red'
              }>{record.condition_status}</Tag></div>
            )}
          </div>
        </div>
      ),
    },
    { title: 'Danh mục', dataIndex: 'category', key: 'category', render: (v: string) => v || '—' },
    { title: 'Tổng', dataIndex: 'total_quantity', key: 'total_quantity', width: 70 },
    { title: 'Đang mượn', key: 'borrowed', width: 90, render: (_: any, r: Equipment) => r.total_quantity - r.available_quantity },
    { title: 'Còn lại', key: 'remaining', width: 80, render: (_: any, r: Equipment) => (
        <span style={{ fontWeight: 700, color: r.available_quantity === 0 ? '#f04438' : r.available_quantity <= 2 ? '#f79009' : '#12b76a' }}>
          {r.available_quantity}
        </span>
      )
    },
    {
      title: 'Hành Động',
      key: 'action',
      render: (_: any, record: Equipment) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => fetchViewEquipmentDetail(record.id)}>Chi Tiết</Button>
          <QRModal equipmentId={record.id} equipmentName={record.name} apiUrl={apiUrl} />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditEquipment(record)}>Sửa</Button>
          <Popconfirm title="Xóa thiết bị này?" onConfirm={() => handleDeleteEquipment(record.id)} okText="Có" cancelText="Không">
            <Button danger size="small" icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rankConfig: Record<string, { label: string; color: string }> = {
    gold: { label: '🥇 Gold', color: '#b8860b' },
    silver: { label: '🥈 Silver', color: '#7a7a8a' },
    bronze: { label: '🥉 Bronze', color: '#cd7f32' },
  };

  const trustColumns = [
    { title: 'Sinh viên', dataIndex: 'full_name', key: 'full_name', render: (t: string) => <strong>{t}</strong> },
    { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true },
    { title: 'CLB', dataIndex: 'club', key: 'club', render: (v: string) => v || '—' },
    {
      title: 'Điểm uy tín',
      dataIndex: 'trust_score',
      key: 'trust_score',
      sorter: (a: any, b: any) => (a.trust_score || 100) - (b.trust_score || 100),
      render: (score: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress percent={score || 100} size="small" style={{ width: 80 }} showInfo={false} strokeColor="#c39b59" />
          <strong>{score || 100}</strong>
        </div>
      ),
    },
    {
      title: 'Hạng',
      dataIndex: 'trust_rank',
      key: 'trust_rank',
      render: (rank: string) => {
        const cfg = rankConfig[rank] || rankConfig.bronze;
        return <span style={{ fontWeight: 700, color: cfg.color }}>{cfg.label}</span>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_banned',
      key: 'is_banned',
      render: (banned: number) => banned ? <Tag color="red">🚫 Bị khóa</Tag> : <Tag color="green">✅ Hoạt động</Tag>,
    },
  ];

  // ============ RENDER DASHBOARD ============
  const renderDashboard = () => (
    <div className="admin-dashboard">
      {/* Hero */}
      <Card className="dashboard-hero" bordered={false}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={14}>
            <div className="dashboard-hero__content">
              <div className="dashboard-hero__eyebrow">Tổng quan hệ thống</div>
              <h2>Xin chào, {user?.full_name || user?.name || 'Quản trị viên'} 👋</h2>
              <p>
                Bạn đang quản lý <strong>{stats.totalEquipment}</strong> thiết bị,{' '}
                <strong>{stats.pendingRequests}</strong> yêu cầu chờ duyệt và{' '}
                <strong>{stats.totalBorrowed}</strong> lượt mượn đã ghi nhận.
              </p>
              <Space wrap>
                <Button type="primary" onClick={() => setActiveTab('requests')}>Xem yêu cầu chờ duyệt</Button>
                <Button onClick={() => setActiveTab('equipment')}>Quản lý thiết bị</Button>
              </Space>
            </div>
          </Col>
          <Col xs={24} lg={10}>
            <div className="dashboard-hero__ring">
              <Progress type="circle" percent={usageRate} strokeColor="var(--accent-start)" trailColor="rgba(255,255,255,0.18)" />
              <div className="dashboard-hero__ring-label">
                <strong>{usageRate}%</strong>
                <span>Tỷ lệ thiết bị đang được dùng</span>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Stats */}
      <Row gutter={[16, 16]}>
        {[
          { title: 'Tổng thiết bị', value: stats.totalEquipment, icon: '📦', hint: 'Tất cả thiết bị trong kho' },
          { title: 'Thiết bị sẵn sàng', value: totalAvailable, icon: '✅', hint: 'Có thể cho mượn ngay', color: '#12b76a' },
          { title: 'Đang được mượn', value: totalBorrowedItems, icon: '📤', hint: 'Đang được sử dụng', color: '#f79009' },
          { title: 'Yêu cầu chờ', value: stats.pendingRequests, icon: '⏳', hint: 'Cần xử lý trong ngày', color: '#f04438', danger: true },
        ].map((item, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <Card className={`dashboard-metric${item.danger ? ' dashboard-metric--danger' : ''}`} bordered={false}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 32 }}>{item.icon}</div>
                <Statistic title={item.title} value={item.value} valueStyle={{ color: item.color, fontWeight: 700 }} />
              </div>
              <span className="dashboard-metric__hint">{item.hint}</span>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="📊 Lượt mượn theo tháng" className="dashboard-panel" bordered={false}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, minHeight: 240, paddingTop: 12 }}>
              {monthlyData.map((value, index) => {
                const height = Math.max((value / monthlyMax) * 100, value > 0 ? 10 : 4);
                return (
                  <div key={index} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div
                        title={`T${index + 1}: ${value}`}
                        style={{
                          width: '70%',
                          height: `${height}%`,
                          minHeight: value > 0 ? 10 : 4,
                          borderRadius: 10,
                          background: 'linear-gradient(180deg, #c39b59 0%, #8a6428 100%)',
                          boxShadow: '0 10px 24px rgba(195, 155, 89, 0.25)',
                        }}
                      />
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>T{index + 1}</div>
                    <div style={{ marginTop: 2, fontWeight: 700 }}>{value}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="🍩 Trạng thái thiết bị" className="dashboard-panel" bordered={false}>
            {availableEq + borrowedEq + maintenanceEq + unavailableEq > 0 ? (
              <div style={{ display: 'grid', gap: 14, paddingTop: 4 }}>
                {equipmentBreakdown.map((item) => {
                  const percent = availableEq + borrowedEq + maintenanceEq + unavailableEq > 0
                    ? Math.round((item.value / (availableEq + borrowedEq + maintenanceEq + unavailableEq)) * 100)
                    : 0;
                  return (
                    <div key={item.label}>
                      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Space>
                          <span style={{ width: 10, height: 10, borderRadius: 999, background: item.color, display: 'inline-block' }} />
                          <strong>{item.label}</strong>
                        </Space>
                        <span style={{ color: 'var(--muted)' }}>{item.value} ({percent}%)</span>
                      </Space>
                      <Progress percent={percent} showInfo={false} strokeColor={item.color} trailColor="rgba(255,255,255,0.08)" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Chưa có dữ liệu</div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Overdue Rate */}
        <Col xs={24} sm={8}>
          <Card title="⚠️ Tỉ lệ trả trễ" className="dashboard-panel" bordered={false}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 0 4px' }}>
              <Progress type="circle" percent={overduePercent} strokeColor={overdueColor} width={180} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {overdueRate.overdue_count} / {overdueRate.total_borrows} lượt trễ
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* Top Equipment */}
        <Col xs={24} sm={16}>
          <Card
            title="🏆 Top thiết bị mượn nhiều"
            className="dashboard-panel"
            bordered={false}
            extra={
              <Space>
                <Select size="small" value={statMonth} onChange={(v) => { setStatMonth(v); fetchTopBorrowedEquipment(statYear, v); }} style={{ width: 80 }}
                  options={Array.from({length:12},(_, i)=>({value:i+1,label:`T${i+1}`}))}
                />
                <Select size="small" value={statYear} onChange={(v) => { setStatYear(v); fetchTopBorrowedEquipment(v, statMonth); }} style={{ width: 90 }}
                  options={[2023,2024,2025,2026].map((y) => ({ value: y, label: String(y) }))}
                />
              </Space>
            }
          >
            <div className="dashboard-list">
              {topEquipment.length > 0 ? topEquipment.map((item, index) => {
                const percent = maxTopBorrow > 0 ? Math.round((item.tongMuon / maxTopBorrow) * 100) : 0;
                return (
                  <div className="dashboard-list__item" key={item.id}>
                    <div className="dashboard-list__head">
                      <span className="dashboard-list__rank">#{index + 1}</span>
                      <div>
                        <strong>{item.name}</strong>
                        <span>{item.tongMuon} lượt mượn</span>
                      </div>
                    </div>
                    <Progress percent={percent} showInfo={false} strokeColor="var(--accent-start)" />
                  </div>
                );
              }) : <p className="dashboard-panel__empty">Chưa có dữ liệu thống kê.</p>}
            </div>
          </Card>
        </Col>
      </Row>

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <Card
          title={<span>✨ AI Gợi ý combo thiết bị <Tag color="purple">Gemini AI</Tag></span>}
          className="dashboard-panel"
          bordered={false}
        >
          <Row gutter={[12, 12]}>
            {aiSuggestions.map((s, i) => (
              <Col xs={24} sm={8} key={i}>
                <div className="ai-suggestion-panel">
                  <div className="ai-suggestion-panel__title">{s.name}</div>
                  <div className="ai-suggestion-panel__content">{s.reason}</div>
                  <div className="ai-suggestion-panel__tags">
                    {(s.equipment || []).map((eq, j) => (
                      <span key={j} className="ai-suggestion-panel__tag">{eq}</span>
                    ))}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Recent requests */}
      <Card title="📋 Yêu cầu gần nhất" className="dashboard-panel" bordered={false}>
        <Table
          rowKey="id"
          dataSource={recentRequests}
          pagination={false}
          columns={[
            { title: 'Mã', dataIndex: 'id', key: 'id', render: (id: number) => `#${id}`, width: 70 },
            { title: 'User ID', dataIndex: 'user_id', key: 'user_id' },
            { title: 'Ngày mượn', dataIndex: 'borrow_date', key: 'borrow_date' },
            { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: statusBadge },
          ]}
          size="small"
        />
      </Card>
    </div>
  );

  // ============ SIDEBAR ============
  const siderItems = [
    { key: 'overview', icon: <BarChartOutlined />, label: 'Tổng Quan' },
    { key: 'requests', icon: <SaveOutlined />, label: 'Yêu Cầu Mượn' },
    { key: 'equipment', icon: <BgColorsOutlined />, label: 'Quản Lý Thiết Bị' },
    { key: 'calendar', icon: <CalendarOutlined />, label: 'Lịch Mượn' },
    { key: 'maintenance', icon: <ToolOutlined />, label: 'Bảo Trì' },
    { key: 'tickets', icon: <BugOutlined />, label: 'Báo Lỗi' },
    { key: 'penalties', icon: <DollarOutlined />, label: 'Phạt' },
    { key: 'users_trust', icon: <TeamOutlined />, label: 'Điểm Uy Tín' },
  { key: 'admin_email', icon: <MailOutlined />, label: 'Email cảnh báo' },
  ];

  const userMenuItems = [{ key: 'logout', icon: <LogoutOutlined />, label: 'Đăng Xuất' }];
  const userMenu = <Menu items={userMenuItems} onClick={(e) => { if (e.key === 'logout') handleLogout(); }} />;

  return (
    <Layout className="admin-page-shell" style={{ minHeight: '100vh' }}>
      <Header className="admin-header">
        <div className="header-content">
          <div className="header-title">
            <DashboardOutlined style={{ fontSize: 24, marginRight: 10, color: 'var(--header-text-light)' }} />
            <span>BorrowX – Smart Campus Borrowing</span>
          </div>
          <Space size={16} align="center">
            {/* Dark mode toggle */}
            <Tooltip title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}>
              <button
                onClick={toggleDarkMode}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center' }}
              >
                {isDark ? <BulbOutlined style={{ color: 'var(--header-text-light)' }} /> : <MoonOutlined style={{ color: 'var(--header-text-light)' }} />}
              </button>
            </Tooltip>

            {/* Notification bell */}
            <NotificationBell userId={user?.id} apiUrl={apiUrl} />

            <Dropdown overlay={userMenu}>
              <div className="user-info">
                <Avatar icon={<UserOutlined />} />
                <span>{user?.full_name || user?.name || 'Admin'}</span>
              </div>
            </Dropdown>
          </Space>
        </div>
      </Header>

      <Layout className="admin-body-shell" style={{ background: 'var(--card-bg)' }}>
        <Sider width={228} className="admin-sider">
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Brand */}
            <div className="borrowx-layout-brand" style={{ margin: '12px 10px' }}>
              <div className="borrowx-layout-brand__logo">B</div>
              <div className="borrowx-layout-brand__text">
                <strong>BorrowX</strong>
                <span>Smart Campus</span>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <Menu theme="light" mode="inline" selectedKeys={[activeTab]} onClick={(e) => setActiveTab(e.key)} items={siderItems} style={{ height: '100%', borderRight: 0 }} />
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>v2.0 – Smart Campus</div>
            </div>
          </div>
        </Sider>

        <Layout className="admin-content-shell">
          <Content className="admin-content" style={{ padding: '24px 28px' }}>
            {activeTab === 'overview' && renderDashboard()}

            {activeTab === 'requests' && (
              <Card title="📋 Danh Sách Yêu Cầu Mượn" className="content-card">
                <Table columns={requestColumns} dataSource={borrowRequests} rowKey="id" pagination={{ pageSize: 10 }} loading={loading} />
              </Card>
            )}

            {activeTab === 'equipment' && (
              <Card
                title="📦 Quản Lý Thiết Bị"
                extra={<Button type="primary" onClick={openAddEquipmentModal} icon={<BgColorsOutlined />}>Thêm Thiết Bị</Button>}
                className="content-card"
              >
                <Table columns={equipmentColumns} dataSource={equipment} rowKey="id" pagination={{ pageSize: 10 }} loading={loading} />
              </Card>
            )}

            {activeTab === 'calendar' && (
              <div>
                <h2 style={{ marginBottom: 16 }}><CalendarOutlined /> Lịch Mượn Thiết Bị</h2>
                <CalendarPage apiUrl={apiUrl} />
              </div>
            )}

            {activeTab === 'maintenance' && (
              <div>
                <h2 style={{ marginBottom: 16 }}><ToolOutlined /> Bảo Trì Thiết Bị</h2>
                <MaintenancePage apiUrl={apiUrl} />
              </div>
            )}

            {activeTab === 'tickets' && (
              <div>
                <h2 style={{ marginBottom: 16 }}><BugOutlined /> Ticket Báo Lỗi</h2>
                <TicketsPage apiUrl={apiUrl} />
              </div>
            )}

            {activeTab === 'penalties' && (
              <div>
                <h2 style={{ marginBottom: 16 }}><DollarOutlined /> Hệ Thống Phạt</h2>
                <PenaltiesPage apiUrl={apiUrl} />
              </div>
            )}

            {activeTab === 'users_trust' && (
              <Card title={<span><TeamOutlined /> Điểm Uy Tín Sinh Viên</span>} className="content-card">
                <Table
                  rowKey="id"
                  columns={trustColumns}
                  dataSource={usersWithTrust}
                  pagination={{ pageSize: 10 }}
                  size="small"
                />
              </Card>
            )}

            {activeTab === 'admin_email' && (
              <div>
                <h2 style={{ marginBottom: 16 }}><MailOutlined /> Email cảnh báo</h2>
                <AdminEmailWarningPanel apiUrl={apiUrl} onUnauthorized={handleUnauthorized} />
              </div>
            )}
          </Content>
        </Layout>
      </Layout>

      {/* Equipment Modal */}
      <Modal
        title={selectedEquipment ? 'Chỉnh Sửa Thiết Bị' : 'Thêm Thiết Bị'}
        visible={isEquipmentModalVisible}
        onCancel={() => { setIsEquipmentModalVisible(false); setSelectedEquipment(null); equipmentForm.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form form={equipmentForm} layout="vertical" onFinish={handleSaveEquipment}>
          <Form.Item label="Tên Thiết Bị" name="name" rules={[{ required: true, message: 'Vui lòng nhập tên thiết bị!' }]}>
            <Input placeholder="Nhập tên thiết bị" />
          </Form.Item>
          <Form.Item label="Danh Mục" name="category">
            <Input placeholder="Nhập danh mục thiết bị" />
          </Form.Item>
          <Form.Item label="Mô Tả" name="description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Nhập mô tả thiết bị" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Tổng Số Lượng" name="total_quantity" rules={[{ required: true }, { type: 'number', min: 1 }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Số Lượng Tồn Kho" name="available_quantity" rules={[{ required: true }, { type: 'number', min: 0 }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Link Ảnh (URL)" name="image_url">
            <Input placeholder="https://example.com/image.jpg" />
          </Form.Item>
          <Form.Item label="Trạng Thái" name="status">
            <Select placeholder="Chọn trạng thái" options={[
              { label: '✅ Còn hàng', value: 'available' },
              { label: '🔧 Bảo trì', value: 'maintenance' },
              { label: '❌ Không dùng', value: 'unavailable' },
            ]} />
          </Form.Item>
          <Form.Item label="Tình trạng thực tế" name="condition_status">
            <Select placeholder="Chọn tình trạng" options={[
              { label: '✨ Mới', value: 'new' },
              { label: '✅ Tốt', value: 'good' },
              { label: '⚠️ Hơi hỏng', value: 'fair' },
              { label: '🔴 Hỏng', value: 'broken' },
            ]} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              {selectedEquipment ? 'Cập Nhật Thiết Bị' : 'Thêm Thiết Bị'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Equipment Detail Modal */}
      <Modal
        title="Chi Tiết Thiết Bị"
        visible={isEquipmentDetailModalVisible}
        onCancel={() => setIsEquipmentDetailModalVisible(false)}
        footer={null}
        width={600}
        confirmLoading={equipmentDetailLoading}
        destroyOnClose
      >
        {selectedEquipmentDetail && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {selectedEquipmentDetail.image_url && (
              <img src={selectedEquipmentDetail.image_url} style={{ width: '100%', borderRadius: 12, maxHeight: 200, objectFit: 'cover' }} alt="" />
            )}
            <Card size="small">
              {[
                ['Mã thiết bị', `#${selectedEquipmentDetail.id}`],
                ['Tên thiết bị', selectedEquipmentDetail.name],
                ['Danh mục', selectedEquipmentDetail.category || '—'],
                ['Mô tả', selectedEquipmentDetail.description || '—'],
                ['Tổng số lượng', selectedEquipmentDetail.total_quantity],
                ['Còn lại', selectedEquipmentDetail.available_quantity],
                ['Đang mượn', selectedEquipmentDetail.total_quantity - selectedEquipmentDetail.available_quantity],
                ['Trạng thái', selectedEquipmentDetail.status || '—'],
              ].map(([label, value]) => (
                <p key={String(label)} style={{ margin: '6px 0' }}>
                  <strong>{label}:</strong> {value}
                </p>
              ))}
            </Card>
          </Space>
        )}
      </Modal>

      {/* Request Detail Modal */}
      <Modal
        title="Chi Tiết Yêu Cầu Mượn"
        visible={isRequestDetailModalVisible}
        onCancel={() => setIsRequestDetailModalVisible(false)}
        footer={null}
        width={720}
        confirmLoading={requestDetailLoading}
        destroyOnClose
      >
        {selectedRequestDetail && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Card size="small">
              {[
                ['Mã yêu cầu', `#${selectedRequestDetail.id}`],
                ['Mã người dùng', selectedRequestDetail.user_id],
                ['Ngày mượn', selectedRequestDetail.borrow_date],
                ['Ngày trả dự kiến', selectedRequestDetail.expected_return_date],
                ['Ngày trả thực tế', selectedRequestDetail.actual_return_date || '—'],
                ['Ghi chú', selectedRequestDetail.note || '—'],
              ].map(([label, value]) => (
                <p key={String(label)} style={{ margin: '6px 0' }}>
                  <strong>{label}:</strong> {value}
                </p>
              ))}
              <p style={{ margin: '6px 0' }}>
                <strong>Trạng thái:</strong> {statusBadge(selectedRequestDetail.status)}
              </p>
            </Card>
            <Card title="Danh sách thiết bị" size="small">
              <Table
                rowKey="id"
                dataSource={selectedRequestDetail.items || []}
                pagination={false}
                columns={[
                  { title: 'Mã thiết bị', dataIndex: 'equipment_id', key: 'equipment_id' },
                  { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity' },
                ]}
                size="small"
              />
            </Card>
            {selectedRequestDetail.status === 'approved' && (
              <Button type="primary" block onClick={() => { handleMarkBorrowed(selectedRequestDetail.id); setIsRequestDetailModalVisible(false); }}>
                Ghi Nhận Thiết Bị Đã Được Lấy
              </Button>
            )}
          </Space>
        )}
      </Modal>

      {/* Floating ChatBot */}
      <ChatBot apiUrl={apiUrl} />
    </Layout>
  );
};

export default Admin;