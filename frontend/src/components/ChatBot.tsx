import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: number;
  role: 'user' | 'bot';
  content: string;
  time: string;
}

interface ChatBotProps {
  apiUrl: string;
}

const QUICK_REPLIES = [
  { label: '📋 Tôi có thể mượn gì?', message: 'Tôi có thể mượn những thiết bị nào?' },
  { label: '⏰ Hạn mượn tối đa?', message: 'Thời gian mượn tối đa là bao lâu?' },
  { label: '🏆 Điểm uy tín là gì?', message: 'Hệ thống điểm uy tín hoạt động như thế nào?' },
  { label: '📱 QR dùng để làm gì?', message: 'QR Code thiết bị dùng để làm gì?' },
  { label: '💰 Bị phạt không?', message: 'Trả trễ có bị phạt không?' },
  { label: '🤖 AI gợi ý gì?', message: 'AI gợi ý combo thiết bị như thế nào?' },
];

const BOT_RULES: Array<{ pattern: RegExp; answer: string }> = [
  {
    pattern: /mượn|thiết bị|borrow/i,
    answer: '📦 Bạn có thể mượn nhiều loại thiết bị:\n• 📷 Máy ảnh, máy quay\n• 🎤 Micro, loa, mixer\n• 💡 Đèn quay phim\n• 📐 Tripod, gimbal\n• 💻 Laptop, máy chiếu\n\nVào tab **Danh Sách Thiết Bị** để xem tất cả và bấm nút **Mượn** để đăng ký!',
  },
  {
    pattern: /hạn|thời gian|bao lâu|deadline|ngày trả/i,
    answer: '⏰ Thời gian mượn tối đa là **14 ngày**. Trả đúng hoặc trước hạn để:\n• ✅ Cộng +10 điểm uy tín\n• 🚀 Được ưu tiên duyệt tự động lần sau',
  },
  {
    pattern: /điểm|uy tín|trust|rank|hạng|gold|silver|bronze/i,
    answer: '🏆 Hệ thống điểm uy tín 3 hạng:\n\n🥇 **Gold** (80-100đ): Ưu tiên duyệt tự động!\n🥈 **Silver** (50-79đ): Ưu tiên xét duyệt\n🥉 **Bronze** (0-49đ): Chờ duyệt thông thường\n\nCách đổi điểm:\n• +10đ khi trả đúng hạn\n• -20đ khi trả trễ\n• -50đ khi làm hỏng thiết bị',
  },
  {
    pattern: /qr|mã qr|scan|quét/i,
    answer: '📱 QR Code mỗi thiết bị giúp:\n• Xem trạng thái tức thì (còn/hết)\n• Đặt mượn nhanh khi quét\n• Xác nhận mượn/trả tại chỗ\n• Không cần tìm trong danh sách!\n\nBấm icon 🔲 bên cạnh tên thiết bị để xem QR.',
  },
  {
    pattern: /phạt|tiền|trễ hạn|quá hạn|penalty/i,
    answer: '💰 Quy định phạt trả trễ:\n• **10.000đ/ngày** cho mỗi ngày trễ\n• Trừ **-20 điểm uy tín**\n• Nếu điểm < 0: bị **khóa quyền mượn 7 ngày**\n\n💡 Tip: Nộp phiếu mượn online để admin theo dõi và nhắc nhở đúng hạn!',
  },
  {
    pattern: /ai|gợi ý|combo|suggest|recommendation/i,
    answer: '🤖 AI Gemini phân tích lịch sử mượn 3 tháng qua và gợi ý:\n• **Combo thiết bị phù hợp** cho từng loại sự kiện\n• Ví dụ: *Sự kiện media* → Máy ảnh + Mic + Tripod\n• Hiển thị ngay trên trang chủ Sinh Viên!\n\nGợi ý tự động cập nhật mỗi tuần theo xu hướng thực tế.',
  },
  {
    pattern: /ký|chữ ký|signature|xác nhận/i,
    answer: '✍️ Ký số xác nhận khi mượn:\n• Ký tay trực tiếp trên màn hình cảm ứng\n• Lưu vào hệ thống làm bằng chứng\n• Xuất PDF phiếu mượn khi cần\n\nKhông cần giấy tờ, không cần in – 100% số hóa!',
  },
  {
    pattern: /pdf|xuất|export|in/i,
    answer: '📄 Xuất phiếu mượn PDF:\n1. Vào **Lịch Sử Mượn**\n2. Chọn yêu cầu đã được duyệt\n3. Bấm **Xuất PDF**\n\nFile PDF bao gồm đầy đủ thông tin + chữ ký số, dùng làm chứng từ khi cần!',
  },
  {
    pattern: /đặt trước|queue|xếp hàng|reservation/i,
    answer: '📋 Đặt trước thiết bị đang hết:\n1. Tìm thiết bị bạn muốn mượn\n2. Nếu **Hết hàng**, bấm **📋 Đặt trước**\n3. Khi có người trả → hệ thống **tự động thông báo** cho bạn!\n\nBạn có thể xem vị trí hàng chờ trong mục **Lịch sử mượn**.',
  },
  {
    pattern: /báo lỗi|hỏng|sự cố|ticket|report/i,
    answer: '🔧 Báo lỗi thiết bị:\n1. Vào tab **Báo Lỗi Thiết Bị** (hoặc bấm nút 🔧 trên trang thiết bị)\n2. Điền tên thiết bị và mô tả lỗi\n3. Chọn mức ưu tiên (Thường / Cao / Khẩn cấp)\n\nĐội kỹ thuật sẽ xử lý và cập nhật trạng thái trong hệ thống!',
  },
  {
    pattern: /admin|quản trị|quản lý/i,
    answer: '👑 Admin có thể:\n• Duyệt/từ chối yêu cầu mượn\n• Quản lý kho thiết bị\n• Xem lịch mượn dạng Calendar\n• Theo dõi bảo trì\n• Quản lý điểm uy tín sinh viên\n• Xuất báo cáo Excel\n\nĐăng nhập bằng tài khoản admin để truy cập!',
  },
  {
    pattern: /xin chào|hello|hi|chào|hey/i,
    answer: '👋 Xin chào! Tôi là **BorrowBot** – trợ lý thông minh của BorrowX!\n\nTôi có thể giúp bạn:\n• Tìm hiểu cách mượn thiết bị\n• Giải thích điểm uy tín\n• Hướng dẫn dùng QR Code\n• Trả lời thắc mắc về hệ thống\n\nHỏi tôi bất cứ điều gì! 🚀',
  },
  {
    pattern: /cảm ơn|thanks|thank you|tốt|hay|giỏi/i,
    answer: '😊 Cảm ơn bạn đã tin tưởng BorrowBot! Nếu còn thắc mắc gì, cứ hỏi nhé! 🙌\n\nChúc bạn mượn thiết bị thành công! 📦✨',
  },
];

const findAnswer = (input: string): string => {
  for (const rule of BOT_RULES) {
    if (rule.pattern.test(input)) return rule.answer;
  }
  return '🤔 Câu hỏi hay! Tôi chưa có câu trả lời chính xác cho vấn đề này.\n\nBạn có thể:\n• Liên hệ admin qua **Ticket Báo Lỗi**\n• Xem phần **Hướng dẫn** trong menu\n\nHoặc thử hỏi tôi theo cách khác!';
};

const formatTime = (date: Date) =>
  date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const renderMarkdown = (text: string) =>
  text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');

const ChatBot: React.FC<ChatBotProps> = ({ apiUrl }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'bot',
      content: '👋 Xin chào! Tôi là **BorrowBot** – trợ lý AI của BorrowX!\n\nTôi có thể giúp bạn tìm hiểu về cách mượn thiết bị, điểm uy tín, QR Code và nhiều hơn nữa. Hỏi tôi ngay! 🚀',
      time: formatTime(new Date()),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  useEffect(() => {
    if (!open && messages.length > 1) {
      setUnread((prev) => prev + 1);
    }
  }, [messages]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;

    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: msg,
      time: formatTime(new Date()),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Simulate bot "thinking"
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));

    const answer = findAnswer(msg);
    const botMsg: Message = {
      id: Date.now() + 1,
      role: 'bot',
      content: answer,
      time: formatTime(new Date()),
    };

    setMessages((prev) => [...prev, botMsg]);
    setTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat window */}
      {open && (
        <div
          className="chatbot-window"
          style={{
            position: 'fixed',
            bottom: 90,
            right: 24,
            width: 380,
            height: 520,
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 24,
            boxShadow: '0 30px 70px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            backdropFilter: 'blur(20px)',
            animation: 'animate-scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #08111f, #0f1b2d)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #c39b59, #8b6b31)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  boxShadow: '0 4px 14px rgba(195,155,89,0.35)',
                }}
              >
                🤖
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>BorrowBot</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#12b76a', display: 'inline-block' }} />
                  Luôn sẵn sàng hỗ trợ
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                color: '#fff',
                cursor: 'pointer',
                padding: '6px 10px',
                fontSize: 14,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget).style.background = 'rgba(255,255,255,0.20)'; }}
              onMouseLeave={(e) => { (e.currentTarget).style.background = 'rgba(255,255,255,0.10)'; }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              scrollbarWidth: 'thin',
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: 10,
                  animation: 'animate-fade-in 0.3s ease both',
                }}
              >
                {msg.role === 'bot' && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #c39b59, #8b6b31)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      flexShrink: 0,
                      alignSelf: 'flex-end',
                    }}
                  >
                    🤖
                  </div>
                )}
                <div
                  style={{
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #c39b59, #8b6b31)'
                      : 'var(--muted-light)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text)',
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    boxShadow: msg.role === 'user'
                      ? '0 4px 14px rgba(195,155,89,0.28)'
                      : '0 2px 8px rgba(0,0,0,0.06)',
                    border: msg.role === 'bot' ? '1px solid var(--border-color)' : 'none',
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  <div
                    style={{
                      fontSize: 10,
                      color: msg.role === 'user' ? 'rgba(255,255,255,0.65)' : 'var(--text-secondary)',
                      marginTop: 6,
                      textAlign: msg.role === 'user' ? 'right' : 'left',
                    }}
                  >
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #c39b59, #8b6b31)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  🤖
                </div>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '18px 18px 18px 4px',
                    background: 'var(--muted-light)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    gap: 5,
                    alignItems: 'center',
                  }}
                >
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <div
                      key={i}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: '#c39b59',
                        animation: `bounce-in 0.8s ease ${delay}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick Replies */}
          {messages.length <= 2 && (
            <div
              style={{
                padding: '6px 16px',
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                scrollbarWidth: 'none',
                flexShrink: 0,
              }}
            >
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q.label}
                  onClick={() => sendMessage(q.message)}
                  style={{
                    flexShrink: 0,
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(195,155,89,0.30)',
                    background: 'rgba(195,155,89,0.08)',
                    color: '#8b6b31',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget).style.background = 'rgba(195,155,89,0.18)';
                    (e.currentTarget).style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget).style.background = 'rgba(195,155,89,0.08)';
                    (e.currentTarget).style.transform = '';
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              background: 'var(--card-bg)',
              flexShrink: 0,
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi BorrowBot bất cứ điều gì..."
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1.5px solid var(--border-color)',
                borderRadius: 14,
                fontSize: 13,
                outline: 'none',
                background: 'var(--muted-light)',
                color: 'var(--text)',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#c39b59'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || typing}
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: input.trim() ? 'linear-gradient(135deg, #c39b59, #8b6b31)' : 'var(--muted-light)',
                border: 'none',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.25s ease',
                flexShrink: 0,
                boxShadow: input.trim() ? '0 4px 14px rgba(195,155,89,0.30)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (input.trim()) {
                  (e.currentTarget).style.transform = 'scale(1.08)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget).style.transform = '';
              }}
            >
              <span role="img" aria-label="send">🚀</span>
            </button>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        className="chatbot-fab"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: open
            ? 'linear-gradient(135deg, #f04438, #c4320a)'
            : 'linear-gradient(135deg, #0f1b2d, #243a63)',
          border: 'none',
          cursor: 'pointer',
          fontSize: open ? 22 : 24,
          color: '#fff',
          boxShadow: '0 10px 30px rgba(7,15,28,0.35)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget).style.transform = 'scale(1.12) translateY(-3px)';
          (e.currentTarget).style.boxShadow = '0 16px 40px rgba(7,15,28,0.40)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget).style.transform = '';
          (e.currentTarget).style.boxShadow = '0 10px 30px rgba(7,15,28,0.35)';
        }}
        id="chatbot-fab-btn"
      >
        <span role="img" aria-label="chat">{open ? '✕' : '🤖'}</span>
        {!open && unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#f04438',
              color: '#fff',
              fontSize: 11,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #fff',
            }}
          >
            {unread}
          </span>
        )}
      </button>
    </>
  );
};

export default ChatBot;
