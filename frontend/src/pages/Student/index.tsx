import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Menu,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Select,
  InputNumber,
  message,
  Statistic,
  Row,
  Col,
  Badge,
  Avatar,
  Dropdown,
  Space,
  Input,
  Rate,
  Tag,
  Tooltip,
  Progress,
  Spin,
  Popconfirm,
} from 'antd';
import {
  HomeOutlined,
  LogoutOutlined,
  UserOutlined,
  ClockCircleOutlined,
  BgColorsOutlined,
  ExclamationCircleOutlined,
  QrcodeOutlined,
  StarOutlined,
  BugOutlined,
  TrophyOutlined,
  SearchOutlined,
  BulbOutlined,
  PlusCircleOutlined,
  SendOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import './styles.less';
import { isAdminRole } from '../../utils/auth';
import { getApiUrl, resolveApiHost } from '../../utils/api';


import NotificationBell from '../../components/NotificationBell';
import TrustBadge from '../../components/TrustBadge';
import Profile from '../Profile';
import QRModal from '../../components/QRModal';
import SignaturePad from '../../components/SignaturePad';
import ChatBot from '../../components/ChatBot';
import Product3DViewer from '../../components/Product3DViewer';

const { Header, Content, Sider } = Layout;
const { Option } = Select;

interface Equipment {
  id: number;
  name: string;
  total_quantity: number;
  available_quantity: number;
  status: 'available' | 'maintenance' | 'unavailable';
  description: string;
  image_url?: string;
  category?: string;
  condition_status?: string;
  rating_avg?: number;
  rating_count?: number;
}

interface BorrowRequest {
  id: number;
  borrow_date: string;
  expected_return_date: string;
  actual_return_date?: string;
  status: 'pending' | 'approved' | 'rejected' | 'borrowed' | 'returned' | 'overdue';
  note?: string;
}

interface AiSuggestion {
  name: string;
  reason: string;
  equipment: string[];
}

interface ComboItem {
  combo_id: number;
  equipment_id: number;
  quantity: number;
  equipment_name?: string;
}

interface Combo {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  items?: ComboItem[];
  available?: boolean;
}

const FALLBACK_EQUIPMENT_IMAGES = [
  {
    keywords: ['camera', 'media', 'may anh', 'may quay', 'canon', 'sony'],
    url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
  },
  {
    keywords: ['audio', 'micro', 'loa', 'am thanh', 'mixer'],
    url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
  },
  {
    keywords: ['presentation', 'projector', 'may chieu', 'trinh chieu'],
    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    keywords: ['computer', 'laptop', 'may tinh'],
    url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80',
  },
  {
    keywords: ['tripod', 'gimbal', 'phu kien', 'chan may'],
    url: 'https://images.unsplash.com/photo-1519638831568-d9897f54ed69?auto=format&fit=crop&w=1200&q=80',
  },
];

const normalizeImageText = (value?: string) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getFallbackEquipmentImage = (item?: Partial<Equipment>) => {
  const haystack = normalizeImageText([item?.name, item?.category, item?.description].filter(Boolean).join(' '));
  const match = FALLBACK_EQUIPMENT_IMAGES.find((entry) => entry.keywords.some((keyword) => haystack.includes(keyword)));
  return (match || FALLBACK_EQUIPMENT_IMAGES[0]).url;
};

const resolveEquipmentImageUrl = (item: Partial<Equipment>) => {
  const raw = String(item.image_url || '').trim();
  if (!raw) return getFallbackEquipmentImage(item);
  if (/^(https?:)?\/\//i.test(raw) || /^data:/i.test(raw) || /^blob:/i.test(raw)) return raw;
  const origin = resolveApiHost();
  if (raw.startsWith('/')) return `${origin}${raw}`;
  return `${origin}/${raw.replace(/^\/+/, '')}`;
};

// Dark mode helpers
const getDarkMode = () => { try { return localStorage.getItem('borrowx_dark') === '1'; } catch { return false; } };
const applyDarkMode = (val: boolean) => {
  localStorage.setItem('borrowx_dark', val ? '1' : '0');
  document.documentElement.setAttribute('data-theme', val ? 'dark' : 'light');
};

const Student: React.FC = () => {
  const [activeTab, setActiveTab] = useState('equipment');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [borrowHistory, setBorrowHistory] = useState<BorrowRequest[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [isTicketModalVisible, setIsTicketModalVisible] = useState(false);
  const [isReturnModalVisible, setIsReturnModalVisible] = useState(false);
  const [is3DModalVisible, setIs3DModalVisible] = useState(false);
  const [selected3DEquipment, setSelected3DEquipment] = useState<Equipment | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedBorrowForReview, setSelectedBorrowForReview] = useState<BorrowRequest | null>(null);
  const [selectedBorrowForReturn, setSelectedBorrowForReturn] = useState<BorrowRequest | null>(null);
  const [form] = Form.useForm();
  const [reviewForm] = Form.useForm();
  const [ticketForm] = Form.useForm();
  const [returnForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isDark, setIsDark] = useState(getDarkMode());
  const [searchQ, setSearchQ] = useState('');
  const [trustInfo, setTrustInfo] = useState<any>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [myQueue, setMyQueue] = useState<any[]>([]);
  const [signature, setSignature] = useState<string>('');
  const [combos, setCombos] = useState<Combo[]>([]);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
  const [isComboModalVisible, setIsComboModalVisible] = useState(false);
  const [comboBorrowForm] = Form.useForm();
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  const apiUrl = getApiUrl();

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    message.warning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    window.location.hash = '#/';
    window.location.reload();
  }, []);

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    applyDarkMode(next);
  };

  useEffect(() => {
    applyDarkMode(isDark);
  }, [isDark]);

  useEffect(() => {
    const handleUserUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setUser(customEvent.detail);
      }
    };
    window.addEventListener('userUpdated', handleUserUpdated);

    const userData = localStorage.getItem('user');
    if (userData && userData !== 'undefined' && userData !== 'null') {
      try {
        const parsedUser = JSON.parse(userData);
        if (isAdminRole(parsedUser.role)) { window.location.hash = '#/admin'; return; }
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
    fetchEquipment();
    fetchBorrowHistory();
    fetchTrustInfo();
    fetchAiSuggestions();
    fetchMyQueue();
    fetchCombos();

    return () => {
      window.removeEventListener('userUpdated', handleUserUpdated);
    };
  }, []);

  // Filter equipment on search
  useEffect(() => {
    if (!searchQ.trim()) {
      setFilteredEquipment(equipment);
    } else {
      setFilteredEquipment(equipment.filter((e) =>
        e.name.toLowerCase().includes(searchQ.toLowerCase()) ||
        (e.category || '').toLowerCase().includes(searchQ.toLowerCase())
      ));
    }
  }, [searchQ, equipment]);

  const fetchEquipment = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/equipments`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (response.ok) {
        const payload = await response.json();
        const normalizedEquipment = (payload?.data || []).map((item: Equipment) => ({
          ...item,
          image_url: resolveEquipmentImageUrl(item),
        }));
        setEquipment(normalizedEquipment);
      }
    } catch { message.error('Lỗi tải danh sách thiết bị!'); }
  };

  const fetchBorrowHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/borrow-requests/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (response.ok) { const payload = await response.json(); setBorrowHistory(payload?.data || []); }
    } catch { message.error('Lỗi tải lịch sử mượn!'); }
  };

  const fetchTrustInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/trust/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setTrustInfo(data?.data); }
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

  const fetchMyQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/queue/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setMyQueue(data?.data || []); }
    } catch {}
  };

  const fetchCombos = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/combos`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setCombos(data?.data || []); }
    } catch {}
  };

  const handleBorrowClick = (equip: Equipment) => {
    setSelectedEquipment(equip);
    form.resetFields();
    setSignature('');
    setIsModalVisible(true);
  };

  const handleJoinQueue = async (equipmentId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/queue/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ equipment_id: equipmentId }),
      });
      if (res.ok) {
        message.success('Đã đặt trước! Bạn sẽ được thông báo khi thiết bị trả lại.');
        fetchMyQueue();
      } else {
        let detail = '';
        try {
          const data = await res.json();
          // eslint-disable-next-line no-console
          console.error('[Student.handleJoinQueue] API error', res.status, data);
          detail = data?.message || data?.error || data?.code || '';
        } catch {
          try {
            const text = await res.text();
            // eslint-disable-next-line no-console
            console.error('[Student.handleJoinQueue] API error', res.status, text);
            detail = text;
          } catch {}
        }
        message.warning(detail ? `Không thể đặt trước: ${detail}` : `Không thể đặt trước (${res.status})`);
      }
    } catch { message.error('Lỗi kết nối!'); }
  };

  const handleBorrowSubmit = async (values: any) => {
    if (!selectedEquipment) return;
    if (!signature) {
      message.warning('Vui lòng ký xác nhận trước khi gửi yêu cầu!');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/borrow-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          borrow_date: values.borrowDate,
          expected_return_date: values.returnDate,
          note: values.note,
          items: [{ equipment_id: selectedEquipment.id, quantity: values.quantity }],
        }),
      });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (response.ok) {
        const data = await response.json();
        // Save signature
        if (signature && data?.data?.id) {
          const token2 = localStorage.getItem('token');
          await fetch(`${apiUrl}/signatures`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token2}` },
            body: JSON.stringify({ borrow_request_id: data.data.id, signature_data: signature }),
          });
        }
        message.success('Gửi yêu cầu mượn thành công!');
        setIsModalVisible(false);
        form.resetFields();
        setSignature('');
        fetchBorrowHistory();
        fetchEquipment();
      } else {
        const errData = await response.json();
        message.error(errData?.message || 'Gửi yêu cầu mượn thất bại!');
      }
    } catch { message.error('Lỗi kết nối!'); }
    finally { setLoading(false); }
  };

  const handleBorrowComboClick = (combo: Combo) => {
    setSelectedCombo(combo);
    comboBorrowForm.resetFields();
    setIsComboModalVisible(true);
  };

  const handleBorrowComboSubmit = async (values: any) => {
    if (!selectedCombo) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/combos/${selectedCombo.id}/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          borrow_date: values.borrowDate,
          expected_return_date: values.returnDate,
          note: values.note,
        }),
      });
      if (response.status === 401) { handleUnauthorized(); return; }
      if (response.ok) {
        message.success('Đã tạo yêu cầu mượn combo!');
        setIsComboModalVisible(false);
        comboBorrowForm.resetFields();
        fetchBorrowHistory();
        setActiveTab('history');
      } else {
        const data = await response.json().catch(() => null);
        message.warning(data?.message || 'Không thể mượn combo!');
      }
    } catch {
      message.error('Lỗi kết nối server!');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (values: any) => {
    if (!selectedBorrowForReview) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          equipment_id: values.equipment_id,
          borrow_request_id: selectedBorrowForReview.id,
          rating: values.rating,
          comment: values.comment,
        }),
      });
      if (res.ok) {
        message.success('Cảm ơn bạn đã đánh giá thiết bị!');
        setIsReviewModalVisible(false);
        reviewForm.resetFields();
      } else { message.error('Gửi đánh giá thất bại!'); }
    } catch {}
    setLoading(false);
  };

  const handleTicketSubmit = async (values: any) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success('Đã gửi báo cáo lỗi!');
        setIsTicketModalVisible(false);
        ticketForm.resetFields();
      } else { message.error('Gửi báo cáo thất bại!'); }
    } catch {}
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    message.success('Đã đăng xuất!');
    window.location.hash = '#/';
    window.location.reload();
  };

  const exportPDF = async (requestId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/export/borrow/${requestId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `phieu-muon-${requestId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { message.error('Xuất PDF thất bại!'); }
  };

  // ============ STATUS ============
  const statusBadge = (status: string, record?: BorrowRequest) => {
    const isOverdue = status === 'overdue' || Number((record as any)?.is_overdue) === 1;
    const map: Record<string, JSX.Element> = {
      pending: <Badge status="processing" text="Chờ Phê Duyệt" />,
      approved: <Badge status="success" text="Đã Phê Duyệt" />,
      borrowed: <Badge status="warning" text="Đang Mượn" />,
      rejected: <Badge status="error" text="Bị Từ Chối" />,
      returned: <Badge status="default" text="Đã Trả" />,
      overdue: <Badge color="red" text="Quá Hạn" />,
    };
    if (isOverdue) return map.overdue;
    return map[status] || <Badge status="default" text={status} />;
  };

  // ============ EQUIPMENT CARD ============
  const EquipmentCard: React.FC<{ item: Equipment }> = ({ item }) => {
    const isAvailable = item.available_quantity > 0 && item.status === 'available';
    const alreadyQueued = myQueue.some((q: any) => q.equipment_id === item.id);
    return (
      <div className="equipment-card animate-fade-in">
        {/* 3D Preview button overlay */}
        <div
          className="equipment-card__image"
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => { setSelected3DEquipment(item); setIs3DModalVisible(true); }}
        >
          {item.image_url ? (
            <img
              src={resolveEquipmentImageUrl(item)}
              alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(event) => {
                const fallbackUrl = getFallbackEquipmentImage(item);
                if (event.currentTarget.src !== fallbackUrl) event.currentTarget.src = fallbackUrl;
              }}
            />
          ) : (
            <span style={{ fontSize: 48 }}>📦</span>
          )}
          {/* 3D hover hint */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(7,15,28,0.55)', opacity: 0, transition: 'opacity 0.25s ease',
            borderRadius: '20px 20px 0 0', backdropFilter: 'blur(4px)',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0'; }}
          >
            <div style={{ textAlign: 'center', color: '#fff' }}>
              <div style={{ fontSize: 28 }}>🔄</div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', marginTop: 4 }}>XEM 3D</div>
            </div>
          </div>
        </div>
        <div className="equipment-card__body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div className="equipment-card__name">{item.name}</div>
            {item.condition_status && (
              <span className={`condition-badge condition-badge--${item.condition_status}`}>{item.condition_status}</span>
            )}
          </div>
          {item.category && <Tag style={{ marginBottom: 8, fontSize: 11 }}>{item.category}</Tag>}
          <div className="equipment-card__desc">{item.description || 'Không có mô tả'}</div>

          {item.rating_avg && item.rating_avg > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              <Rate disabled value={item.rating_avg} style={{ fontSize: 12 }} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>({item.rating_count})</span>
            </div>
          ) : null}

          <div className="equipment-card__footer">
            <div className="equipment-card__qty">
              <strong>{item.available_quantity}</strong>/{item.total_quantity} còn lại
            </div>
            <Space>
              <QRModal equipmentId={item.id} equipmentName={item.name} apiUrl={apiUrl} />
              {isAvailable ? (
                <Button
                  type="primary"
                  size="small"
                  onClick={() => handleBorrowClick(item)}
                  id={`borrow-btn-${item.id}`}
                >
                  Mượn
                </Button>
              ) : (
                <Tooltip title={alreadyQueued ? 'Đã đặt trước' : 'Thiết bị đang hết. Đặt trước để nhận thông báo!'}>
                  <Button
                    size="small"
                    type={alreadyQueued ? 'default' : 'dashed'}
                    disabled={alreadyQueued}
                    onClick={() => !alreadyQueued && handleJoinQueue(item.id)}
                    id={`queue-btn-${item.id}`}
                  >
                    {alreadyQueued ? '✓ Đã đặt' : '📋 Đặt trước'}
                  </Button>
                </Tooltip>
              )}
            </Space>
          </div>
        </div>
      </div>
    );
  };

  // ============ BORROW HISTORY COLUMNS ============
  const borrowHistoryColumns = [
    { title: 'Mã', dataIndex: 'id', key: 'id', width: 60, render: (id: number) => `#${id}` },
    { title: 'Tên Thiết Bị', dataIndex: 'equipment_names', key: 'equipment_names', ellipsis: true, render: (v: string) => v ? <Tooltip title={v}><span>{v}</span></Tooltip> : <span style={{color:'var(--muted)'}}>—</span> },
    { title: 'Ngày Mượn', dataIndex: 'borrow_date', key: 'borrow_date' },
    { title: 'Ngày Trả Dự Kiến', dataIndex: 'expected_return_date', key: 'expected_return_date' },
    { title: 'Ngày Trả Thực Tế', dataIndex: 'actual_return_date', key: 'actual_return_date', render: (v: string) => v || '—' },
    { title: 'Trạng Thái', dataIndex: 'status', key: 'status', render: (status: string, record: BorrowRequest) => statusBadge(status, record) },
    {
      title: 'Hành Động',
      key: 'action',
      render: (_: any, record: BorrowRequest) => (
        <Space size="small">
          {record.status === 'returned' && (
            <Button size="small" icon={<StarOutlined />} onClick={() => { setSelectedBorrowForReview(record); setIsReviewModalVisible(true); }}>
              Đánh giá
            </Button>
          )}
          {(record.status === 'approved' || record.status === 'borrowed' || record.status === 'returned') && (
            <Button size="small" onClick={() => exportPDF(record.id)}>
              Xuất PDF
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // ============ SIDEBAR ============
  const siderItems = [
    { key: 'equipment', icon: <HomeOutlined />, label: 'Danh Sách Thiết Bị' },
    { key: 'combos', icon: <ThunderboltOutlined />, label: 'Combo Thiết Bị' },
    { key: 'history', icon: <ClockCircleOutlined />, label: 'Lịch Sử Mượn' },
    { key: 'profile', icon: <UserOutlined />, label: 'Thông Tin Cá Nhân' },
    { key: 'trust', icon: <TrophyOutlined />, label: 'Điểm Uy Tín' },
    { key: 'report', icon: <BugOutlined />, label: 'Báo Lỗi Thiết Bị' },
  ];

  const userMenuItems = [{ key: 'logout', icon: <LogoutOutlined />, label: 'Đăng Xuất' }];
  const userMenu = <Menu items={userMenuItems} onClick={(e) => { if (e.key === 'logout') handleLogout(); }} />;

  return (
    <Layout className="student-page-shell" style={{ minHeight: '100vh' }}>
      <Header className="student-header">
        <div className="header-content">
          <div className="header-title">
            <HomeOutlined style={{ fontSize: 24, marginRight: 10 }} />
            <span>BorrowX – Cổng Sinh Viên</span>
          </div>
          <Space size={16} align="center">
            {trustInfo && (
              <TrustBadge score={trustInfo.trust_score ?? 100} rank={trustInfo.trust_rank} size="sm" />
            )}
            <Tooltip title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}>
              <button
                onClick={toggleDarkMode}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center' }}
              >
                {isDark ? <BulbOutlined /> : <span style={{fontSize:18,lineHeight:1}}>🌙</span>}
              </button>
            </Tooltip>
            <NotificationBell userId={user?.id} apiUrl={apiUrl} />
            <Dropdown overlay={userMenu}>
              <div className="user-info" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '6px 10px', borderRadius: 8 }}>
                <Avatar icon={<UserOutlined />} />
                <span style={{ marginLeft: 10, color: '#fff' }}>{user?.full_name || user?.name || 'Sinh Viên'}</span>
              </div>
            </Dropdown>
          </Space>
        </div>
      </Header>

      <Layout className="student-body-shell">
        <Sider width={228} className="student-sider">
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="borrowx-layout-brand" style={{ margin: '12px 10px' }}>
              <div className="borrowx-layout-brand__logo">B</div>
              <div className="borrowx-layout-brand__text">
                <strong>BorrowX</strong>
                <span>Sinh viên</span>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <Menu mode="inline" selectedKeys={[activeTab]} onClick={(e) => setActiveTab(e.key)} items={siderItems} style={{ height: '100%', borderRight: 0 }} />
            </div>

            {trustInfo && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Điểm uy tín của bạn</div>
                <Progress
                  percent={trustInfo.trust_score ?? 100}
                  size="small"
                  strokeColor={trustInfo.trust_score >= 80 ? '#ffd700' : trustInfo.trust_score >= 50 ? '#7a7a8a' : '#cd7f32'}
                  showInfo={false}
                />
                <TrustBadge score={trustInfo.trust_score ?? 100} rank={trustInfo.trust_rank} size="sm" showScore={true} />
              </div>
            )}
          </div>
        </Sider>

        <Layout className="student-content-shell">
          <Content className="student-content" style={{ padding: '24px 28px' }}>

            {/* EQUIPMENT TAB */}
            {activeTab === 'equipment' && (
              <div>
                {/* AI Suggestion Panel */}
                {aiSuggestions.length > 0 && (
                  <Card
                    className="ai-suggestion-panel"
                    bodyStyle={{ padding: '12px 16px' }}
                    style={{ marginBottom: 20, borderRadius: 16 }}
                  >
                    <div className="ai-suggestion-panel__title">✨ AI Gợi ý – Combo thiết bị phổ biến</div>
                    <Spin spinning={aiLoading}>
                      <Row gutter={[12, 8]}>
                        {aiSuggestions.slice(0, 3).map((s, i) => (
                          <Col xs={24} sm={8} key={i}>
                            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>{s.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{s.reason}</div>
                            <div className="ai-suggestion-panel__tags">
                              {(s.equipment || []).map((eq, j) => (
                                <span key={j} className="ai-suggestion-panel__tag">{eq}</span>
                              ))}
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </Spin>
                  </Card>
                )}

                {/* Search + View toggle */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Input
                    placeholder="🔍 Tìm kiếm thiết bị..."
                    prefix={<SearchOutlined style={{ color: 'var(--muted)' }} />}
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    style={{ flex: 1, maxWidth: 400, borderRadius: 10 }}
                    allowClear
                  />
                  <Space>
                    <Button size="small" type={viewMode === 'card' ? 'primary' : 'default'} onClick={() => setViewMode('card')}>🃏 Card</Button>
                    <Button size="small" type={viewMode === 'table' ? 'primary' : 'default'} onClick={() => setViewMode('table')}>📋 Bảng</Button>
                  </Space>
                  <Button size="small" icon={<BugOutlined />} onClick={() => setIsTicketModalVisible(true)}>
                    Báo lỗi
                  </Button>
                </div>

                {/* Card View */}
                {viewMode === 'card' ? (
                  <div className="equipment-grid">
                    {filteredEquipment.map((item) => (
                      <EquipmentCard key={item.id} item={item} />
                    ))}
                    {filteredEquipment.length === 0 && (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
                        Không tìm thấy thiết bị nào 🔍
                      </div>
                    )}
                  </div>
                ) : (
                  <Card className="content-card">
                    <Table
                      columns={[
                        { title: 'Tên Thiết Bị', dataIndex: 'name', key: 'name', render: (text) => <strong>{text}</strong> },
                        { title: 'Danh mục', dataIndex: 'category', key: 'category', render: (v) => v || '—' },
                        { title: 'Mô Tả', dataIndex: 'description', key: 'description', ellipsis: true },
                        {
                          title: 'Số Lượng',
                          key: 'quantity',
                          render: (_: any, record: Equipment) => {
                            const available = record.available_quantity;
                            const status = available === 0 ? 'error' : available <= 2 ? 'warning' : 'success';
                            return <Badge status={status} text={`${available} / ${record.total_quantity}`} />;
                          },
                        },
                        {
                          title: 'Hành Động',
                          key: 'action',
                          render: (_: any, record: Equipment) => (
                            <Space size="small">
                              <QRModal equipmentId={record.id} equipmentName={record.name} apiUrl={apiUrl} />
                              <Button
                                type="primary"
                                size="small"
                                onClick={() => handleBorrowClick(record)}
                                disabled={record.available_quantity <= 0}
                              >
                                Mượn
                              </Button>
                            </Space>
                          ),
                        },
                      ]}
                      dataSource={filteredEquipment}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                    />
                  </Card>
                )}
              </div>
            )}

            {/* COMBOS TAB */}
            {activeTab === 'combos' && (
              <div>
                <Card title="⚡ Combo Thiết Bị" className="content-card" style={{ marginBottom: 16 }}>
                  <Row gutter={[16, 16]}>
                    {combos.map((combo) => (
                      <Col xs={24} md={12} lg={8} key={combo.id}>
                        <Card
                          hoverable
                          style={{ height: '100%', borderRadius: 16 }}
                          bodyStyle={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{combo.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{combo.description || 'Combo thiết bị'}</div>
                          <div>
                            {(combo.items || []).map((item) => (
                              <div key={`${combo.id}-${item.equipment_id}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                                <span>{item.equipment_name || `Thiết bị #${item.equipment_id}`}</span>
                                <Tag>x{item.quantity}</Tag>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                            <Tag color={combo.available ? 'green' : 'orange'}>{combo.available ? 'Sẵn sàng' : 'Thiếu hàng'}</Tag>
                            <Button type="primary" onClick={() => handleBorrowComboClick(combo)} disabled={!combo.available}>Mượn Combo</Button>
                          </div>
                        </Card>
                      </Col>
                    ))}
                    {combos.length === 0 && (
                      <Col span={24}>
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Chưa có combo nào.</div>
                      </Col>
                    )}
                  </Row>
                </Card>
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <Card title="📋 Lịch Sử Yêu Cầu Mượn" className="content-card">
                <Table
                  columns={borrowHistoryColumns}
                  dataSource={borrowHistory}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <Profile onBack={() => setActiveTab('equipment')} />
            )}

            {/* TRUST TAB */}
            {activeTab === 'trust' && (
              <div>
                <Card className="content-card" style={{ marginBottom: 16 }}>
                  <Row gutter={[24, 24]} align="middle">
                    <Col xs={24} md={12}>
                      <div style={{ textAlign: 'center', padding: 24 }}>
                        {trustInfo ? (
                          <>
                            <div style={{ fontSize: 72, marginBottom: 8 }}>
                              {trustInfo.trust_rank === 'gold' ? '🥇' : trustInfo.trust_rank === 'silver' ? '🥈' : '🥉'}
                            </div>
                            <TrustBadge score={trustInfo.trust_score ?? 100} rank={trustInfo.trust_rank} size="lg" />
                            <div style={{ marginTop: 16 }}>
                              <Progress
                                type="circle"
                                percent={trustInfo.trust_score ?? 100}
                                strokeColor={
                                  trustInfo.trust_rank === 'gold' ? '#ffd700' :
                                  trustInfo.trust_rank === 'silver' ? '#a8a9ad' : '#cd7f32'
                                }
                                format={(p) => <span style={{ fontWeight: 700, fontSize: 22, color: 'var(--text)' }}>{p}đ</span>}
                              />
                            </div>
                          </>
                        ) : (
                          <Spin />
                        )}
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <h3>Hệ thống điểm uy tín</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { icon: '✅', text: 'Trả đúng hạn', points: '+10 điểm', color: '#12b76a' },
                          { icon: '⏰', text: 'Trả trễ', points: '-20 điểm', color: '#f79009' },
                          { icon: '💔', text: 'Làm hỏng thiết bị', points: '-50 điểm', color: '#f04438' },
                          { icon: '🥇', text: 'Hạng Gold (80+ điểm)', points: 'Ưu tiên duyệt tự động', color: '#b8860b' },
                          { icon: '🥈', text: 'Hạng Silver (50-79 điểm)', points: 'Ưu tiên duyệt', color: '#7a7a8a' },
                          { icon: '🥉', text: 'Hạng Bronze (0-49 điểm)', points: 'Chờ duyệt thường', color: '#cd7f32' },
                        ].map((item, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--muted-light)', borderRadius: 10 }}>
                            <span style={{ fontSize: 24 }}>{item.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600 }}>{item.text}</div>
                              <div style={{ fontSize: 12, color: item.color, fontWeight: 700 }}>{item.points}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Col>
                  </Row>
                </Card>
              </div>
            )}

            {/* REPORT TAB */}
            {activeTab === 'report' && (
              <Card title={<span><BugOutlined /> Báo Lỗi Thiết Bị</span>} className="content-card">
                <div style={{ textAlign: 'center', padding: '20px 0 30px' }}>
                  <div style={{ fontSize: 64, marginBottom: 12 }}>🔧</div>
                  <h3>Thiết bị gặp sự cố?</h3>
                  <p style={{ color: 'var(--muted)', maxWidth: 400, margin: '0 auto 20px' }}>
                    Hãy báo cáo để đội kỹ thuật xử lý nhanh nhất. Mỗi báo cáo giúp cải thiện trải nghiệm cho toàn bộ CLB!
                  </p>
                  <Button type="primary" size="large" icon={<BugOutlined />} onClick={() => setIsTicketModalVisible(true)}>
                    Tạo báo cáo lỗi
                  </Button>
                </div>
              </Card>
            )}

          </Content>
        </Layout>
      </Layout>

      {/* ===== BORROW MODAL ===== */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#c39b59,#8b6b31)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📤</div>
            <div>
              <div style={{ fontWeight: 700 }}>Gửi Yêu Cầu Mượn</div>
              <div style={{ fontSize: 12, fontWeight: 400, color: '#667085' }}>{selectedEquipment?.name}</div>
            </div>
          </div>
        }
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleBorrowSubmit}>
          {/* 3D Product Viewer in borrow modal */}
          {selectedEquipment && (
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
              <Product3DViewer
                imageUrl={selectedEquipment.image_url}
                name={selectedEquipment.name}
                size={180}
                autoRotate={true}
              />
            </div>
          )}
          <Form.Item label="Thiết Bị">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--muted-light)', borderRadius: 10 }}>
              <strong style={{ color: 'var(--text)' }}>{selectedEquipment?.name}</strong>
              <span style={{ fontSize: 12, color: '#12b76a', fontWeight: 700 }}>✅ Còn {selectedEquipment?.available_quantity}/{selectedEquipment?.total_quantity}</span>
            </div>
          </Form.Item>
          <Form.Item label="Số Lượng" name="quantity" initialValue={1} rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}>
            <InputNumber min={1} max={selectedEquipment ? selectedEquipment.available_quantity : 1} style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Ngày Mượn" name="borrowDate" rules={[{ required: true, message: 'Chọn ngày mượn!' }]}>
                <input type="date" style={{ width: '100%', padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--muted-light)', color: 'var(--text)' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Ngày Trả" name="returnDate" rules={[{ required: true, message: 'Chọn ngày trả!' }]}>
                <input type="date" style={{ width: '100%', padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--muted-light)', color: 'var(--text)' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Ghi chú" name="note">
            <Input.TextArea rows={2} placeholder="Mục đích sử dụng, yêu cầu đặc biệt..." />
          </Form.Item>
          <Form.Item label="✍️ Ký xác nhận mượn">
            <SignaturePad onSave={(dataUrl) => setSignature(dataUrl)} height={120} />
            {signature && <div style={{ color: '#12b76a', fontSize: 12, marginTop: 4 }}>✅ Đã ký xác nhận</div>}
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} size="large" icon={<SendOutlined />}>
              Gửi Yêu Cầu Mượn
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== COMBO BORROW MODAL ===== */}
      <Modal
        title={<span><ThunderboltOutlined /> Mượn Combo Thiết Bị</span>}
        visible={isComboModalVisible}
        onCancel={() => setIsComboModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={comboBorrowForm} layout="vertical" onFinish={handleBorrowComboSubmit}>
          <Form.Item label="Combo">
            <div style={{ padding: '10px 14px', background: 'var(--muted-light)', borderRadius: 10 }}>
              <strong>{selectedCombo?.name}</strong>
            </div>
          </Form.Item>
          <Form.Item label="Ngày Mượn" name="borrowDate" rules={[{ required: true, message: 'Chọn ngày mượn!' }]}>
            <input type="date" style={{ width: '100%', padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--muted-light)', color: 'var(--text)' }} />
          </Form.Item>
          <Form.Item label="Ngày Trả" name="returnDate" rules={[{ required: true, message: 'Chọn ngày trả!' }]}>
            <input type="date" style={{ width: '100%', padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--muted-light)', color: 'var(--text)' }} />
          </Form.Item>
          <Form.Item label="Ghi chú" name="note">
            <Input.TextArea rows={2} placeholder="Mục đích sử dụng combo..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} size="large" icon={<SendOutlined />}>
              Gửi Yêu Cầu Mượn Combo
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== 3D PRODUCT VIEWER MODAL ===== */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🔄</span>
            <div>
              <div style={{ fontWeight: 700 }}>Xem Thiết Bị 3D</div>
              <div style={{ fontSize: 12, fontWeight: 400, color: '#667085' }}>{selected3DEquipment?.name}</div>
            </div>
          </div>
        }
        visible={is3DModalVisible}
        onCancel={() => setIs3DModalVisible(false)}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button onClick={() => setIs3DModalVisible(false)}>Đóng</Button>
            {selected3DEquipment && selected3DEquipment.available_quantity > 0 && (
              <Button
                type="primary"
                onClick={() => {
                  setIs3DModalVisible(false);
                  handleBorrowClick(selected3DEquipment!);
                }}
              >
                📤 Mượn Ngay
              </Button>
            )}
          </div>
        }
        width={480}
        centered
        destroyOnClose
        bodyStyle={{ padding: '24px 24px 16px' }}
      >
        {selected3DEquipment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Product3DViewer
              imageUrl={selected3DEquipment.image_url}
              name={selected3DEquipment.name}
              size={220}
              autoRotate={true}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Danh mục', value: selected3DEquipment.category || 'Chưa phân loại' },
                { label: 'Tình trạng', value: selected3DEquipment.condition_status || 'Tốt' },
                { label: 'Số lượng', value: `${selected3DEquipment.available_quantity}/${selected3DEquipment.total_quantity} còn lại` },
                { label: 'Đánh giá', value: selected3DEquipment.rating_avg ? `${selected3DEquipment.rating_avg.toFixed(1)} ⭐ (${selected3DEquipment.rating_count})` : 'Chưa có đánh giá' },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '10px 14px', background: 'var(--muted-light)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{value}</div>
                </div>
              ))}
            </div>
            {selected3DEquipment.description && (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65 }}>
                {selected3DEquipment.description}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* ===== REVIEW MODAL ===== */}
      <Modal
        title={<span><StarOutlined /> Đánh Giá Thiết Bị</span>}
        visible={isReviewModalVisible}
        onCancel={() => setIsReviewModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={reviewForm} layout="vertical" onFinish={handleReviewSubmit}>
          <Form.Item label="Thiết bị (ID)" name="equipment_id" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Nhập ID thiết bị" />
          </Form.Item>
          <Form.Item label="Đánh giá" name="rating" rules={[{ required: true, message: 'Vui lòng chọn số sao!' }]}>
            <Rate />
          </Form.Item>
          <Form.Item label="Nhận xét" name="comment">
            <Input.TextArea rows={3} placeholder="Mic bị rè, máy ảnh pin yếu, tripod tốt..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>Gửi Đánh Giá</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== TICKET MODAL ===== */}
      <Modal
        title={<span><BugOutlined /> Báo Lỗi Thiết Bị</span>}
        visible={isTicketModalVisible}
        onCancel={() => setIsTicketModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={ticketForm} layout="vertical" onFinish={handleTicketSubmit}>
          <Form.Item label="Thiết bị (ID)" name="equipment_id" rules={[{ required: true }]}>
            <Select showSearch placeholder="Chọn thiết bị gặp lỗi" filterOption={(input, opt) => ((opt?.label as string)||'').toLowerCase().includes(input.toLowerCase())}
              options={equipment.map((e) => ({ value: e.id, label: e.name }))} />
          </Form.Item>
          <Form.Item label="Tiêu đề" name="title" rules={[{ required: true }]}>
            <Input placeholder="Mô tả ngắn về lỗi" />
          </Form.Item>
          <Form.Item label="Mô tả chi tiết" name="description">
            <Input.TextArea rows={3} placeholder="Lỗi xảy ra như thế nào, khi nào..." />
          </Form.Item>
          <Form.Item label="Mức độ ưu tiên" name="priority" initialValue="normal">
            <Select options={[
              { value: 'low', label: '🟢 Thấp' },
              { value: 'normal', label: '🔵 Bình thường' },
              { value: 'high', label: '🟠 Cao' },
              { value: 'urgent', label: '🔴 Khẩn cấp' },
            ]} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} danger>Gửi Báo Cáo</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Floating ChatBot */}
      <ChatBot apiUrl={apiUrl} />
    </Layout>
  );
};

export default Student;
