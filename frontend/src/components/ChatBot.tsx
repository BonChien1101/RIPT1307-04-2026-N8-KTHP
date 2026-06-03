import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Message {
  id: number;
  role: 'user' | 'bot';
  content: string;
  time: string;
}

interface ChatBotProps {
  apiUrl: string;
}

interface EquipmentLite {
  id: number;
  name: string;
  category?: string;
  description?: string;
  available_quantity?: number;
  total_quantity?: number;
  status?: string;
  max_borrow_days?: number;
  storage_location?: string;
  condition_status?: string;
}

interface ComboLite {
  id: number;
  name: string;
  description?: string;
  available?: boolean;
  items?: Array<{ equipment_name?: string; quantity?: number }>;
}

interface BorrowLite {
  id: number;
  status?: string;
  borrow_date?: string;
  expected_return_date?: string;
  actual_return_date?: string;
  note?: string;
}

interface TrustLite {
  trust_score?: number;
  trust_rank?: string;
}

interface BotContext {
  equipments: EquipmentLite[];
  combos: ComboLite[];
  borrowHistory: BorrowLite[];
  trust: TrustLite | null;
}

const QUICK_REPLIES = [
  { label: 'Có thể mượn gì?', message: 'Hiện có những thiết bị nào còn mượn được?' },
  { label: 'Gợi ý combo', message: 'Tôi cần quay video sự kiện, nên mượn combo nào?' },
  { label: 'Hạn mượn', message: 'Thời gian mượn tối đa là bao lâu?' },
  { label: 'Điểm uy tín', message: 'Điểm uy tín của tôi hoạt động như thế nào?' },
  { label: 'Thiết bị hết hàng', message: 'Nếu thiết bị hết hàng thì tôi phải làm gì?' },
];

const STOP_WORDS = new Set([
  'toi', 'minh', 'ban', 'cho', 'hoi', 'can', 'muon', 'duoc', 'khong', 'con', 'may',
  'cai', 'chiec', 'thiet', 'bi', 'nao', 'gi', 'la', 'co', 've', 'de', 'lam', 'nen',
]);

const PURPOSE_KEYWORDS = [
  { intent: 'quay video', words: ['quay', 'video', 'vlog', 'livestream'], needs: ['camera', 'micro', 'tripod', 'gimbal', 'den'] },
  { intent: 'chụp ảnh', words: ['chup', 'anh', 'san pham', 'poster'], needs: ['camera', 'tripod', 'den'] },
  { intent: 'hội thảo/thuyết trình', words: ['hoi thao', 'thuyet trinh', 'lop hoc', 'seminar'], needs: ['projector', 'may chieu', 'micro', 'loa', 'laptop'] },
  { intent: 'âm thanh sự kiện', words: ['am thanh', 'su kien', 'loa', 'micro'], needs: ['micro', 'loa', 'mixer'] },
];

const normalizeText = (value: string) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatTime = (date: Date) =>
  date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const renderMarkdown = (text: string) =>
  escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />');

const tokenize = (text: string) =>
  normalizeText(text)
    .split(' ')
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));

const statusText = (status?: string) => {
  if (status === 'available') return 'đang sẵn sàng';
  if (status === 'maintenance') return 'đang bảo trì';
  if (status === 'unavailable') return 'đang tạm ngưng';
  return 'chưa rõ trạng thái';
};

const borrowStatusText = (status?: string) => {
  const map: Record<string, string> = {
    pending: 'đang chờ duyệt',
    approved: 'đã được duyệt',
    borrowed: 'đang mượn',
    rejected: 'bị từ chối',
    returned: 'đã trả',
    overdue: 'quá hạn',
  };
  return status ? map[status] || status : 'chưa rõ';
};

const scoreEquipment = (query: string, item: EquipmentLite) => {
  const tokens = tokenize(query);
  const haystack = normalizeText([item.name, item.category, item.description].filter(Boolean).join(' '));
  if (!tokens.length || !haystack) return 0;
  let score = 0;
  tokens.forEach((token) => {
    if (haystack.includes(token)) score += item.name && normalizeText(item.name).includes(token) ? 3 : 1;
  });
  return score;
};

const findBestEquipment = (query: string, equipments: EquipmentLite[]) =>
  equipments
    .map((item) => ({ item, score: scoreEquipment(query, item) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)[0]?.item;

const findEquipmentsByPurpose = (query: string, equipments: EquipmentLite[]) => {
  const normalized = normalizeText(query);
  const purpose = PURPOSE_KEYWORDS.find((item) => item.words.some((word) => normalized.includes(word)));
  if (!purpose) return [];

  const picks: EquipmentLite[] = [];
  purpose.needs.forEach((need) => {
    const match = equipments.find((item) => {
      const haystack = normalizeText([item.name, item.category, item.description].filter(Boolean).join(' '));
      return haystack.includes(need) && (item.available_quantity || 0) > 0 && item.status === 'available';
    });
    if (match && !picks.some((item) => item.id === match.id)) picks.push(match);
  });
  return picks;
};

const formatEquipmentLine = (item: EquipmentLite) =>
  `- ${item.name}: còn ${item.available_quantity ?? 0}/${item.total_quantity ?? 0}, ${statusText(item.status)}`;

const ChatBot: React.FC<ChatBotProps> = ({ apiUrl }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'bot',
      content:
        'Xin chào! Tôi là **BorrowBot**. Bạn có thể hỏi tên thiết bị, tình trạng còn hàng, cách mượn/trả, điểm uy tín, combo phù hợp cho sự kiện hoặc trạng thái yêu cầu của bạn.',
      time: formatTime(new Date()),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const [equipments, setEquipments] = useState<EquipmentLite[]>([]);
  const [combos, setCombos] = useState<ComboLite[]>([]);
  const [borrowHistory, setBorrowHistory] = useState<BorrowLite[]>([]);
  const [trust, setTrust] = useState<TrustLite | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const catalogLoaded = equipments.length > 0 || combos.length > 0;

  const refreshContext = async (): Promise<BotContext> => {
    const nextContext: BotContext = {
      equipments,
      combos,
      borrowHistory,
      trust,
    };

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [equipmentRes, comboRes, trustRes, borrowRes] = await Promise.all([
        fetch(`${apiUrl}/equipments`, { headers }),
        fetch(`${apiUrl}/combos`, { headers }),
        fetch(`${apiUrl}/trust/me`, { headers }),
        fetch(`${apiUrl}/borrow-requests/me`, { headers }),
      ]);

      if (equipmentRes.ok) {
        const json = await equipmentRes.json();
        nextContext.equipments = Array.isArray(json?.data) ? json.data : [];
        setEquipments(nextContext.equipments);
      }
      if (comboRes.ok) {
        const json = await comboRes.json();
        nextContext.combos = Array.isArray(json?.data) ? json.data : [];
        setCombos(nextContext.combos);
      }
      if (trustRes.ok) {
        const json = await trustRes.json();
        nextContext.trust = json?.data || null;
        setTrust(nextContext.trust);
      }
      if (borrowRes.ok) {
        const json = await borrowRes.json();
        nextContext.borrowHistory = Array.isArray(json?.data) ? json.data : [];
        setBorrowHistory(nextContext.borrowHistory);
      }
    } catch {
      // The bot can still answer process/rule questions when live data is unavailable.
    }

    return nextContext;
  };

  useEffect(() => {
    refreshContext();
  }, [apiUrl]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (!open && messages.length > 1) setUnread((prev) => prev + 1);
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      refreshContext();
    }
  }, [open]);

  const buildAnswer = (rawInput: string, context?: BotContext) => {
    const activeEquipments = context?.equipments || equipments;
    const activeCombos = context?.combos || combos;
    const activeBorrowHistory = context?.borrowHistory || borrowHistory;
    const activeTrust = context?.trust !== undefined ? context.trust : trust;
    const text = normalizeText(rawInput);
    const bestEquipment = findBestEquipment(rawInput, activeEquipments);
    const purposePicks = findEquipmentsByPurpose(rawInput, activeEquipments);

    if (/^(hi|hello|chao|xin chao|alo)/.test(text)) {
      return 'Chào bạn! Bạn cứ hỏi tự nhiên, ví dụ: “Camera Sony còn không?”, “Tôi cần quay video thì mượn gì?”, hoặc “Yêu cầu của tôi đang ở trạng thái nào?”.';
    }

    if (/cam on|thanks|thank/.test(text)) {
      return 'Rất vui được hỗ trợ bạn. Khi cần mượn thiết bị, bạn nên ghi rõ mục đích và ngày trả dự kiến để admin duyệt nhanh hơn.';
    }

    if (bestEquipment && /con|het|tinh trang|trang thai|muon|co san|bao tri|o dau|vi tri|han/.test(text)) {
      const available = bestEquipment.available_quantity ?? 0;
      const total = bestEquipment.total_quantity ?? 0;
      const canBorrow = available > 0 && bestEquipment.status === 'available';
      const location = bestEquipment.storage_location ? `\nVị trí lưu kho: **${bestEquipment.storage_location}**.` : '';
      const maxDays = bestEquipment.max_borrow_days ? `\nHạn mượn tối đa: **${bestEquipment.max_borrow_days} ngày**.` : '';
      const condition = bestEquipment.condition_status ? `\nTình trạng vật lý: **${bestEquipment.condition_status}**.` : '';
      return `Tôi tìm thấy **${bestEquipment.name}**.\nHiện thiết bị ${statusText(bestEquipment.status)}, còn **${available}/${total}** chiếc.${location}${maxDays}${condition}\n\n${canBorrow ? 'Bạn có thể bấm **Mượn** trên thẻ thiết bị, chọn số lượng, ngày mượn/ngày trả rồi ký xác nhận.' : 'Thiết bị này chưa mượn được ngay. Nếu hết hàng, bạn có thể bấm **Đặt trước** để nhận thông báo khi có người trả.'}`;
    }

    if (purposePicks.length) {
      return `Với nhu cầu này, tôi gợi ý bạn mượn các món đang còn hàng sau:\n${purposePicks.map(formatEquipmentLine).join('\n')}\n\nNếu muốn gọn hơn, hãy mở tab **Combo Thiết Bị** và chọn combo còn trạng thái **Sẵn sàng**.`;
    }

    if (/combo|goi y|suggest|recommend|bo thiet bi|tron bo/.test(text)) {
      const availableCombos = activeCombos.filter((combo) => combo.available !== false).slice(0, 4);
      if (availableCombos.length) {
        return `Các combo có thể mượn hiện tại:\n${availableCombos.map((combo) => {
          const items = (combo.items || []).slice(0, 3).map((item) => item.equipment_name).filter(Boolean).join(', ');
          return `- **${combo.name}**${combo.description ? `: ${combo.description}` : ''}${items ? ` (${items})` : ''}`;
        }).join('\n')}\n\nBạn có thể nói rõ mục đích như “quay livestream”, “hội thảo”, “chụp ảnh sản phẩm” để tôi lọc sát hơn.`;
      }
      return 'Hiện tôi chưa thấy combo khả dụng trong dữ liệu. Bạn vẫn có thể mượn lẻ theo danh sách thiết bị còn hàng.';
    }

    if (/co gi|thiet bi nao|danh sach|con hang|muon gi|available/.test(text)) {
      const availableItems = activeEquipments
        .filter((item) => (item.available_quantity || 0) > 0 && item.status === 'available')
        .slice(0, 8);
      if (!availableItems.length) return 'Tôi chưa thấy thiết bị nào còn hàng trong dữ liệu hiện tại. Bạn có thể thử tải lại trang hoặc liên hệ admin để kiểm tra kho.';
      return `Một số thiết bị đang mượn được:\n${availableItems.map(formatEquipmentLine).join('\n')}\n\nBạn có thể hỏi trực tiếp tên món để tôi trả lời chi tiết hơn.`;
    }

    if (/het hang|dat truoc|queue|xep hang|cho hang/.test(text)) {
      return 'Nếu thiết bị hết hàng, bạn bấm **Đặt trước** trên thẻ thiết bị. Khi thiết bị được trả lại, hệ thống sẽ gửi thông báo để bạn tạo yêu cầu mượn. Nếu bạn cần gấp, hãy hỏi tôi thiết bị cùng nhóm để chọn phương án thay thế.';
    }

    if (/cach muon|dang ky|gui yeu cau|quy trinh|thu tuc/.test(text)) {
      return 'Quy trình mượn: vào **Danh Sách Thiết Bị**, chọn món còn hàng, bấm **Mượn**, nhập số lượng/ngày mượn/ngày trả, ghi chú mục đích sử dụng, ký xác nhận và gửi yêu cầu. Sau đó bạn theo dõi trạng thái ở **Lịch Sử Mượn**.';
    }

    if (/tra|hoan tra|return|qua han|tre han|phat/.test(text)) {
      return 'Khi trả thiết bị, hãy trả đúng ngày dự kiến và báo admin kiểm tra tình trạng. Trả đúng hạn giúp tăng điểm uy tín; trả trễ hoặc làm hỏng thiết bị có thể bị trừ điểm và phát sinh xử lý theo quy định của hệ thống.';
    }

    if (/diem|uy tin|trust|rank|hang|gold|silver|bronze/.test(text)) {
      const score = activeTrust?.trust_score ?? 100;
      const rank = activeTrust?.trust_rank || (score >= 80 ? 'gold' : score >= 50 ? 'silver' : 'bronze');
      return `Điểm uy tín hiện tại của bạn: **${score} điểm**, hạng **${rank}**.\n\nThông thường trả đúng hạn được cộng điểm, trả trễ hoặc làm hỏng thiết bị bị trừ điểm. Điểm cao giúp yêu cầu mượn dễ được ưu tiên duyệt hơn.`;
    }

    if (/yeu cau cua toi|lich su|trang thai don|phieu muon|da duyet|cho duyet/.test(text)) {
      const latest = activeBorrowHistory[0];
      if (!latest) return 'Tôi chưa thấy yêu cầu mượn nào của bạn trong dữ liệu hiện tại. Sau khi gửi yêu cầu, bạn có thể xem ở tab **Lịch Sử Mượn**.';
      return `Yêu cầu gần nhất của bạn là **#${latest.id}**, trạng thái **${borrowStatusText(latest.status)}**.${latest.borrow_date ? `\nNgày mượn: ${latest.borrow_date}.` : ''}${latest.expected_return_date ? `\nNgày trả dự kiến: ${latest.expected_return_date}.` : ''}\n\nBạn có thể mở tab **Lịch Sử Mượn** để xem đầy đủ và xuất PDF nếu cần.`;
    }

    if (/qr|ma qr|quet|scan/.test(text)) {
      return 'QR trên mỗi thiết bị dùng để nhận diện nhanh thiết bị, xem thông tin và hỗ trợ quy trình mượn/trả. Trên thẻ thiết bị, bạn bấm biểu tượng QR để mở mã.';
    }

    if (/bao loi|hong|su co|ticket|loi thiet bi/.test(text)) {
      return 'Nếu thiết bị lỗi hoặc hỏng, vào tab **Báo Lỗi Thiết Bị**, chọn thiết bị, mô tả lỗi, chọn mức ưu tiên rồi gửi ticket. Mô tả càng cụ thể thì admin xử lý càng nhanh.';
    }

    if (!catalogLoaded) {
      return 'Tôi chưa tải được dữ liệu kho ở thời điểm này, nhưng bạn vẫn có thể hỏi về quy trình mượn/trả, điểm uy tín, QR hoặc báo lỗi. Hãy thử mở lại chatbot sau vài giây để tôi cập nhật dữ liệu.';
    }

    return 'Tôi chưa chắc ý bạn đang hỏi về món nào. Bạn có thể viết cụ thể hơn như “Micro không dây còn không?”, “Tôi cần thuyết trình thì mượn gì?”, hoặc “Yêu cầu của tôi đã duyệt chưa?”.';
  };

  const sendMessage = async (text?: string) => {
    const value = (text || input).trim();
    if (!value || typing) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: 'user', content: value, time: formatTime(new Date()) },
    ]);
    setInput('');
    setTyping(true);

    const freshContext = await refreshContext();
    await new Promise((resolve) => setTimeout(resolve, 350));

    setMessages((prev) => [
      ...prev,
      { id: Date.now() + 1, role: 'bot', content: buildAnswer(value, freshContext), time: formatTime(new Date()) },
    ]);
    setTyping(false);
  };

  const quickReplies = useMemo(() => QUICK_REPLIES, []);

  return (
    <>
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
            borderRadius: 20,
            boxShadow: '0 30px 70px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            backdropFilter: 'blur(20px)',
          }}
        >
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
                }}
              >
                AI
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>BorrowBot</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                  Trả lời theo dữ liệu kho hiện tại
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
              }}
            >
              x
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: 10,
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
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#fff',
                      flexShrink: 0,
                      alignSelf: 'flex-end',
                    }}
                  >
                    AI
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
                    border: msg.role === 'bot' ? '1px solid var(--border-color)' : 'none',
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  <div
                    style={{
                      fontSize: 10,
                      color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)',
                      marginTop: 6,
                      textAlign: msg.role === 'user' ? 'right' : 'left',
                    }}
                  >
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}

            {typing && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #c39b59, #8b6b31)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  AI
                </div>
                Đang kiểm tra dữ liệu...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 2 && (
            <div style={{ padding: '6px 16px', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
              {quickReplies.map((reply) => (
                <button
                  key={reply.label}
                  onClick={() => sendMessage(reply.message)}
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
                  }}
                >
                  {reply.label}
                </button>
              ))}
            </div>
          )}

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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Hỏi về thiết bị, combo, điểm uy tín..."
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1.5px solid var(--border-color)',
                borderRadius: 14,
                fontSize: 13,
                outline: 'none',
                background: 'var(--muted-light)',
                color: 'var(--text)',
              }}
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
                cursor: input.trim() && !typing ? 'pointer' : 'not-allowed',
                color: '#fff',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              Gửi
            </button>
          </div>
        </div>
      )}

      <button
        className="chatbot-fab"
        onClick={() => setOpen((value) => !value)}
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
          fontSize: 14,
          color: '#fff',
          fontWeight: 800,
          boxShadow: '0 10px 30px rgba(7,15,28,0.35)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        id="chatbot-fab-btn"
      >
        {open ? 'x' : 'AI'}
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
