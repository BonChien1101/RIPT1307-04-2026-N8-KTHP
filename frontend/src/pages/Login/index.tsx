import React, { useState } from 'react';
import { Form, Input, Button, Card, Row, Col, message, Tabs, Divider } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  ShoppingCartOutlined,
  CheckCircleOutlined,
  SafetyOutlined,
  AppstoreOutlined,
  IdcardOutlined,
  KeyOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import './styles.less';
import { routeByRole } from '../../utils/auth';

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [resetForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const apiUrl = `${process.env.API_URL}/api`;

  const applyLoginResult = (loginData: any) => {
    const token = loginData?.token;
    const user = loginData?.user;

    if (!token || !user || !user.role) {
      message.error('Phản hồi đăng nhập không hợp lệ từ server!');
      return false;
    }

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    message.success('Đăng nhập thành công!');

    window.location.hash = routeByRole(user.role);
    window.location.reload();
    return true;
  };

  const showApiError = async (response: Response, fallback: string) => {
    const errorPayload = await response.json().catch(() => null);
    const fieldErrors = Array.isArray(errorPayload?.errors) ? errorPayload.errors : [];
    const detailMessage = fieldErrors[0]?.message || errorPayload?.message || fallback;
    message.error(detailMessage);
    return errorPayload;
  };

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const loginData = payload?.data || payload;
        applyLoginResult(loginData);
      } else {
        await showApiError(response, 'Email hoặc mật khẩu không đúng!');
      }
    } catch (error) {
      message.error('Lỗi kết nối server!');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: values.full_name,
          student_code: values.student_code,
          email: values.email,
          password: values.password,
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const registerData = payload?.data || payload;
        message.success('Đăng ký thành công!');
        applyLoginResult(registerData);
      } else {
        await showApiError(response, 'Đăng ký thất bại!');
      }
    } catch (error) {
      message.error('Lỗi kết nối server!');
      console.error('Register error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          new_password: values.new_password,
        }),
      });

      if (response.ok) {
        message.success('Đặt lại mật khẩu thành công! Hãy đăng nhập lại.');
        resetForm.resetFields();
        setActiveTab('login');
      } else {
        await showApiError(response, 'Không thể đặt lại mật khẩu!');
      }
    } catch (error) {
      message.error('Lỗi kết nối server!');
      console.error('Reset password error:', error);
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
              <h1 className="login-title">BorrowX</h1>
              <p className="login-subtitle">
                Thương hiệu quản lý mượn thiết bị cao cấp, trực quan và giàu cảm hứng cho nhà trường hiện đại.
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
                <span>BorrowX Access</span>
                <p>Đăng nhập, đăng ký hoặc lấy lại quyền truy cập trong một giao diện duy nhất</p>
              </div>
              <Tabs activeKey={activeTab} onChange={setActiveTab} centered className="login-tabs">
                <Tabs.TabPane tab="Đăng Nhập" key="login">
                  <Form form={form} layout="vertical" onFinish={handleLogin} autoComplete="off">
                    <Form.Item
                      label="Email"
                      name="email"
                      rules={[
                        { required: true, message: 'Vui lòng nhập email!' },
                        { type: 'email', message: 'Email không hợp lệ!' },
                      ]}
                    >
                      <Input prefix={<MailOutlined />} placeholder="Email của bạn" size="large" />
                    </Form.Item>

                    <Form.Item
                      label="Mật Khẩu"
                      name="password"
                      rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                    >
                      <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu của bạn" size="large" />
                    </Form.Item>

                    <Form.Item>
                      <Button type="primary" htmlType="submit" size="large" block loading={loading} className="login-button">
                        Đăng Nhập
                      </Button>
                    </Form.Item>
                  </Form>
                </Tabs.TabPane>

                <Tabs.TabPane tab="Đăng Ký" key="register">
                  <Form form={registerForm} layout="vertical" onFinish={handleRegister} autoComplete="off">
                    <Form.Item
                      label="Họ và tên"
                      name="full_name"
                      rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="Họ và tên" size="large" />
                    </Form.Item>

                    <Form.Item
                      label="Mã sinh viên"
                      name="student_code"
                    >
                      <Input prefix={<IdcardOutlined />} placeholder="Mã sinh viên (không bắt buộc)" size="large" />
                    </Form.Item>

                    <Form.Item
                      label="Email"
                      name="email"
                      rules={[
                        { required: true, message: 'Vui lòng nhập email!' },
                        { type: 'email', message: 'Email không hợp lệ!' },
                      ]}
                    >
                      <Input prefix={<MailOutlined />} placeholder="Email của bạn" size="large" />
                    </Form.Item>

                    <Form.Item
                      label="Mật khẩu"
                      name="password"
                      rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }, { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự!' }]}
                    >
                      <Input.Password prefix={<LockOutlined />} placeholder="Tạo mật khẩu" size="large" />
                    </Form.Item>

                    <Form.Item>
                      <Button type="primary" htmlType="submit" size="large" block loading={loading} className="login-button">
                        Tạo Tài Khoản
                      </Button>
                    </Form.Item>
                  </Form>
                </Tabs.TabPane>

                <Tabs.TabPane tab="Quên Mật Khẩu" key="forgot">
                  <Form form={resetForm} layout="vertical" onFinish={handleResetPassword} autoComplete="off">
                    <Form.Item
                      label="Email"
                      name="email"
                      rules={[
                        { required: true, message: 'Vui lòng nhập email!' },
                        { type: 'email', message: 'Email không hợp lệ!' },
                      ]}
                    >
                      <Input prefix={<MailOutlined />} placeholder="Email đã đăng ký" size="large" />
                    </Form.Item>

                    <Form.Item
                      label="Mật khẩu mới"
                      name="new_password"
                      rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới!' }, { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự!' }]}
                    >
                      <Input.Password prefix={<KeyOutlined />} placeholder="Mật khẩu mới" size="large" />
                    </Form.Item>

                    <Divider className="login-divider">
                      <span className="login-divider__text"><CustomerServiceOutlined /> Hỗ trợ nhanh</span>
                    </Divider>

                    <Form.Item>
                      <Button type="primary" htmlType="submit" size="large" block loading={loading} className="login-button">
                        Đặt Lại Mật Khẩu
                      </Button>
                    </Form.Item>
                  </Form>
                </Tabs.TabPane>
              </Tabs>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Login;