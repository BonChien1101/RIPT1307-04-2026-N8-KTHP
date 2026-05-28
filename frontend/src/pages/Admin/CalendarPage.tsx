import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer, Views, Event } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, Modal, Tag, Space, Badge, Spin, Select, Button, Tooltip } from 'antd';
import { CalendarOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';

moment.locale('vi');
const localizer = momentLocalizer(moment);

interface CalendarEvent extends Event {
  id: number;
  title: string;
  start: Date;
  end: Date;
  status: string;
  resource?: any;
}

interface CalendarPageProps {
  apiUrl: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#7a5af8', text: '#fff', label: 'Chờ duyệt' },
  approved: { bg: '#175cd3', text: '#fff', label: 'Đã duyệt' },
  borrowed: { bg: '#f79009', text: '#fff', label: 'Đang mượn' },
  returned: { bg: '#12b76a', text: '#fff', label: 'Đã trả' },
  rejected: { bg: '#f04438', text: '#fff', label: 'Từ chối' },
  overdue: { bg: '#d92d20', text: '#fff', label: 'Quá hạn' },
};

const CalendarPage: React.FC<CalendarPageProps> = ({ apiUrl }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<typeof Views[keyof typeof Views]>(Views.MONTH);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const token = localStorage.getItem('token');

  const fetchEvents = useCallback(async (date: Date = currentDate) => {
    setLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const res = await fetch(
        `${apiUrl}/calendar/events?year=${year}&month=${month}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const evts: CalendarEvent[] = (data?.data || []).map((e: any) => ({
          id: e.id,
          title: e.title || `Mượn #${e.id}`,
          start: new Date(e.start || e.borrow_date),
          end: new Date(e.end || e.expected_return_date),
          status: e.status,
          resource: e,
        }));
        setEvents(evts);
      }
    } catch {}
    setLoading(false);
  }, [apiUrl, token]);

  useEffect(() => {
    fetchEvents(currentDate);
  }, [currentDate]);

  const handleNavigate = (date: Date) => {
    setCurrentDate(date);
  };

  const filteredEvents = filterStatus === 'all'
    ? events
    : events.filter((e) => e.status === filterStatus);

  const eventStyleGetter = (event: CalendarEvent) => {
    const cfg = STATUS_COLORS[event.status] || STATUS_COLORS.pending;
    return {
      style: {
        backgroundColor: cfg.bg,
        color: cfg.text,
        border: 'none',
        borderRadius: '8px',
        padding: '2px 8px',
        fontSize: '12px',
        fontWeight: 600,
        boxShadow: `0 2px 8px ${cfg.bg}40`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    };
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const messages = {
    allDay: 'Cả ngày',
    previous: '← Trước',
    next: 'Sau →',
    today: 'Hôm nay',
    month: 'Tháng',
    week: 'Tuần',
    day: 'Ngày',
    agenda: 'Lịch',
    date: 'Ngày',
    time: 'Giờ',
    event: 'Sự kiện',
    showMore: (total: number) => `+${total} sự kiện`,
    noEventsInRange: 'Không có lịch mượn trong khoảng thời gian này.',
  };

  const totalByStatus = Object.entries(STATUS_COLORS).reduce(
    (acc, [key]) => ({ ...acc, [key]: events.filter((e) => e.status === key).length }),
    {} as Record<string, number>
  );

  return (
    <div>
      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_COLORS).map(([key, cfg]) => (
          <div
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 999,
              background: filterStatus === key ? cfg.bg : `${cfg.bg}15`,
              border: `1.5px solid ${cfg.bg}${filterStatus === key ? 'ff' : '40'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.bg, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: filterStatus === key ? '#fff' : cfg.bg }}>
              {cfg.label}
            </span>
            <span
              style={{
                fontWeight: 800,
                fontSize: 13,
                color: filterStatus === key ? '#fff' : cfg.bg,
              }}
            >
              {totalByStatus[key] || 0}
            </span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={() => fetchEvents(currentDate)}
            loading={loading}
          >
            Làm mới
          </Button>
          {filterStatus !== 'all' && (
            <Button size="small" onClick={() => setFilterStatus('all')}>
              Bỏ lọc
            </Button>
          )}
        </div>
      </div>

      <Card
        className="content-card"
        bodyStyle={{ padding: 0 }}
        style={{ borderRadius: 18, overflow: 'hidden' }}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : (
          <div
            style={{ height: 620 }}
            className="borrowx-calendar"
          >
            <Calendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%', padding: '16px' }}
              onSelectEvent={handleSelectEvent}
              onNavigate={handleNavigate}
              view={view as any}
              onView={(v: any) => setView(v)}
              date={currentDate}
              eventPropGetter={eventStyleGetter}
              messages={messages}
              popup
              showMultiDayTimes
              culture="vi"
            />
          </div>
        )}
      </Card>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap', padding: '0 4px' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Chú thích màu:</span>
        {Object.entries(STATUS_COLORS).map(([key, cfg]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: cfg.bg, display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Event Detail Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarOutlined style={{ color: '#c39b59' }} />
            <span>Chi tiết lịch mượn</span>
          </div>
        }
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={440}
      >
        {selectedEvent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: `${STATUS_COLORS[selectedEvent.status]?.bg || '#888'}15`,
                border: `1px solid ${STATUS_COLORS[selectedEvent.status]?.bg || '#888'}30`,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                {selectedEvent.title}
              </div>
              <Tag color={STATUS_COLORS[selectedEvent.status]?.bg}>
                {STATUS_COLORS[selectedEvent.status]?.label || selectedEvent.status}
              </Tag>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Ngày mượn', value: moment(selectedEvent.start).format('DD/MM/YYYY') },
                { label: 'Ngày trả dự kiến', value: moment(selectedEvent.end).format('DD/MM/YYYY') },
                { label: 'Thời lượng', value: `${moment(selectedEvent.end).diff(moment(selectedEvent.start), 'days') + 1} ngày` },
                { label: 'Mã yêu cầu', value: `#${selectedEvent.id}` },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    padding: '10px 14px',
                    background: 'var(--muted-light)',
                    borderRadius: 10,
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CalendarPage;
