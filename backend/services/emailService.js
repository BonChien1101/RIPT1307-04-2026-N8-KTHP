const axios = require('axios');

const envBool = (v) => String(v || '').toLowerCase() === 'true';

const isEmailEnabled = () => {
    // Kích hoạt khi có API Key của Resend
    if (envBool(process.env.EMAIL_ENABLED)) return true;
    if (process.env.RESEND_API_KEY) return true;
    return false;
};

const getFrom = () => {
    // Resend mặc định cho một domain chạy thử là onboarding@resend.dev
   	return 'BorrowX <onboarding@resend.dev>';
};

const sendEmail = async ({ to, subject, html, text, meta }) => {
    if (!to) throw new Error('EMAIL_TO_REQUIRED');
    if (!subject) throw new Error('EMAIL_SUBJECT_REQUIRED');

    if (!isEmailEnabled()) {
        console.log('[emailService.disabled] skip sending email', { to, subject, meta });
        return { skipped: true };
    }


    try {
        // Gửi qua HTTP POST API - Bỏ qua hoàn toàn tầng SMTP bị chặn của Render
        const response = await axios.post('https://api.resend.com/emails', {
            from: getFrom(),
            to: [to], // Resend yêu cầu mảng chứa danh sách email nhận
            subject: subject,
            html: html,
            text: text,
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 15000 // Tự động hủy sau 15 giây nếu có sự cố mạng
        });

        console.log('✅ GỬI MAIL QUA RESEND THÀNH CÔNG:', response.data);

        return { messageId: response.data.id, previewUrl: null };
    } catch (error) {
        console.error('🔥 LỖI GỬI MAIL QUA API:', error.response ? error.response.data : error.message);
        throw error;
    }
};

const wrapHtml = (title, bodyHtml) => {
    return `
  <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
    <h2 style="margin:0 0 12px;">${title}</h2>
    <div>${bodyHtml}</div>
    <hr style="margin:16px 0;" />
    <div style="font-size: 12px; color:#666;">Email tự động từ hệ thống quản lý thiết bị.</div>
  </div>
  `;
};

const templates = {
    queueAvailable: ({ fullName, equipmentName }) => {
        const title = 'Thiết bị đã có sẵn để mượn';
        const body = `
      <p>Chào <b>${fullName || 'bạn'}</b>,</p>
      <p>Thiết bị <b>${equipmentName}</b> vừa được hoàn trả và hiện đã có sẵn.</p>
      <p>Bạn có thể đăng nhập để tạo yêu cầu mượn ngay.</p>
    `;
        return { subject: `[Thông báo] ${equipmentName} đã có sẵn`, html: wrapHtml(title, body) };
    },
    nearDue: ({ fullName, equipmentName, expectedReturnDate, requestId }) => {
        const title = 'Nhắc nhở sắp đến hạn trả thiết bị';
        const body = `
      <p>Chào <b>${fullName || 'bạn'}</b>,</p>
      <p>Bạn đang mượn thiết bị <b>${equipmentName}</b> (mã phiếu <b>#${requestId}</b>).</p>
      <p>Hạn trả dự kiến: <b>${expectedReturnDate}</b>.</p>
      <p>Vui lòng sắp xếp trả đúng hạn để tránh bị tính điểm trễ hạn.</p>
    `;
        return { subject: `[Nhắc hạn] Sắp đến hạn trả ${equipmentName}`, html: wrapHtml(title, body) };
    },
    overdue: ({ fullName, equipmentName, expectedReturnDate, requestId, daysLate }) => {
        const title = 'Cảnh báo quá hạn trả thiết bị';
        const body = `
      <p>Chào <b>${fullName || 'bạn'}</b>,</p>
      <p>Bạn đang quá hạn trả thiết bị <b>${equipmentName}</b> (mã phiếu <b>#${requestId}</b>).</p>
      <p>Hạn trả dự kiến: <b>${expectedReturnDate}</b>.</p>
      <p>Số ngày quá hạn: <b>${daysLate}</b> ngày.</p>
      <p>Vui lòng hoàn trả sớm nhất có thể. Nếu có vấn đề, hãy liên hệ quản trị viên.</p>
    `;
        return { subject: `[Quá hạn] Vui lòng trả ${equipmentName}`, html: wrapHtml(title, body) };
    },
    adminWarning: ({ fullName, equipmentName, requestId, content }) => {
        const title = 'Thông báo từ quản trị viên';
        const body = `
      <p>Chào <b>${fullName || 'bạn'}</b>,</p>
      <p>Liên quan đến thiết bị <b>${equipmentName}</b> (mã phiếu <b>#${requestId}</b>):</p>
      <blockquote style="padding:10px 12px; border-left: 4px solid #999; margin: 12px 0; background:#fafafa;">${String(
            content || ''
        ).replace(/\n/g, '<br/>')}</blockquote>
      <p>Vui lòng phản hồi hoặc thực hiện theo hướng dẫn.</p>
    `;
        return { subject: `[Cảnh báo] ${equipmentName} (#${requestId})`, html: wrapHtml(title, body) };
    },
};

module.exports = {
    isEmailEnabled,
    sendEmail,
    templates,
};