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
} from '@ant-design/icons';
import './styles.less';

const { Header, Content, Sider } = Layout;

interface Equipment {
  id: number;
  name: string;
  total_quantity: number;
  available_quantity: number;
  description: string;
}

interface BorrowRequest {
  id: number;
  user_id: number;
  borrow_date: string;
  expected_return_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'borrowed' | 'returned';
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
  const [user, setUser] = useState<any>(null);
  const apiUrl = `${process.env.API_URL}/api`;
  const [stats, setStats] = useState({
    totalEquipment: 0,
    totalBorrowed: 0,
    pendingRequests: 0,
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData && userData !== 'undefined' && userData !== 'null') {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.role !== 'admin') {
          window.location.hash = '#/';
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

    fetchBorrowRequests();
    fetchEquipment();
    fetchStats();
  }, []);

  const fetchBorrowRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/borrow-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const payload = await response.json();
        setBorrowRequests(payload?.data || []);
      }
    } catch (error) {
      message.error('Lỗi tải danh sách yêu cầu!');
      console.error('Error fetching requests:', error);
    }
  };

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
      console.error('Error fetching equipment:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/statistics/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const payload = await response.json();
        const data = payload?.data || {};
        setStats({
          totalEquipment: data.tongThietBi || 0,
          totalBorrowed: data.tongYeuCau || 0,
          pendingRequests: data.dangChoDuyet || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleApprove = async (requestId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${apiUrl}/borrow-requests/${requestId}/approve`,
        {
          method: 'PATCH',
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
        `${apiUrl}/borrow-requests/${requestId}/reject`,
        {
          method: 'PATCH',
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
      const response = await fetch(`${apiUrl}/equipments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          total_quantity: values.quantity,
          available_quantity: values.quantity,
          status: 'available',
        }),
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
      const response = await fetch(`${apiUrl}/equipments/${equipmentId}`, {
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
    window.location.hash = '#/';
    window.location.reload();
  };

  const requestColumns = [
    {
      title: 'Mã Người Dùng',
      dataIndex: 'user_id',
      key: 'user_id',
    },
    {
      title: 'Ngày Mượn',
      dataIndex: 'borrow_date',
      key: 'borrow_date',
    },
    {
      title: 'Ngày Trả',
      dataIndex: 'expected_return_date',
      key: 'expected_return_date',
    },
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
      dataIndex: 'total_quantity',
      key: 'total_quantity',
    },
    {
      title: 'Đã Mượn',
      key: 'borrowed',
      render: (_: any, record: Equipment) => record.total_quantity - record.available_quantity,
    },
    {
      title: 'Còn Lại',
      key: 'remaining',
      render: (_: any, record: Equipment) => record.available_quantity,
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

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng Xuất',
    },
  ];

  const userMenu = (
    <Menu
      items={userMenuItems}
      onClick={(e) => {
        if (e.key === 'logout') handleLogout();
      }}
    />
  );

  const siderItems = [
    { key: 'overview', icon: <BarChartOutlined />, label: 'Tổng Quan' },
    { key: 'requests', icon: <SaveOutlined />, label: 'Yêu Cầu Mượn' },
    { key: 'equipment', icon: <BgColorsOutlined />, label: 'Quản Lý Thiết Bị' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="admin-header">
        <div className="header-content">
          <div className="header-title">
            <DashboardOutlined style={{ fontSize: 24, marginRight: 10 }} />
            <span>Hệ Thống Quản Lý Mượn Đồ Dùng - Quản Trị Viên</span>
          </div>
          <Dropdown overlay={userMenu}>
            <div className="user-info">
              <Avatar icon={<UserOutlined />} />
              <span style={{ marginLeft: 10 }}>{user?.full_name || user?.name || 'Quản Trị Viên'}</span>
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
            items={siderItems}
            style={{ height: '100%', borderRight: 0 }}
          />
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