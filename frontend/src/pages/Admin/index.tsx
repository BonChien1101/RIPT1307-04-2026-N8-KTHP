import React, { useState, useEffect } from 'react';
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
} from 'antd';
import {
  DashboardOutlined,
  LogoutOutlined,
  UserOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  CloseCircleOutlined,
  SaveOutlined,
  BarChartOutlined,
  BgColorsOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'umi';
import UserManagement from './UserManagement/index';
import './styles.less';

const { Header, Content, Sider } = Layout;

interface Equipment {
  id: number;
  name: string;
  quantity: number;
  borrowed: number;
  description: string;
}

interface BorrowRequest {
  id: number;
  studentName: string;
  studentEmail: string;
  equipmentName: string;
  quantity: number;
  borrowDate: string;
  returnDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
}

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEquipmentModalVisible, setIsEquipmentModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [equipmentForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalEquipment: 0,
    totalBorrowed: 0,
    pendingRequests: 0,
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'admin') {
        navigate('/');
      }
      setUser(parsedUser);
    } else {
      navigate('/');
    }

    fetchBorrowRequests();
    fetchEquipment();
    fetchStats();
  }, []);

  const fetchBorrowRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/borrow/requests', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBorrowRequests(data);
      }
    } catch (error) {
      message.error('Lỗi tải danh sách yêu cầu!');
      console.error('Error fetching requests:', error);
    }
  };

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
      console.error('Error fetching equipment:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/statistics/overview', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleApprove = async (requestId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/borrow/${requestId}/approve`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        message.success('Phê duyệt yêu cầu thành công!');
        fetchBorrowRequests();
        fetchStats();
      } else {
        message.error('Phê duyệt yêu cầu thất bại!');
      }
    } catch (error) {
      message.error('Lỗi kết nối đến server!');
      console.error('Error approving request:', error);
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/borrow/${requestId}/reject`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        message.success('Từ chối yêu cầu thành công!');
        fetchBorrowRequests();
        fetchStats();
      } else {
        message.error('Từ chối yêu cầu thất bại!');
      }
    } catch (error) {
      message.error('Lỗi kết nối đến server!');
      console.error('Error rejecting request:', error);
    }
  };

  const handleAddEquipment = async (values: any) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/equipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success('Thêm thiết bị thành công!');
        setIsEquipmentModalVisible(false);
        equipmentForm.resetFields();
        fetchEquipment();
        fetchStats();
      } else {
        message.error('Thêm thiết bị thất bại!');
      }
    } catch (error) {
      message.error('Lỗi kết nối đến server!');
      console.error('Error adding equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEquipment = async (equipmentId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/equipment/${equipmentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        message.success('Xóa thiết bị thành công!');
        fetchEquipment();
        fetchStats();
      } else {
        message.error('Xóa thiết bị thất bại!');
      }
    } catch (error) {
      message.error('Lỗi kết nối đến server!');
      console.error('Error deleting equipment:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    message.success('Đã đăng xuất!');
    navigate('/');
    window.location.reload();
  };

  const requestColumns = [
    {
      title: 'Sinh Viên',
      dataIndex: 'studentName',
      key: 'studentName',
    },
    {
      title: 'Email',
      dataIndex: 'studentEmail',
      key: 'studentEmail',
    },
    {
      title: 'Thiết Bị',
      dataIndex: 'equipmentName',
      key: 'equipmentName',
    },
    {
      title: 'Số Lượng',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Ngày Mượn',
      dataIndex: 'borrowDate',
      key: 'borrowDate',
    },
    {
      title: 'Ngày Trả',
      dataIndex: 'returnDate',
      key: 'returnDate',
    },
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
    {
      title: 'Hành Động',
      key: 'action',
      render: (_: any, record: BorrowRequest) => {
        if (record.status === 'pending') {
          return (
            <Space>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprove(record.id)}
              >
                Phê Duyệt
              </Button>
              <Popconfirm
                title="Từ chối yêu cầu này?"
                onConfirm={() => handleReject(record.id)}
                okText="Có"
                cancelText="Không"
              >
                <Button danger size="small" icon={<CloseCircleOutlined />}>
                  Từ Chối
                </Button>
              </Popconfirm>
            </Space>
          );
        }
        return '-';
      },
    },
  ];

  const equipmentColumns = [
    {
      title: 'Tên Thiết Bị',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Mô Tả',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Tổng Số Lượng',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Đã Mượn',
      dataIndex: 'borrowed',
      key: 'borrowed',
    },
    {
      title: 'Còn Lại',
      key: 'remaining',
      render: (_: any, record: Equipment) => record.quantity - record.borrowed,
    },
    {
      title: 'Hành Động',
      key: 'action',
      render: (_: any, record: Equipment) => (
        <Popconfirm
          title="Xóa thiết bị này?"
          onConfirm={() => handleDeleteEquipment(record.id)}
          okText="Có"
          cancelText="Không"
        >
          <Button danger size="small" icon={<DeleteOutlined />}>
            Xóa
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const userMenu = (
    <Menu>
      <Menu.Item key="logout" onClick={handleLogout}>
        <LogoutOutlined /> Đăng Xuất
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="admin-header">
        <div className="header-content">
          <div className="header-title">
            <DashboardOutlined style={{ fontSize: 24, marginRight: 10 }} />
            <span>Hệ Thống Quản Lý Mượn Đồ Dùng - Quản Trị Viên</span>
          </div>
          <Dropdown menu={{ items: [] }} overlay={userMenu}>
            <div className="user-info">
              <Avatar icon={<UserOutlined />} />
              <span style={{ marginLeft: 10 }}>{user?.name || 'Quản Trị Viên'}</span>
            </div>
          </Dropdown>
        </div>
      </Header>

      <Layout>
        <Sider width={200} className="admin-sider">
          <Menu
            mode="inline"
            selectedKeys={[activeTab]}
            onClick={(e) => setActiveTab(e.key)}
            style={{ height: '100%', borderRight: 0 }}
          >
            <Menu.Item key="overview" icon={<BarChartOutlined />}>
              Tổng Quan
            </Menu.Item>
            <Menu.Item key="requests" icon={<SaveOutlined />}>
              Yêu Cầu Mượn
            </Menu.Item>
            <Menu.Item key="equipment" icon={<BgColorsOutlined />}>
              Quản Lý Thiết Bị
            </Menu.Item>
            <Menu.Item key="users" icon={<TeamOutlined />}>
              Quản Lý Người Dùng
            </Menu.Item>
          </Menu>
        </Sider>

        <Layout>
          <Content style={{ padding: '24px' }}>
            {activeTab === 'overview' && (
              <div>
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="Tổng Thiết Bị"
                        value={stats.totalEquipment}
                        prefix={<BgColorsOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="Đã Mượn"
                        value={stats.totalBorrowed}
                        prefix={<SaveOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="Yêu Cầu Chờ"
                        value={stats.pendingRequests}
                        prefix={<CheckCircleOutlined />}
                        valueStyle={{ color: '#ff4d4f' }}
                      />
                    </Card>
                  </Col>
                </Row>
              </div>
            )}

            {activeTab === 'requests' && (
              <Card title="Danh Sách Yêu Cầu Mượn" className="content-card">
                <Table
                  columns={requestColumns}
                  dataSource={borrowRequests}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  loading={loading}
                />
              </Card>
            )}

            {activeTab === 'equipment' && (
              <Card
                title="Quản Lý Thiết Bị"
                extra={
                  <Button
                    type="primary"
                    onClick={() => setIsEquipmentModalVisible(true)}
                  >
                    Thêm Thiết Bị
                  </Button>
                }
                className="content-card"
              >
                <Table
                  columns={equipmentColumns}
                  dataSource={equipment}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  loading={loading}
                />
              </Card>
            )}

            {activeTab === 'users' && <UserManagement />}
          </Content>
        </Layout>
      </Layout>

      <Modal
        title="Thêm Thiết Bị"
        visible={isEquipmentModalVisible}
        onCancel={() => setIsEquipmentModalVisible(false)}
        footer={null}
      >
        <Form
          form={equipmentForm}
          layout="vertical"
          onFinish={handleAddEquipment}
        >
          <Form.Item
            label="Tên Thiết Bị"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên thiết bị!' }]}
          >
            <Input placeholder="Nhập tên thiết bị" />
          </Form.Item>

          <Form.Item
            label="Mô Tả"
            name="description"
            rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}
          >
            <Input.TextArea rows={3} placeholder="Nhập mô tả thiết bị" />
          </Form.Item>

          <Form.Item
            label="Số Lượng"
            name="quantity"
            rules={[
              { required: true, message: 'Vui lòng nhập số lượng!' },
              { type: 'number', min: 1, message: 'Số lượng phải lớn hơn 0!' },
            ]}
          >
            <InputNumber min={1} placeholder="Nhập số lượng" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Thêm Thiết Bị
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Admin;