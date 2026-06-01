/// <reference path="../../global.d.ts" />

import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Space,
  Row,
  Col,
  Descriptions,
  Spin,
} from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  UserOutlined,
  MailOutlined,
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

const Profile: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form] = Form.useForm();

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

        // Dispatch custom event to update header in real-time
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: user }));

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


    </div>
  );
};

export default Profile;
