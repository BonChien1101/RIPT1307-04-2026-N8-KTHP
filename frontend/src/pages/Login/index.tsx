import React, { useState } from 'react';
import { Form, Input, Button, Card, Row, Col, message } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  ShoppingCartOutlined,
  CheckCircleOutlined,
  SafetyOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import './styles.less';

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        message.success('Đăng nhập thành công!');

        if (data.user.role === 'admin') {
          window.location.hash = '#/admin';
        } else {
          window.location.hash = '#/student';
        }
        window.location.reload();
      } else {
        message.error('Email hoặc mật khẩu không đúng!');
      }
    } catch (error) {
      message.error('Lỗi kết nối server!');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Row justify="center" align="middle" className="login-row">
        <Col xs={24} sm={22} md={20} lg={18} xl={16}>
          <div className="login-shell">
            <section className="login-hero">
              <div className="login-brand">
                <ShoppingCartOutlined />
              </div>
              <h1 className="login-title">Mượn Đồ Dùng</h1>
              <p className="login-subtitle">
                Quản lý thiết bị, đăng ký mượn và theo dõi trạng thái gọn gàng trong một giao diện rõ ràng, hiện đại.
              </p>

              <div className="login-features">
                <div className="login-feature">
                  <CheckCircleOutlined />
                  <span>Thao tác nhanh, dễ hiểu</span>
                </div>
                <div className="login-feature">
                  <SafetyOutlined />
                  <span>Phân quyền rõ ràng</span>
                </div>
                <div className="login-feature">
                  <AppstoreOutlined />
                  <span>Giao diện gọn, hài hòa</span>
                </div>
              </div>
            </section>

            <Card className="login-card" bordered={false}>
              <div className="login-card-header">
                <span>Đăng nhập hệ thống</span>
                <p>Vui lòng nhập thông tin để tiếp tục</p>
              </div>

              <Form
                form={form}
                layout="vertical"
                onFinish={handleLogin}
                autoComplete="off"
              >
                <Form.Item
                  label="Email"
                  name="email"
                  rules={[
                    { required: true, message: 'Vui lòng nhập email!' },
                    { type: 'email', message: 'Email không hợp lệ!' },
                  ]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="Email của bạn"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label="Mật Khẩu"
                  name="password"
                  rules={[
                    { required: true, message: 'Vui lòng nhập mật khẩu!' },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Mật khẩu của bạn"
                    size="large"
                  />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    loading={loading}
                    className="login-button"
                  >
                    Đăng Nhập
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Login;