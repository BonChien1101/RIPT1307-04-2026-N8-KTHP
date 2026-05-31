import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Card,
  Space,
  Popconfirm,
  Tooltip,
  Tag,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  LockOutlined,
} from '@ant-design/icons';
import './styles.less';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'student';
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [formLoading, setFormLoading] = useState(false);
  const apiUrl = `${process.env.API_URL}/api`;
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminCount: 0,
    studentCount: 0,
    activeUsers: 0,
  });

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user || user === 'undefined' || user === 'null') {
      window.location.hash = '#/';
      return;
    }

    let userData: any;
    try {
      userData = JSON.parse(user);
    } catch (error) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.hash = '#/';
      return;
    }
    if (userData.role !== 'admin') {
      window.location.hash = '#/';
      return;
    }

    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(Array.isArray(data) ? data : data.data || []);

      // Calculate stats
      const stats = {
        totalUsers: data.length,
        adminCount: data.filter((u: User) => u.role === 'admin').length,
        studentCount: data.filter((u: User) => u.role === 'student').length,
        activeUsers: data.filter((u: User) => u.status === 'active').length,
      };
      setStats(stats);
    } catch (error) {
      message.error('Lỗi tải danh sách người dùng!');
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      message.success('Xóa người dùng thành công!');
      fetchUsers();
    } catch (error) {
      message.error('Lỗi xóa người dùng!');
      console.error('Error deleting user:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    setFormLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingUser
        ? `${apiUrl}/users/${editingUser.id}`
        : `${apiUrl}/users`;

      const method = editingUser ? 'PUT' : 'POST';

      // For creating new user, include password
      const payload = editingUser
        ? {
            name: values.name,
            email: values.email,
            role: values.role,
            status: values.status,
          }
        : {
            name: values.name,
            email: values.email,
            password: values.password,
            role: values.role,
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save user');
      }

      message.success(editingUser ? 'Cập nhật người dùng thành công!' : 'Thêm người dùng thành công!');
      setIsModalOpen(false);
      form.resetFields();
      fetchUsers();
    } catch (error: any) {
      message.error(error.message || 'Lỗi lưu người dùng!');
      console.error('Error saving user:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Vai Trò',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const color = role === 'admin' ? 'red' : 'blue';
        const text = role === 'admin' ? 'Quản Trị Viên' : 'Sinh Viên';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'active' ? 'green' : 'red';
        const text = status === 'active' ? 'Hoạt Động' : 'Bị Khóa';
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: 'Ngày Tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Hành Động',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditUser(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa người dùng này?"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="Có"
            cancelText="Không"
          >
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="user-management">
      <Card title="Quản Lý Người Dùng" className="user-management-card">
        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Tổng Người Dùng" value={stats.totalUsers} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Quản Trị Viên" value={stats.adminCount} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Sinh Viên" value={stats.studentCount} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic title="Hoạt Động" value={stats.activeUsers} />
            </Card>
          </Col>
        </Row>

        {/* Add User Button */}
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={handleAddUser}
            size="large"
          >
            Thêm Người Dùng
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng cộng ${total} người dùng`,
          }}
        />
      </Card>
      <Modal
        title={editingUser ? 'Chỉnh Sửa Người Dùng' : 'Thêm Người Dùng'}
        visible={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setEditingUser(null);
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            label="Tên"
            name="name"
            rules={[
              { required: true, message: 'Vui lòng nhập tên!' },
              { min: 2, message: 'Tên phải có ít nhất 2 ký tự!' },
            ]}
          >
            <Input placeholder="Nhập tên người dùng" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không hợp lệ!' },
            ]}
          >
            <Input placeholder="Nhập email" type="email" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              label="Mật Khẩu"
              name="password"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu!' },
                { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' },
              ]}
            >
              <Input.Password placeholder="Nhập mật khẩu" prefix={<LockOutlined />} />
            </Form.Item>
          )}

          <Form.Item
            label="Vai Trò"
            name="role"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]}
          >
            <Select
              placeholder="Chọn vai trò"
              options={[
                { label: 'Sinh Viên', value: 'student' },
                { label: 'Quản Trị Viên', value: 'admin' },
              ]}
            />
          </Form.Item>

          {editingUser && (
            <Form.Item
              label="Trạng Thái"
              name="status"
              rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
            >
              <Select
                placeholder="Chọn trạng thái"
                options={[
                  { label: 'Hoạt Động', value: 'active' },
                  { label: 'Bị Khóa', value: 'inactive' },
                ]}
              />
            </Form.Item>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={formLoading}>
              {editingUser ? 'Cập Nhật' : 'Thêm'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;