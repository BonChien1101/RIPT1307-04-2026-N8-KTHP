import React from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Space, Typography, Avatar, Progress } from 'antd';
import {
  TeamOutlined,
  BookOutlined,
  DollarOutlined,
  ToolOutlined,
  NotificationOutlined,
  ArrowUpOutlined,
  PlusOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const ClubLeaderDashboard: React.FC = () => {
  // Mock data for members and requests
  const recentBorrowings = [
    {
      key: '1',
      student: 'Nguyễn Văn A',
      equipment: 'Loa kéo Sony',
      date: '2026-06-03',
      status: 'approved',
    },
    {
      key: '2',
      student: 'Trần Thị B',
      equipment: 'Micro không dây',
      date: '2026-06-04',
      status: 'pending',
    },
    {
      key: '3',
      student: 'Lê Văn C',
      equipment: 'Máy chiếu Epson',
      date: '2026-06-02',
      status: 'returned',
    },
  ];

  const columns = [
    {
      title: 'Thành viên',
      dataIndex: 'student',
      key: 'student',
      render: (text: string) => (
        <Space>
          <Avatar style={{ backgroundColor: '#1890ff' }}>{text[0]}</Avatar>
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: 'Thiết bị mượn',
      dataIndex: 'equipment',
      key: 'equipment',
    },
    {
      title: 'Ngày đăng ký',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'orange';
        let text = 'Chờ duyệt';
        if (status === 'approved') {
          color = 'green';
          text = 'Đang mượn';
        } else if (status === 'returned') {
          color = 'blue';
          text = 'Đã trả';
        }
        return <Tag color={color}>{text}</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* Header section with glassmorphism/gradient vibes */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
          padding: '24px 32px',
          borderRadius: '16px',
          marginBottom: '24px',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(24, 144, 255, 0.2)',
        }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={2} style={{ color: '#fff', margin: 0 }}>
              Không gian Trưởng CLB 🚀
            </Title>
            <Paragraph style={{ color: 'rgba(255, 255, 255, 0.85)', margin: '8px 0 0 0' }}>
              Chào mừng bạn trở lại! Quản lý thành viên, tài sản và các lượt mượn thiết bị của câu lạc bộ.
            </Paragraph>
          </Col>
          <Col>
            <Button
              type="primary"
              ghost
              icon={<PlusOutlined />}
              style={{
                borderColor: '#fff',
                color: '#fff',
                borderRadius: '8px',
                height: '40px',
              }}
            >
              Đăng ký thiết bị mới
            </Button>
          </Col>
        </Row>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ borderRadius: '12px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Thành viên CLB"
              value={45}
              prefix={<TeamOutlined style={{ color: '#1890ff', marginRight: '8px' }} />}
              valueStyle={{ fontWeight: 'bold' }}
            />
            <div style={{ marginTop: '8px', color: '#52c41a' }}>
              <ArrowUpOutlined /> +12% tháng này
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ borderRadius: '12px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Thiết bị đang mượn"
              value={8}
              prefix={<BookOutlined style={{ color: '#52c41a', marginRight: '8px' }} />}
              valueStyle={{ fontWeight: 'bold' }}
            />
            <div style={{ marginTop: '8px', color: '#8c8c8c' }}>
              Hạn trả tiếp theo: Ngày mai
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ borderRadius: '12px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Kinh phí CLB"
              value={2500000}
              suffix="đ"
              prefix={<DollarOutlined style={{ color: '#faad14', marginRight: '8px' }} />}
              valueStyle={{ fontWeight: 'bold' }}
            />
            <div style={{ marginTop: '8px', color: '#52c41a' }}>
              Đã giải ngân: 80%
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ borderRadius: '12px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Yêu cầu bảo trì"
              value={1}
              prefix={<ToolOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />}
              valueStyle={{ fontWeight: 'bold' }}
            />
            <div style={{ marginTop: '8px', color: '#ff4d4f' }}>
              Cần xử lý gấp
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Content Area */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <NotificationOutlined style={{ color: '#1890ff' }} />
                <span>Yêu cầu mượn thiết bị gần đây</span>
              </Space>
            }
            style={{ borderRadius: '12px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <Table
              dataSource={recentBorrowings}
              columns={columns}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="Mục tiêu hoạt động CLB"
            style={{
              height: '100%',
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: '8px' }}>
                <span>Chuẩn bị sự kiện hè</span>
                <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>75%</span>
              </div>
              <Progress percent={75} status="active" strokeColor="#1890ff" />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: '8px' }}>
                <span>Bảo dưỡng thiết bị âm thanh</span>
                <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>40%</span>
              </div>
              <Progress percent={40} status="active" strokeColor="#ff4d4f" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: '8px' }}>
                <span>Tuyển thành viên mới</span>
                <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>90%</span>
              </div>
              <Progress percent={90} status="success" />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ClubLeaderDashboard;
