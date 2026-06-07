import React, { useState, useEffect, useRef } from 'react';
import { Badge, Popover, List, Button, Empty, Spin, Tag } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';

interface Notification {
  id: number;
  title?: string;
  message: string;
  type?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  userId?: number;
  apiUrl: string;
}

const typeConfig: Record<string, { emoji: string; color: string }> = {
  queue: { emoji: '📋', color: '#7a5af8' },
  borrow: { emoji: '📤', color: '#175cd3' },
  return: { emoji: '📥', color: '#12b76a' },
  penalty: { emoji: '💰', color: '#f04438' },
  trust: { emoji: '🏆', color: '#f79009' },
  ticket: { emoji: '🔧', color: '#ef6820' },
  maintenance: { emoji: '⚙️', color: '#ef6820' },
  system: { emoji: '🔔', color: '#667085' },
};

const NotificationBell: React.FC<NotificationBellProps> = ({ userId, apiUrl }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const socketRef = useRef<any>(null);

  const token = localStorage.getItem('token');

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data?.data || []);
      }
    } catch {}
    setLoading(false);
  };

  const markRead = async (id: number) => {
    try {
      await fetch(`${apiUrl}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch(`${apiUrl}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    // Socket.io real-time
    try {
      const io = require('socket.io-client');
      const backendUrl = apiUrl.replace('/api', '');
      const socket = io(backendUrl, { transports: ['websocket', 'polling'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (userId) socket.emit('join', userId);
      });

      socket.on('notification', (data: Notification) => {
        setNotifications((prev) => [data, ...prev].slice(0, 50));
      });

      socket.on('queue_notify', (data: any) => {
        setNotifications((prev) => [
          {
            id: Date.now(),
            message: data.message || 'Thiết bị bạn đặt trước đã có sẵn!',
            type: 'queue',
            is_read: false,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 50));
      });
    } catch {}

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const content = (
    <div style={{ width: 340, maxHeight: 460, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(15,23,42,0.08)',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
          Thông báo {unreadCount > 0 && (
            <Tag color="red" style={{ marginLeft: 6, fontSize: 11 }}>{unreadCount} mới</Tag>
          )}
        </span>
        {unreadCount > 0 && (
          <Button size="small" type="link" onClick={markAllRead} icon={<CheckOutlined />} style={{ padding: 0, color: '#8b6b31' }}>
            Đọc hết
          </Button>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
        ) : notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có thông báo nào"
            style={{ padding: '32px 16px' }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => {
              const cfg = typeConfig[item.type || 'system'] || typeConfig.system;
              return (
                <div
                  key={item.id}
                  onClick={() => !item.is_read && markRead(item.id)}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '12px 16px',
                    cursor: item.is_read ? 'default' : 'pointer',
                    background: item.is_read ? 'transparent' : 'rgba(195,155,89,0.05)',
                    borderBottom: '1px solid rgba(15,23,42,0.05)',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!item.is_read) (e.currentTarget as HTMLDivElement).style.background = 'rgba(195,155,89,0.10)';
                  }}
                  onMouseLeave={(e) => {
                    if (!item.is_read) (e.currentTarget as HTMLDivElement).style.background = 'rgba(195,155,89,0.05)';
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${cfg.color}15`,
                      border: `1px solid ${cfg.color}25`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {cfg.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {item.title && (
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>
                        {item.title}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 13,
                        color: item.is_read ? 'var(--text-secondary)' : 'var(--text)',
                        lineHeight: 1.45,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as any,
                      }}
                    >
                      {item.message}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {new Date(item.created_at).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </div>
                  </div>
                  {!item.is_read && (
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#c39b59',
                        flexShrink: 0,
                        alignSelf: 'center',
                        animation: 'pulse-glow 2s ease infinite',
                        boxShadow: '0 0 0 0 rgba(195,155,89,0.4)',
                      }}
                    />
                  )}
                </div>
              );
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(15,23,42,0.08)', textAlign: 'center' }}>
        <Button type="link" size="small" onClick={fetchNotifications} style={{ color: '#8b6b31', fontSize: 12 }}>
          Tải lại thông báo
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      visible={open}
      onVisibleChange={setOpen}
      placement="bottomRight"
      overlayStyle={{ padding: 0 }}
      overlayInnerStyle={{ padding: 0, borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}
    >
      <button
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px 8px',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          transition: 'background 0.2s ease',
          position: 'relative',
        }}
        onMouseEnter={(e) => { (e.currentTarget).style.background = 'rgba(255,255,255,0.12)'; }}
        onMouseLeave={(e) => { (e.currentTarget).style.background = 'none'; }}
        id="notification-bell-btn"
      >
        <Badge
          count={unreadCount}
          size="small"
          style={{
            background: 'linear-gradient(135deg, #c39b59, #8b6b31)',
            boxShadow: '0 4px 8px rgba(139,107,49,0.35)',
          }}
        >
          <BellOutlined
            style={{
              fontSize: 20,
              color: '#fff',
              transition: 'transform 0.3s ease',
              ...(unreadCount > 0 ? { animation: 'bell-ring 1.5s ease infinite' } : {}),
            }}
          />
        </Badge>
      </button>
    </Popover>
  );
};

export default NotificationBell;
