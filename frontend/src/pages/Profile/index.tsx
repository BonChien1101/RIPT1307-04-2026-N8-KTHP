/// <reference path="../../global.d.ts" />

import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Space,
  Divider,
  List,
  Tag,
  Modal,
  Row,
  Col,
  Descriptions,
  Spin,
  Empty,
  Popconfirm,
  Tooltip,
  Select,
} from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import './styles.less';

interface UserInfo {
  id: number;
  full_name: string;
  email: string;
  student_code?: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

interface ContactInfo {
  id: string;
  type: 'phone' | 'address' | 'note';
  value: string;
}

const Profile: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form] = Form.useForm();
  const [contactForm] = Form.useForm();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  const apiHost = (window as any).__API_URL__ || process.env.API_URL || window.location.origin;
  const apiUrl = `${apiHost}/api`;

  // Load user info from localStorage and API
  useEffect(() => {
    const loadUserInfo = async () => {
      setIsLoadingUser(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          message.error('Bạn cần đăng nhập!');
          return;
        }

        const response = await fetch(`${apiUrl}/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user info');
        }

        const data = await response.json();
        if (data.code === 'OK' || data.data) {
          const userInfo = data.data || data;
          setUserInfo(userInfo);
          setTimeout(() => {
            form.setFieldsValue({
              full_name: userInfo.full_name || '',
              email: userInfo.email || '',
            });
          }, 0);
        }

        // Load contact info from localStorage
        const savedContactInfo = localStorage.getItem('userContactInfo');
        if (savedContactInfo) {
          try {
            setContactInfo(JSON.parse(savedContactInfo));
          } catch (e) {
            // Invalid JSON, skip
          }
        }
      } catch (error: any) {
        console.error('Error loading user info:', error);
        // Try to get user info from localStorage as fallback
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          if (user.full_name) {
            setUserInfo(user);
            setTimeout(() => {
              form.setFieldsValue({
                full_name: user.full_name || '',
                email: user.email || '',
              });
            }, 0);
          } else {
            message.error('Không thể tải thông tin cá nhân!');
          }
        } catch (e) {
          message.error('Không thể tải thông tin cá nhân!');
        }
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUserInfo();
  }, [form, apiUrl]);

  // Save basic user info
  const handleSaveBasicInfo = async (values: any) => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: values.full_name,
          email: values.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const data = await response.json();
      if (data.code === 'OK') {
        setUserInfo(data.data);
        // Update localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.full_name = data.data.full_name;
        user.email = data.data.email;
        localStorage.setItem('user', JSON.stringify(user));

        // If email changed, inform user about login account change
        if (data.data.email !== userInfo?.email) {
          message.warning(`Email tài khoản đã thay đổi thành: ${data.data.email}. Vui lòng đăng nhập lại với email mới!`);
          setTimeout(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }, 2000);
        } else {
          message.success('Cập nhật thông tin cá nhân thành công!');
          setIsEditing(false);
        }
      }
    } catch (error: any) {
      message.error(error.message || 'Lỗi cập nhật thông tin!');
    } finally {
      setIsSaving(false);
    }
  };

  // Add new contact info
  const handleAddContact = async (values: any) => {
    try {
      const newContact: ContactInfo = {
        id: Date.now().toString(),
        type: values.type,
        value: values.value,
      };

      const updatedContactInfo = [...contactInfo, newContact];
      setContactInfo(updatedContactInfo);
      localStorage.setItem('userContactInfo', JSON.stringify(updatedContactInfo));

      message.success('Thêm thông tin liên hệ thành công!');
      contactForm.resetFields();
      setIsContactModalOpen(false);
    } catch (error: any) {
      message.error(error.message || 'Lỗi thêm thông tin!');
    }
  };

  // Update contact info
  const handleUpdateContact = async (values: any) => {
    try {
      const updatedContactInfo = contactInfo.map((info) =>
        info.id === editingContactId
          ? { ...info, type: values.type, value: values.value }
          : info
      );

      setContactInfo(updatedContactInfo);
      localStorage.setItem('userContactInfo', JSON.stringify(updatedContactInfo));

      message.success('Cập nhật thông tin liên hệ thành công!');
      contactForm.resetFields();
      setIsContactModalOpen(false);
      setEditingContactId(null);
    } catch (error: any) {
      message.error(error.message || 'Lỗi cập nhật thông tin!');
    }
  };

  // Delete contact info
  const handleDeleteContact = (id: string) => {
    const updatedContactInfo = contactInfo.filter((info) => info.id !== id);
    setContactInfo(updatedContactInfo);
    localStorage.setItem('userContactInfo', JSON.stringify(updatedContactInfo));
    message.success('Xóa thông tin liên hệ thành công!');
  };

  // Open edit modal
  const handleEditContact = (contact: ContactInfo) => {
    setEditingContactId(contact.id);
    contactForm.setFieldsValue({
      type: contact.type,
      value: contact.value,
    });
    setIsContactModalOpen(true);
  };

  // Open add modal
  const handleAddContactClick = () => {
    setEditingContactId(null);
    contactForm.resetFields();
    setIsContactModalOpen(true);
  };

  const getContactTypeLabel = (type: string) => {
    const typeMap: Record<string, { label: string; icon: any; color: string }> = {
      phone: { label: 'Điện thoại', icon: <PhoneOutlined />, color: 'blue' },
      address: { label: 'Địa chỉ', icon: <HomeOutlined />, color: 'green' },
      note: { label: 'Ghi chú', icon: <EditOutlined />, color: 'orange' },
    };
    return typeMap[type] || { label: type, icon: null, color: 'default' };
  };

  if (isLoadingUser) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin tip="Đang tải thông tin cá nhân..." />
      </div>
    );
  }

  return (
    <div className="profile fade-in">
      {onBack && (
        <Button
          type="link"
          onClick={onBack}
          style={{ marginBottom: 16, paddingLeft: 0 }}
        >
          ← Quay lại
        </Button>
      )}

      {/* Basic Information */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserOutlined />
            Thông Tin Cá Nhân
          </div>
        }
        extra={
          !isEditing ? (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => setIsEditing(true)}
              size="small"
            >
              Chỉnh sửa
            </Button>
          ) : null
        }
        style={{ marginBottom: 24 }}
      >
        {isEditing ? (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSaveBasicInfo}
          >
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Họ và Tên"
                  name="full_name"
                  rules={[
                    { required: true, message: 'Vui lòng nhập họ và tên!' },
                    { min: 2, message: 'Họ tên phải có ít nhất 2 ký tự!' },
                  ]}
                >
                  <Input
                    placeholder="Nhập họ và tên"
                    prefix={<UserOutlined />}
                    allowClear
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Email"
                  name="email"
                  rules={[
                    { required: true, message: 'Vui lòng nhập email!' },
                    { type: 'email', message: 'Email không hợp lệ!' },
                  ]}
                >
                  <Input
                    placeholder="Nhập email"
                    prefix={<MailOutlined />}
                    allowClear
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={isSaving}
                >
                  Lưu
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setIsEditing(false);
                    form.resetFields();
                    if (userInfo) {
                      setTimeout(() => {
                        form.setFieldsValue({
                          full_name: userInfo.full_name,
                          email: userInfo.email || '',
                        });
                      }, 0);
                    }
                  }}
                >
                  Hủy
                </Button>
              </Space>
            </Form.Item>
          </Form>
        ) : (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Họ và Tên" icon={<UserOutlined />}>
              {userInfo?.full_name}
            </Descriptions.Item>
            <Descriptions.Item label="Email" icon={<MailOutlined />}>
              {userInfo?.email}
            </Descriptions.Item>
            {userInfo?.student_code && (
              <Descriptions.Item label="Mã Sinh Viên">
                {userInfo.student_code}
              </Descriptions.Item>
            )}
            {userInfo?.created_at && (
              <Descriptions.Item label="Ngày Tạo" icon={<CalendarOutlined />}>
                {new Date(userInfo.created_at).toLocaleDateString('vi-VN')}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Card>

      {/* Contact Information */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PhoneOutlined />
            Thông Tin Liên Hệ
          </div>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddContactClick}
            size="small"
          >
            Thêm
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        {contactInfo.length === 0 ? (
          <Empty
            description="Chưa có thông tin liên hệ"
            style={{ marginTop: 16 }}
          />
        ) : (
          <List
            dataSource={contactInfo}
            renderItem={(contact) => {
              const typeInfo = getContactTypeLabel(contact.type);
              return (
                <List.Item
                  key={contact.id}
                  actions={[
                    <Tooltip title="Chỉnh sửa">
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEditContact(contact)}
                        size="small"
                      />
                    </Tooltip>,
                    <Popconfirm
                      title="Xóa thông tin này?"
                      onConfirm={() => handleDeleteContact(contact.id)}
                      okText="Có"
                      cancelText="Không"
                    >
                      <Tooltip title="Xóa">
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                        />
                      </Tooltip>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Tag color={typeInfo.color}>
                        {typeInfo.icon}
                        {typeInfo.label}
                      </Tag>
                    }
                    title={typeInfo.label}
                    description={contact.value}
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>

      {/* Contact Info Modal */}
      <Modal
        title={editingContactId ? 'Chỉnh Sửa Thông Tin Liên Hệ' : 'Thêm Thông Tin Liên Hệ'}
        open={isContactModalOpen}
        onCancel={() => {
          setIsContactModalOpen(false);
          contactForm.resetFields();
          setEditingContactId(null);
        }}
        footer={null}
        width={500}
      >
        <Form
          form={contactForm}
          layout="vertical"
          onFinish={editingContactId ? handleUpdateContact : handleAddContact}
        >
          <Form.Item
            label="Loại Thông Tin"
            name="type"
            rules={[{ required: true, message: 'Vui lòng chọn loại thông tin!' }]}
          >
            <Select
              placeholder="Chọn loại thông tin"
              options={[
                { label: 'Điện thoại', value: 'phone' },
                { label: 'Địa chỉ', value: 'address' },
                { label: 'Ghi chú', value: 'note' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Nội Dung"
            name="value"
            rules={[{ required: true, message: 'Vui lòng nhập nội dung!' }]}
          >
            <Input.TextArea
              placeholder="Nhập nội dung"
              rows={3}
              allowClear
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
              >
                {editingContactId ? 'Cập nhật' : 'Thêm'}
              </Button>
              <Button
                onClick={() => {
                  setIsContactModalOpen(false);
                  contactForm.resetFields();
                  setEditingContactId(null);
                }}
              >
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Profile;
