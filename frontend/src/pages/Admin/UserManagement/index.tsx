/// <reference path="../../../global.d.ts" />

import React, { useEffect, useState } from 'react';
import { useModel } from 'umi';
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
import { isStudentRole, normalizeRole } from '../../../utils/auth';

interface User {
  id: number;
  name?: string;
  full_name?: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { initialState, setInitialState } = useModel('@@initialState');
  const [formLoading, setFormLoading] = useState(false);
  const apiHost = (window as any).__API_URL__ || process.env.API_URL || window.location.origin;
  const apiUrl = `${apiHost}/api`;
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
    if (isStudentRole(userData.role)) {
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
        adminCount: data.filter((u: User) => !isStudentRole(u.role)).length,
        studentCount: data.filter((u: User) => isStudentRole(u.role)).length,
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
      const updatedFields = editingUser
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
        body: JSON.stringify(updatedFields),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to save user');
      }

      message.success('Cập nhật thành công!');

      // Update header username and local storage if editing current user
      if (editingUser && initialState?.user?.id === editingUser.id) {
        const newUserData = { ...initialState.user, ...updatedFields };
        localStorage.setItem('user', JSON.stringify(newUserData));
        setInitialState((s: any) => ({ ...s, user: newUserData }));
        
        // Trigger a global event for components that might not use useModel
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: newUserData }));
      }

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
        const normalizedRole = normalizeRole(role);
        const isStudent = normalizedRole === 'student';
        const color = isStudent ? 'blue' : 'red';
        const labelMap: Record<string, string> = {
          student: 'Sinh Viên',
          admin: 'Quản Trị Viên',
          super_admin: 'Super Admin',
          warehouse_admin: 'Admin Kho Thiết Bị',
          request_admin: 'Admin Duyệt Yêu Cầu',
          warehouse_staff: 'Nhân Viên Kho',
          assistant: 'Cộng Tác Viên',
        };
        const text = labelMap[normalizedRole] || normalizedRole;
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
      render: (date: string, record: User) => new Date(date || record.created_at || record.createdAt || Date.now()).toLocaleDateString('vi-VN'),
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
    <div className="user-management fade-in">
      <Card 
        title={<div className="card-title" style={{ color: 'var(--text)' }}>Quản Lý Người Dùng</div>} 
        className="user-management-card"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
      >
        <div className="um-header" style={{ marginBottom: 18 }}>
          <div className="um-title" style={{ color: 'var(--text)' }}>Quản Lý Người Dùng</div>
          <div className="um-actions">
            <Input.Search
              placeholder="Tìm kiếm tên hoặc email"
              onSearch={(val) => {
                const q = (val || '').toLowerCase().trim();
                if (!q) return fetchUsers();
                setUsers((prev) => prev.filter((u) => (u.name + ' ' + u.email).toLowerCase().includes(q)));
              }}
              style={{ width: 320, marginRight: 12 }}
              allowClear
            />
            <Button onClick={fetchUsers} style={{ marginRight: 8 }}>Làm mới</Button>
            <Button type="primary" icon={<UserAddOutlined />} onClick={handleAddUser} size="middle">
              Thêm
            </Button>
          </div>
        </div>
        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card style={{ background: 'var(--muted-light)', borderColor: 'var(--border-color)' }}>
              <Statistic 
                title={<span style={{ color: 'var(--text-secondary)' }}>Tổng Người Dùng</span>} 
                value={stats.totalUsers} 
                valueStyle={{ color: 'var(--text)' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: 'var(--muted-light)', borderColor: 'var(--border-color)' }}>
              <Statistic 
                title={<span style={{ color: 'var(--text-secondary)' }}>Quản Trị Viên</span>} 
                value={stats.adminCount} 
                valueStyle={{ color: 'var(--text)' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: 'var(--muted-light)', borderColor: 'var(--border-color)' }}>
              <Statistic 
                title={<span style={{ color: 'var(--text-secondary)' }}>Sinh Viên</span>} 
                value={stats.studentCount} 
                valueStyle={{ color: 'var(--text)' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: 'var(--muted-light)', borderColor: 'var(--border-color)' }}>
              <Statistic 
                title={<span style={{ color: 'var(--text-secondary)' }}>Hoạt Động</span>} 
                value={stats.activeUsers} 
                valueStyle={{ color: 'var(--text)' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Add User Button (kept for backward compatibility on small screens) */}
        <div style={{ marginBottom: 16, display: 'none' }} className="um-add-mobile">
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