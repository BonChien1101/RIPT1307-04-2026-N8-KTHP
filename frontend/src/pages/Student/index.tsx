import React, { useState, useEffect, useContext } from 'react';
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
  Popconfirm,
  Avatar,
  Dropdown,
} from 'antd';
import {
  HomeOutlined,
  LogoutOutlined,
  UserOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BgColorsOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import './styles.less';
import { isAdminRole } from '../../utils/auth';

const { Header, Content, Sider } = Layout;

interface Equipment {
  id: number;
  name: string;
  total_quantity: number;
  available_quantity: number;
  status: 'available' | 'low_stock' | 'out_of_stock';
  description: string;
}

interface BorrowRequest {
  id: number;
  borrow_date: string;
  expected_return_date: string;
  actual_return_date?: string;
  status: 'pending' | 'approved' | 'rejected' | 'borrowed' | 'returned';
}

const Student: React.FC = () => {
  const [activeTab, setActiveTab] = useState('equipment');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [borrowHistory, setBorrowHistory] = useState<BorrowRequest[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const apiUrl = `${process.env.API_URL}/api`;

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData && userData !== 'undefined' && userData !== 'null') {
      try {
        const parsedUser = JSON.parse(userData);
        if (isAdminRole(parsedUser.role)) {
          window.location.hash = '#/admin';
          return;
        }
        setUser(parsedUser);
      } catch (error) {
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
  }, []);

  const fetchEquipment = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/equipments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const payload = await response.json();
        setEquipment(payload?.data || []);
      }
    } catch (error) {
      message.error('Lỗi tải danh sách thiết bị!');
    }
  };

  const fetchBorrowHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/borrow-requests/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const payload = await response.json();
        setBorrowHistory(payload?.data || []);
      }
    } catch (error) {
      message.error('Lỗi tải lịch sử mượn!');
    }
  };

  const handleBorrowClick = (equip: Equipment) => {
    if (equip.available_quantity <= 0) {
      message.warning('Thiết bị này hiện đã hết hàng!');
      return;
    }
    setSelectedEquipment(equip);
    setIsModalVisible(true);
  };

  const handleBorrowSubmit = async (values: any) => {
    if (!selectedEquipment) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/borrow-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          borrow_date: values.borrowDate,
          expected_return_date: values.returnDate,
          items: [
            {
              equipment_id: selectedEquipment.id,
              quantity: values.quantity,
            },
          ],
        }),
      });

      if (response.ok) {
        message.success('Gửi yêu cầu mượn thành công!');
        setIsModalVisible(false);
        form.resetFields();
        fetchBorrowHistory();
      } else {
        message.error('Gửi yêu cầu mượn thất bại!');
      }
    } catch (error) {
      message.error('Lỗi kết nối!');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    message.success('Đã đăng xuất!');
    window.location.hash = '#/';
    window.location.reload();
  };

  const equipmentColumns = [
    { title: 'Tên Thiết Bị', dataIndex: 'name', key: 'name', render: (text: string) => <strong>{text}</strong> },
    { title: 'Mô Tả', dataIndex: 'description', key: 'description' },
    {
      title: 'Số Lượng Có Sẵn',
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
        <Button type="primary" size="small" onClick={() => handleBorrowClick(record)} disabled={record.available_quantity <= 0}>
          Mượn
        </Button>
      ),
    },
  ];

  const borrowHistoryColumns = [
    { title: 'Mã Yêu Cầu', dataIndex: 'id', key: 'id' },
    { title: 'Ngày Mượn', dataIndex: 'borrow_date', key: 'borrow_date' },
    { title: 'Ngày Trả Dự Kiến', dataIndex: 'expected_return_date', key: 'expected_return_date' },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: any = {
          pending: <Badge status="processing" text="Chờ Phê Duyệt" />,
          approved: <Badge status="success" text="Đã Phê Duyệt" />,
          borrowed: <Badge status="warning" text="Đang Mượn" />,
          rejected: <Badge status="error" text="Bị Từ Chối" />,
          returned: <Badge status="default" text="Đã Trả" />,
        };
        return statusMap[status] || status;
      },
    },
  ];

  const userMenuItems = [{ key: 'logout', icon: <LogoutOutlined />, label: 'Đăng Xuất' }];
  const userMenu = (
    <Menu
      items={userMenuItems}
      onClick={(e) => {
        if (e.key === 'logout') handleLogout();
      }}
    />
  );
  const siderItems = [
    { key: 'equipment', icon: <HomeOutlined />, label: 'Danh Sách Thiết Bị' },
    { key: 'history', icon: <ClockCircleOutlined />, label: 'Lịch Sử Mượn' },
  ];

  return (
    <Layout className="student-page-shell" style={{ minHeight: '100vh' }}>
      <Header className="student-header">
        <div className="header-content">
          <div className="header-title">
            <HomeOutlined style={{ fontSize: 24, marginRight: 10 }} />
            <span>BorrowX - Cổng Sinh Viên</span>
          </div>
          <Dropdown overlay={userMenu}>
            <div className="user-info">
              <Avatar icon={<UserOutlined />} />
              <span style={{ marginLeft: 10 }}>{user?.full_name || user?.name || 'Sinh Viên'}</span>
            </div>
          </Dropdown>
        </div>
      </Header>

      <Layout className="student-body-shell">
        <Sider width={228} className="student-sider">
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1 }}>
              <Menu mode="inline" selectedKeys={[activeTab]} onClick={(e) => setActiveTab(e.key)} items={siderItems} style={{ height: '100%', borderRight: 0 }} />
            </div>
            <div style={{ padding: 12, borderTop: '1px solid rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="text-muted">Giao diện</span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>Sáng mặc định</span>
              </div>
            </div>
          </div>
        </Sider>

        <Layout className="student-content-shell">
          <Content className="student-content" style={{ padding: '24px 28px' }}>
            {activeTab === 'equipment' && (<Card title="Danh Sách Thiết Bị Có Sẵn" className="content-card"><Table columns={equipmentColumns} dataSource={equipment} rowKey="id" pagination={{ pageSize: 10 }} loading={loading} /></Card>)}
            {activeTab === 'history' && (<Card title="Lịch Sử Yêu Cầu Mượn" className="content-card"><Table columns={borrowHistoryColumns} dataSource={borrowHistory} rowKey="id" pagination={{ pageSize: 10 }} loading={loading} /></Card>)}
          </Content>
        </Layout>
      </Layout>

      <Modal title="Gửi Yêu Cầu Mượn" visible={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleBorrowSubmit}>
          <Form.Item label="Thiết Bị"><strong>{selectedEquipment?.name}</strong></Form.Item>
          <Form.Item label="Số Lượng" name="quantity" rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}><InputNumber min={1} max={selectedEquipment ? selectedEquipment.available_quantity : 1} /></Form.Item>
          <Form.Item label="Ngày Mượn" name="borrowDate" rules={[{ required: true, message: 'Vui lòng chọn ngày mượn!' }]}><input type="date" /></Form.Item>
          <Form.Item label="Ngày Trả" name="returnDate" rules={[{ required: true, message: 'Vui lòng chọn ngày trả!' }]}><input type="date" /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block loading={loading}>Gửi Yêu Cầu</Button></Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Student;
