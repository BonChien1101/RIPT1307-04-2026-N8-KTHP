import React, { useState, useRef, useCallback } from 'react';
import { Modal, Button, Tag, Spin, message, Tooltip } from 'antd';
import { QrcodeOutlined, DownloadOutlined, ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';

interface QRModalProps {
  equipmentId: number;
  equipmentName: string;
  apiUrl: string;
}

const QRModal: React.FC<QRModalProps> = ({ equipmentId, equipmentName, apiUrl }) => {
  const [visible, setVisible] = useState(false);
  const [qrBase64, setQrBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const fetchedRef = useRef(false);

  const fetchQR = useCallback(async () => {
    setLoading(true);
    fetchedRef.current = true;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/qr/equipment/${equipmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQrBase64(data?.data?.qr_base64 || '');
        setStatus(data?.data);
      } else {
        message.error('Không tạo được QR!');
      }
    } catch {
      message.error('Lỗi kết nối!');
    }
    setLoading(false);
  }, [apiUrl, equipmentId]);

  const openModal = () => {
    setVisible(true);
    if (!fetchedRef.current) fetchQR();
  };

  const downloadQR = () => {
    if (!qrBase64) return;
    const a = document.createElement('a');
    a.href = qrBase64;
    a.download = `qr-${equipmentName.replace(/\s+/g, '-')}.png`;
    a.click();
  };

  const getStatusTag = () => {
    if (!status) return null;
    const qty = status.available_quantity ?? 0;
    const st = status.status;
    if (st === 'maintenance') return <Tag color="purple">🔧 Đang bảo trì</Tag>;
    if (qty === 0) return <Tag color="red">❌ Hết hàng</Tag>;
    if (qty <= 2) return <Tag color="orange">⚠️ Sắp hết ({qty} còn)</Tag>;
    return <Tag color="green"><CheckCircleOutlined /> Có sẵn ({qty})</Tag>;
  };

  return (
    <>
      <Tooltip title="Xem QR Code">
        <Button
          size="small"
          icon={<QrcodeOutlined />}
          onClick={openModal}
          style={{
            borderRadius: 8,
            border: '1px solid rgba(195,155,89,0.30)',
            color: '#8b6b31',
            background: 'rgba(195,155,89,0.08)',
            transition: 'all 0.2s ease',
          }}
          id={`qr-btn-${equipmentId}`}
        />
      </Tooltip>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #c39b59, #8b6b31)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              <QrcodeOutlined style={{ color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>QR Code Thiết Bị</div>
              <div style={{ fontSize: 12, color: '#667085', fontWeight: 400 }}>{equipmentName}</div>
            </div>
          </div>
        }
        visible={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        width={400}
        centered
        bodyStyle={{ padding: '24px' }}
        style={{ borderRadius: 24, overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {/* Status */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {getStatusTag()}
          </div>

          {/* QR Display with 3D hover */}
          <div
            style={{
              padding: 16,
              background: '#fff',
              borderRadius: 20,
              border: '2px solid rgba(195,155,89,0.20)',
              boxShadow:
                '0 20px 40px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.80)',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              cursor: 'default',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform =
                'perspective(500px) rotateY(-6deg) rotateX(4deg) scale(1.03)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = '';
            }}
          >
            {loading ? (
              <div
                style={{
                  width: 220,
                  height: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Spin size="large" />
              </div>
            ) : qrBase64 ? (
              <img
                src={qrBase64}
                alt={`QR ${equipmentName}`}
                style={{
                  width: 220,
                  height: 220,
                  display: 'block',
                  borderRadius: 8,
                  imageRendering: 'pixelated',
                }}
              />
            ) : (
              <div
                style={{
                  width: 220,
                  height: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#667085',
                  fontSize: 14,
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <QrcodeOutlined style={{ fontSize: 40, opacity: 0.3 }} />
                <span>Chưa tạo QR</span>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div
            style={{
              background: 'rgba(195,155,89,0.06)',
              borderRadius: 12,
              padding: '12px 16px',
              border: '1px solid rgba(195,155,89,0.14)',
              width: '100%',
            }}
          >
            <div style={{ fontSize: 12, color: '#667085', lineHeight: 1.7, textAlign: 'center' }}>
              📱 Quét QR để xem thông tin thiết bị<br />
              📤 Mượn · 📥 Trả · 🔍 Tra cứu trạng thái
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <Button
              icon={<DownloadOutlined />}
              onClick={downloadQR}
              disabled={!qrBase64}
              style={{ flex: 1, borderRadius: 12, height: 40 }}
            >
              Tải QR
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchQR}
              loading={loading}
              style={{ flex: 1, borderRadius: 12, height: 40 }}
            >
              Tạo lại
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default QRModal;
