import React, { useState } from 'react';
import { Form, Input, Button, Card, Row, Col, message, Tabs, Divider } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  SafetyOutlined,
  AppstoreOutlined,
  IdcardOutlined,
  KeyOutlined,
  CustomerServiceOutlined,
  TrophyOutlined,
  CalendarOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import './styles.less';
import { routeByRole } from '../../utils/auth';
import { getApiUrl } from '../../utils/api';

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [resetForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const apiUrl = getApiUrl();
  const [forgotStep, setForgotStep] = useState(1);
  const applyLoginResult = (loginData: any) => {
    const token = loginData?.token;
    const user = loginData?.user;
    if (!token || !user || !user.role) {
      message.error('Phản hồi đăng nhập không hợp lệ từ server!');
      return false;
    }
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    message.success('Đăng nhập thành công! 🎉');
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
        body: JSON.stringify({ email: values.email, password: values.password }),
      });
      if (response.ok) {
        const payload = await response.json();
        applyLoginResult(payload?.data || payload);
      } else {
        await showApiError(response, 'Email hoặc mật khẩu không đúng!');
      }
    } catch {
      message.error('Lỗi kết nối server!');
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
        message.success('Đăng ký thành công! 🎉');
        applyLoginResult(payload?.data || payload);
      } else {
        await showApiError(response, 'Đăng ký thất bại!');
      }
    } catch {
      message.error('Lỗi kết nối server!');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (values: any) => {
  setLoading(true);
  try {
    if (forgotStep === 1) {
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });
      if (response.ok) {
        message.success('Mã OTP đã được gửi về email của bạn!');
        setForgotStep(2);
      } else {
        await showApiError(response, 'Không thể gửi mã OTP!');
      }
    } else {

      const response = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: values.email, 
          otp_code: values.otp_code, 
          new_password: values.new_password 
        }),
      });
      if (response.ok) {
        message.success('Đặt lại mật khẩu thành công! Hãy đăng nhập lại.');
        resetForm.resetFields();
        setForgotStep(1);
        setActiveTab('login');
      } else {
        await showApiError(response, 'Mã OTP không đúng hoặc đã hết hạn!');
      }
    }
  } catch {
    message.error('Lỗi kết nối server!');
  } finally {
    setLoading(false);
  }
};

  const features = [
    { icon: <ThunderboltOutlined />, text: 'Mượn thiết bị siêu nhanh – chỉ 1 click' },
    { icon: <TrophyOutlined />, text: 'Hệ thống điểm uy tín Bronze / Silver / Gold' },
    { icon: <CalendarOutlined />, text: 'Lịch mượn thông minh, tránh trùng lịch' },
    { icon: <RobotOutlined />, text: 'AI Gemini gợi ý combo thiết bị tự động' },
    { icon: <SafetyOutlined />, text: 'Ký số xác nhận – bảo mật & chuyên nghiệp' },
    { icon: <AppstoreOutlined />, text: 'QR Code mỗi thiết bị – quét & mượn ngay' },
  ];

  return (
    <div className="login-page">
      {/* Floating orbs */}
      <div className="login-orb login-orb--1" />
      <div className="login-orb login-orb--2" />
      <div className="login-orb login-orb--3" />

      <Row justify="center" align="middle" className="login-row">
        <Col xs={24} sm={22} md={20} lg={18} xl={16}>
          <div className="login-shell">
            {/* Hero left */}
            <section className="login-hero">
              <div className="login-tagline">
                <ThunderboltOutlined /> Smart Campus Platform v2.0
              </div>

              <div className="login-brand">📦</div>

              <h1 className="login-title">
                <span className="title-accent">BorrowX</span>
                <br />Smart Campus
              </h1>

              <p className="login-subtitle">
                Hệ thống quản lý mượn thiết bị thông minh cho trường đại học. 
                Tiết kiệm thời gian, chuyên nghiệp và minh bạch.
              </p>

              <div className="login-features">
                {features.map((f, i) => (
                  <div
                    key={i}
                    className="login-feature"
                    style={{ animationDelay: `${0.1 * i + 0.4}s` }}
                  >
                    {f.icon}
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>

              {/* Stats strip */}
              <div className="login-stats">
                <div className="login-stat">
                  <strong>18+</strong>
                  <span>Tính năng mới</span>
                </div>
                <div className="login-stat-divider" />
                <div className="login-stat">
                  <strong>AI</strong>
                  <span>Gemini gợi ý</span>
                </div>
                <div className="login-stat-divider" />
                <div className="login-stat">
                  <strong>QR</strong>
                  <span>Quét & mượn</span>
                </div>
                <div className="login-stat-divider" />
                <div className="login-stat">
                  <strong>Real-time</strong>
                  <span>Thông báo tức thì</span>
                </div>
              </div>
            </section>

            {/* Auth card right */}
            <Card className="login-card" bordered={false}>
              <div className="login-card-header">
                <div className="login-card-icon">🔑</div>
                <span>BorrowX Access</span>
                <p>Đăng nhập, đăng ký hoặc khôi phục tài khoản</p>
              </div>

              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                centered
                className="login-tabs"
              >
                {/* LOGIN TAB */}
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
                      <Input
                        prefix={<MailOutlined />}
                        placeholder="your@email.com"
                        size="large"
                        id="login-email"
                      />
                    </Form.Item>

                    <Form.Item
                      label="Mật Khẩu"
                      name="password"
                      rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="••••••••"
                        size="large"
                        id="login-password"
                      />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        block
                        loading={loading}
                        className="login-button"
                        id="login-submit-btn"
                      >
                        {loading ? 'Đang đăng nhập...' : 'Đăng Nhập →'}
                      </Button>
                    </Form.Item>
                  </Form>
                </Tabs.TabPane>

                {/* REGISTER TAB */}
                <Tabs.TabPane tab="Đăng Ký" key="register">
                  <Form form={registerForm} layout="vertical" onFinish={handleRegister} autoComplete="off">
                    <Form.Item
                      label="Họ và tên"
                      name="full_name"
                      rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" size="large" id="reg-fullname" />
                    </Form.Item>

                    <Form.Item label="Mã sinh viên" name="student_code">
                      <Input prefix={<IdcardOutlined />} placeholder="B21DCXX000 (không bắt buộc)" size="large" id="reg-studentcode" />
                    </Form.Item>

                    <Form.Item
                      label="Email"
                      name="email"
                      rules={[
                        { required: true, message: 'Vui lòng nhập email!' },
                        { type: 'email', message: 'Email không hợp lệ!' },
                      ]}
                    >
                      <Input prefix={<MailOutlined />} placeholder="your@email.com" size="large" id="reg-email" />
                    </Form.Item>

                    <Form.Item
                      label="Mật khẩu"
                      name="password"
                      rules={[
                        { required: true, message: 'Vui lòng nhập mật khẩu!' },
                        { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự!' },
                      ]}
                    >
                      <Input.Password prefix={<LockOutlined />} placeholder="Tạo mật khẩu mạnh" size="large" id="reg-password" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        block
                        loading={loading}
                        className="login-button"
                        id="reg-submit-btn"
                      >
                        {loading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản →'}
                      </Button>
                    </Form.Item>
                  </Form>
                </Tabs.TabPane>

                {/* FORGOT PASSWORD TAB */}
                <Tabs.TabPane tab="Quên Mật Khẩu" key="forgot">
                  <Form form={resetForm} layout="vertical" onFinish={handleResetPassword} autoComplete="off">
                    <Form.Item
                      label="Email"
                      name="email"
                      rules={[{ required: true, message: 'Vui lòng nhập email!' }, { type: 'email' }]}
                    >
                      <Input 
                        prefix={<MailOutlined />} 
                        placeholder="Email của bạn" 
                        size="large" 
                        disabled={forgotStep === 2} // Khóa email ở bước 2
                      />
                    </Form.Item>

                    {forgotStep === 2 && (
                      <>
                        <Form.Item
                          label="Mã OTP"
                          name="otp_code"
                          rules={[{ required: true, message: 'Vui lòng nhập mã OTP!' }]}
                        >
                          <Input prefix={<SafetyOutlined />} placeholder="Nhập 6 số OTP" size="large" />
                        </Form.Item>
                        
                        <Form.Item
                          label="Mật khẩu mới"
                          name="new_password"
                          rules={[{ required: true, message: 'Nhập mật khẩu mới!' }, { min: 6 }]}
                        >
                          <Input.Password prefix={<KeyOutlined />} placeholder="Mật khẩu mới" size="large" />
                        </Form.Item>
                      </>
                    )}

                    <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                      {forgotStep === 1 ? 'Gửi mã OTP →' : 'Đặt Lại Mật Khẩu →'}
                    </Button>
                    
                    {forgotStep === 2 && (
                      <Button type="link" onClick={() => setForgotStep(1)} block style={{ marginTop: 10 }}>
                        Quay lại
                      </Button>
                    )}
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