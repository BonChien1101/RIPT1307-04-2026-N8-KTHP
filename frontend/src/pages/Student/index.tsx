import React, { useState, useEffect } from 'react';
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
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'umi';
import './styles.less';

const { Header, Content, Sider } = Layout;

interface Equipment {
  id: number;
  name: string;
  quantity: number;
  borrowed: number;
  status: 'available' | 'low_stock' | 'out_of_stock';
  description: string;
}

interface BorrowRequest {
  id: number;
  equipmentName: string;
  quantity: number;
  borrowDate: string;
  returnDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  studentName: string;
}

const Student: React.FC = () => {
  const [activeTab, setActiveTab] = useState('equipment');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [borrowHistory, setBorrowHistory] = useState<BorrowRequest[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/');
    }

    fetchEquipment();
    fetchBorrowHistory();
  }, []);

  const fetchEquipment = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/equipment', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setEquipment(data);
      }
    } catch (error) {
      message.error('Lỗi tải danh sách thiết bị!');
    }
  };

  const fetchBorrowHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/borrow/history', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBorrowHistory(data);
      }
    } catch (error) {
      message.error('Lỗi tải lịch sử mượn!');
    }
  };

  const handleBorrowClick = (equip: Equipment) => {
    if (equip.quantity - equip.borrowed <= 0) {
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
      const response = await fetch('http://localhost:5000/api/borrow/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          equipmentId: selectedEquipment.id,
          quantity: values.quantity,
          borrowDate: values.borrowDate,
          returnDate: values.returnDate,
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
    navigate('/');
    window.location.reload();
  };

  const equipmentColumns = [
    { title: 'Tên Thiết Bị', dataIndex: 'name', key: 'name', render: (text: string) => <strong>{text}</strong> },
    { title: 'Mô Tả', dataIndex: 'description', key: 'description' },
    {
      title: 'Số Lượng Có Sẵn',
      key: 'quantity',
      render: (_: any, record: Equipment) => {
        const available = record.quantity - record.borrowed;
        const status = available === 0 ? 'error' : available <= 2 ? 'warning' : 'success';
        return <Badge status={status} text={`${available} / ${record.quantity}`} />;
      },
    },
    {
      title: 'Hành Động',
      key: 'action',
      render: (_: any, record: Equipment) => (
        <Button type="primary" size="small" onClick={() => handleBorrowClick(record)} disabled={record.quantity - record.borrowed <= 0}>
          Mượn
        </Button>
      ),
    },
  ];

  const borrowHistoryColumns = [
    { title: 'Thiết Bị', dataIndex: 'equipmentName', key: 'equipmentName' },
    { title: 'Số Lượng', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Ngày Mượn', dataIndex: 'borrowDate', key: 'borrowDate' },
    { title: 'Ngày Trả', dataIndex: 'returnDate', key: 'returnDate' },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: any = {
          pending: <Badge status="processing" text="Chờ Phê Duyệt" />,
          approved: <Badge status="success" text="Đã Phê Duyệt" />,
          rejected: <Badge status="error" text="Bị Từ Chối" />,
          returned: <Badge status="default" text="Đã Trả" />,
        };
        return statusMap[status] || status;
      },
    },
  ];

  const userMenu = <Menu><Menu.Item key="logout" onClick={handleLogout}><LogoutOutlined /> Đăng Xuất</Menu.Item></Menu>;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="student-header">
        <div className="header-content">
          <div className="header-title">
            <HomeOutlined style={{ fontSize: 24, marginRight: 10 }} />
            <span>Hệ Thống Quản Lý Mượn Đồ Dùng - Sinh Viên</span>
          </div>
          <Dropdown overlay={userMenu}>
            <div className="user-info">
              <Avatar icon={<UserOutlined />} />
              <span style={{ marginLeft: 10 }}>{user?.name || 'Sinh Viên'}</span>
            </div>
          </Dropdown>
        </div>
      </Header>

      <Layout>
        <Sider width={200} className="student-sider">
          <Menu mode="inline" selectedKeys={[activeTab]} onClick={(e) => setActiveTab(e.key)} style={{ height: '100%', borderRight: 0 }}>
            <Menu.Item key="equipment" icon={<HomeOutlined />}>Danh Sách Thiết Bị</Menu.Item>
            <Menu.Item key="history" icon={<ClockCircleOutlined />}>Lịch Sử Mượn</Menu.Item>
          </Menu>
        </Sider>

        <Layout>
          <Content style={{ padding: '24px' }}>
            {activeTab === 'equipment' && (<Card title="Danh Sách Thiết Bị Có Sẵn" className="content-card"><Table columns={equipmentColumns} dataSource={equipment} rowKey="id" pagination={{ pageSize: 10 }} loading={loading} /></Card>)}
            {activeTab === 'history' && (<Card title="Lịch Sử Yêu Cầu Mượn" className="content-card"><Table columns={borrowHistoryColumns} dataSource={borrowHistory} rowKey="id" pagination={{ pageSize: 10 }} loading={loading} /></Card>)}
          </Content>
        </Layout>
      </Layout>

      <Modal title="Gửi Yêu Cầu Mượn" visible={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleBorrowSubmit}>
          <Form.Item label="Thiết Bị"><strong>{selectedEquipment?.name}</strong></Form.Item>
          <Form.Item label="Số Lượng" name="quantity" rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}><InputNumber min={1} max={selectedEquipment ? selectedEquipment.quantity - selectedEquipment.borrowed : 1} /></Form.Item>
          <Form.Item label="Ngày Mượn" name="borrowDate" rules={[{ required: true, message: 'Vui lòng chọn ngày mượn!' }]}><input type="date" /></Form.Item>
          <Form.Item label="Ngày Trả" name="returnDate" rules={[{ required: true, message: 'Vui lòng chọn ngày trả!' }]}><input type="date" /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block loading={loading}>Gửi Yêu Cầu</Button></Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Student;
