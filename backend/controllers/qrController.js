const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');
const QRCode = require('qrcode');

const generateQR = async (req, res) => {
  try {
    const equipmentId = Number(req.params.id);
    if (!equipmentId) return fail(res, 'ID thiết bị không hợp lệ', 'VALIDATION_ERROR', 400);

    const [rows] = await sequelize.query(
      'SELECT id, name, status, available_quantity FROM equipments WHERE id = ? LIMIT 1',
      { replacements: [equipmentId] }
    );
    if (!rows.length) return fail(res, 'Không tìm thấy thiết bị', 'NOT_FOUND', 404);

    const equipment = rows[0];
    const qrPayload = JSON.stringify({ type: 'equipment', id: equipment.id, name: equipment.name });
    const qrBase64 = await QRCode.toDataURL(qrPayload);

    // Save qr_data to equipment
    await sequelize.query(
      'UPDATE equipments SET qr_data = ? WHERE id = ?',
      { replacements: [qrPayload, equipmentId] }
    );

    return ok(res, {
      qr_base64: qrBase64,
      equipment_id: equipment.id,
      equipment_name: equipment.name,
    }, 'QR code generated');
  } catch (e) {
    return fail(res, 'Lỗi server khi tạo QR', 'INTERNAL_ERROR', 500);
  }
};

const scanQR = async (req, res) => {
  try {
    const { qr_data: qrData } = req.body || {};
    if (!qrData) return fail(res, 'Thiếu qr_data', 'VALIDATION_ERROR', 400);

    let parsed;
    try {
      parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch {
      return fail(res, 'qr_data không hợp lệ', 'VALIDATION_ERROR', 400);
    }

    if (parsed.type !== 'equipment' || !parsed.id) {
      return fail(res, 'QR không phải của thiết bị', 'VALIDATION_ERROR', 400);
    }

    const [rows] = await sequelize.query(
      'SELECT id, name, status, available_quantity FROM equipments WHERE id = ? LIMIT 1',
      { replacements: [parsed.id] }
    );
    if (!rows.length) return fail(res, 'Không tìm thấy thiết bị', 'NOT_FOUND', 404);

    const equipment = rows[0];
    let action = 'unavailable';
    if (equipment.status === 'available' && equipment.available_quantity > 0) {
      action = 'borrow';
    } else if (equipment.status === 'available') {
      action = 'return';
    }

    return ok(res, {
      equipment_id: equipment.id,
      name: equipment.name,
      status: equipment.status,
      available_quantity: equipment.available_quantity,
      action,
    }, 'QR scanned');
  } catch (e) {
    return fail(res, 'Lỗi server khi scan QR', 'INTERNAL_ERROR', 500);
  }
};

module.exports = { generateQR, scanQR };
