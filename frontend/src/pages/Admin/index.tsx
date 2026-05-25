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
  EyeOutlined,
  EditOutlined,
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
  category?: string;
  total_quantity: number;
  available_quantity: number;
  description: string;
  image_url?: string;
  status?: 'available' | 'low_stock' | 'out_of_stock';
}

interface BorrowRequest {
  id: number;
  user_id: number;
  borrow_date: string;
  expected_return_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'borrowed' | 'returned';
}

interface BorrowRequestDetail extends BorrowRequest {
  actual_return_date?: string;
  note?: string;
  items?: Array<{
    id: number;
    equipment_id: number;
    quantity: number;
  }>;
}

interface EquipmentDetail extends Equipment {
  created_at?: string;
  updated_at?: string;
}

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('requests');
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
    fetchTopBorrowedEquipment(new Date().getFullYear(), new Date().getMonth() + 1);
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

  const handleViewRequestDetail = async (requestId: number) => {
    setRequestDetailLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/borrow-requests/${requestId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        message.error('Không tải được chi tiết yêu cầu!');
        return;
      }

      const payload = await response.json();
      setSelectedRequestDetail(payload?.data || null);
      setIsRequestDetailModalVisible(true);
    } catch (error) {
      message.error('Lỗi tải chi tiết yêu cầu!');
      console.error('Error fetching request detail:', error);
    } finally {
      setRequestDetailLoading(false);
    }
  };

  const handleViewEquipmentDetail = async (equipmentId: number) => {
    setEquipmentDetailLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/equipments/${equipmentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        message.error('Không tải được chi tiết thiết bị!');
        return;
      }

      const payload = await response.json();
      setSelectedEquipmentDetail(payload?.data || null);
      setIsEquipmentDetailModalVisible(true);
    } catch (error) {
      message.error('Lỗi tải chi tiết thiết bị!');
      console.error('Error fetching equipment detail:', error);
    } finally {
      setEquipmentDetailLoading(false);
    }
  };

  const fetchTopBorrowedEquipment = async (year = statYear, month = statMonth) => {
    setTopEquipmentLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/statistics/top-equipment?year=${year}&month=${month}&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setTopEquipment([]);
        return;
      }

      const payload = await response.json();
      setTopEquipment(payload?.data || []);
    } catch (error) {
      console.error('Error fetching top equipment:', error);
      setTopEquipment([]);
    } finally {
      setTopEquipmentLoading(false);
    }
  };

  const openAddEquipmentModal = () => {
    setSelectedEquipment(null);
    equipmentForm.resetFields();
    equipmentForm.setFieldsValue({
      total_quantity: 1,
      available_quantity: 1,
    });
    setIsEquipmentModalVisible(true);
  };

  const handleEditEquipment = (item: Equipment) => {
    setSelectedEquipment(item);
    equipmentForm.setFieldsValue({
      name: item.name,
      category: item.category,
      description: item.description,
      total_quantity: item.total_quantity,
      available_quantity: item.available_quantity,
      image_url: item.image_url,
    });
    setIsEquipmentModalVisible(true);
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
        fetchEquipment();
        fetchTopBorrowedEquipment();
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
        fetchTopBorrowedEquipment();
      } else {
        message.error('Từ chối yêu cầu thất bại!');
      }
    } catch (error) {
      message.error('Lỗi kết nối đến server!');
      console.error('Error rejecting request:', error);
    }
  };

  const handleSaveEquipment = async (values: any) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const isEditing = !!selectedEquipment;
      const response = await fetch(isEditing ? `${apiUrl}/equipments/${selectedEquipment!.id}` : `${apiUrl}/equipments`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: values.name,
          category: values.category,
          description: values.description,
          total_quantity: values.total_quantity,
          available_quantity: values.available_quantity,
          image_url: values.image_url,
          status: values.status,
        }),
      });

      if (response.ok) {
        message.success(isEditing ? 'Cập nhật thiết bị thành công!' : 'Thêm thiết bị thành công!');
        setIsEquipmentModalVisible(false);
        equipmentForm.resetFields();
        setSelectedEquipment(null);
        fetchEquipment();
        fetchStats();
        fetchTopBorrowedEquipment();
      } else {
        message.error(isEditing ? 'Cập nhật thiết bị thất bại!' : 'Thêm thiết bị thất bại!');
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
        fetchTopBorrowedEquipment();
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

  const handleMarkBorrowed = async (requestId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/borrow-requests/${requestId}/mark-borrowed`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        message.success('Đã ghi nhận thiết bị được mượn!');
        fetchBorrowRequests();
        fetchEquipment();
        fetchStats();
        fetchTopBorrowedEquipment();
      } else {
        message.error('Ghi nhận mượn thất bại!');
      }
    } catch (error) {
      message.error('Lỗi kết nối đến server!');
      console.error('Error marking borrowed:', error);
    }
  };

  const handleMarkReturned = async (requestId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/borrow-requests/${requestId}/mark-returned`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        message.success('Đã ghi nhận thiết bị được trả!');
        fetchBorrowRequests();
        fetchEquipment();
        fetchStats();
        fetchTopBorrowedEquipment();
      } else {
        message.error('Ghi nhận trả thất bại!');
      }
    } catch (error) {
      message.error('Lỗi kết nối đến server!');
      console.error('Error marking returned:', error);
    }
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
        return (
          <Space>
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewRequestDetail(record.id)}>
              Chi Tiết
            </Button>
            {record.status === 'pending' && (
              <>
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
              </>
            )}
            {record.status === 'approved' && (
              <Button type="default" size="small" onClick={() => handleMarkBorrowed(record.id)}>
                Ghi Nhận Mượn
              </Button>
            )}
            {record.status === 'borrowed' && (
              <Button type="default" size="small" onClick={() => handleMarkReturned(record.id)}>
                Ghi Nhận Trả
              </Button>
            )}
          </Space>
        );
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
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewEquipmentDetail(record.id)}>
            Chi Tiết
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditEquipment(record)}>
            Sửa
          </Button>
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
        </Space>
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

                <Card
                  title="Thiết Bị Mượn Nhiều Trong Tháng"
                  className="content-card"
                  extra={
                    <Space>
                      <InputNumber min={2000} max={2100} value={statYear} onChange={(value) => setStatYear(Number(value) || new Date().getFullYear())} />
                      <InputNumber min={1} max={12} value={statMonth} onChange={(value) => setStatMonth(Number(value) || new Date().getMonth() + 1)} />
                      <Button
                        type="primary"
                        onClick={() => fetchTopBorrowedEquipment(statYear, statMonth)}
                      >
                        Xem Thống Kê
                      </Button>
                    </Space>
                  }
                >
                  <Table
                    rowKey="id"
                    loading={topEquipmentLoading}
                    dataSource={topEquipment}
                    pagination={false}
                    columns={[
                      { title: 'Mã Thiết Bị', dataIndex: 'id', key: 'id' },
                      { title: 'Tên Thiết Bị', dataIndex: 'name', key: 'name' },
                      { title: 'Số Lần Mượn', dataIndex: 'tongMuon', key: 'tongMuon' },
                    ]}
                  />
                </Card>
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
                    onClick={openAddEquipmentModal}
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
        title={selectedEquipment ? 'Chỉnh Sửa Thiết Bị' : 'Thêm Thiết Bị'}
        visible={isEquipmentModalVisible}
        onCancel={() => {
          setIsEquipmentModalVisible(false);
          setSelectedEquipment(null);
          equipmentForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={equipmentForm}
          layout="vertical"
          onFinish={handleSaveEquipment}
        >
          <Form.Item
            label="Tên Thiết Bị"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên thiết bị!' }]}
          >
            <Input placeholder="Nhập tên thiết bị" />
          </Form.Item>

          <Form.Item
            label="Danh Mục"
            name="category"
          >
            <Input placeholder="Nhập danh mục thiết bị" />
          </Form.Item>

          <Form.Item
            label="Mô Tả"
            name="description"
            rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}
          >
            <Input.TextArea rows={3} placeholder="Nhập mô tả thiết bị" />
          </Form.Item>

          <Form.Item
            label="Tổng Số Lượng"
            name="total_quantity"
            rules={[
              { required: true, message: 'Vui lòng nhập số lượng!' },
              { type: 'number', min: 1, message: 'Số lượng phải lớn hơn 0!' },
            ]}
          >
            <InputNumber min={1} placeholder="Nhập số lượng" />
          </Form.Item>

          <Form.Item
            label="Số Lượng Tồn Kho"
            name="available_quantity"
            rules={[
              { required: true, message: 'Vui lòng nhập số lượng tồn kho!' },
              { type: 'number', min: 0, message: 'Số lượng tồn kho không hợp lệ!' },
            ]}
          >
            <InputNumber min={0} placeholder="Nhập số lượng tồn kho" />
          </Form.Item>

          <Form.Item
            label="Link Ảnh"
            name="image_url"
          >
            <Input placeholder="Nhập link ảnh thiết bị" />
          </Form.Item>

          <Form.Item
            label="Trạng Thái"
            name="status"
          >
            <Select
              placeholder="Chọn trạng thái"
              options={[
                { label: 'Còn hàng', value: 'available' },
                { label: 'Sắp hết', value: 'low_stock' },
                { label: 'Hết hàng', value: 'out_of_stock' },
              ]}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              {selectedEquipment ? 'Cập Nhật Thiết Bị' : 'Thêm Thiết Bị'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Chi Tiết Thiết Bị"
        visible={isEquipmentDetailModalVisible}
        onCancel={() => setIsEquipmentDetailModalVisible(false)}
        footer={null}
        width={720}
        confirmLoading={equipmentDetailLoading}
        destroyOnClose
      >
        {selectedEquipmentDetail && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Card size="small">
              <p><strong>Mã thiết bị:</strong> {selectedEquipmentDetail.id}</p>
              <p><strong>Tên thiết bị:</strong> {selectedEquipmentDetail.name}</p>
              <p><strong>Danh mục:</strong> {selectedEquipmentDetail.category || '-'}</p>
              <p><strong>Mô tả:</strong> {selectedEquipmentDetail.description || '-'}</p>
              <p><strong>Tổng số lượng:</strong> {selectedEquipmentDetail.total_quantity}</p>
              <p><strong>Số lượng tồn kho:</strong> {selectedEquipmentDetail.available_quantity}</p>
              <p><strong>Đang mượn:</strong> {selectedEquipmentDetail.total_quantity - selectedEquipmentDetail.available_quantity}</p>
              <p><strong>Trạng thái:</strong> {selectedEquipmentDetail.status || '-'}</p>
            </Card>
          </Space>
        )}
      </Modal>

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
              <p><strong>Mã yêu cầu:</strong> {selectedRequestDetail.id}</p>
              <p><strong>Mã người dùng:</strong> {selectedRequestDetail.user_id}</p>
              <p><strong>Ngày mượn:</strong> {selectedRequestDetail.borrow_date}</p>
              <p><strong>Ngày trả dự kiến:</strong> {selectedRequestDetail.expected_return_date}</p>
              <p><strong>Ngày trả thực tế:</strong> {selectedRequestDetail.actual_return_date || '-'}</p>
              <p>
                <strong>Trạng thái:</strong>{' '}
                <Badge
                  status={
                    selectedRequestDetail.status === 'pending'
                      ? 'processing'
                      : selectedRequestDetail.status === 'approved'
                      ? 'success'
                      : selectedRequestDetail.status === 'borrowed'
                      ? 'warning'
                      : selectedRequestDetail.status === 'returned'
                      ? 'default'
                      : 'error'
                  }
                  text={selectedRequestDetail.status}
                />
              </p>
              <p><strong>Ghi chú:</strong> {selectedRequestDetail.note || '-'}</p>
            </Card>

            <Card title="Danh sách thiết bị trong yêu cầu" size="small">
              <Table
                rowKey={(item) => String(item.id)}
                dataSource={selectedRequestDetail.items || []}
                pagination={false}
                columns={[
                  { title: 'Mã thiết bị', dataIndex: 'equipment_id', key: 'equipment_id' },
                  { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity' },
                ]}
              />
            </Card>
          </Space>
        )}
      </Modal>
    </Layout>
  );
};

export default Admin;