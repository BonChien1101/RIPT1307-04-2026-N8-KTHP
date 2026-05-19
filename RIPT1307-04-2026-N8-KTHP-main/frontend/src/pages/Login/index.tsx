import React, { useState } from 'react';
import { Form, Input, Button, Card, Row, Col, message, Select } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'umi';
import './styles.less';

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'student' | 'admin'>('student');
  const navigate = useNavigate();

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      // Call API login endpoint
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        message.success('Đăng nhập thành công!');
        
        // Redirect based on user role
        if (data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/student');
        }

        // Reload to update initialState
        window.location.reload();
      } else {
        message.error('Tên đăng nhập hoặc mật khẩu không đúng!');
      }
    } catch (error) {
      message.error('Lỗi kết nối đến server!');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
        <Col xs={22} sm={20} md={12} lg={8}>
          <Card
            title="Hệ Thống Quản Lý Mượn Đồ Dùng"
            className="login-card"
            bordered={false}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleLogin}
              autoComplete="off"
            >
              <Form.Item
                label="Loại Tài Khoản"
                name="userType"
                initialValue="student"
              >
                <Select
                  onChange={(value) => setUserType(value)}
                  options={[
                    { label: 'Sinh Viên', value: 'student' },
                    { label: 'Quản Trị Viên', value: 'admin' },
                  ]}
                />
              </Form.Item>

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
                >
                  Đăng Nhập
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Login;