const sequelize = require('../config/database');
const { sendEmail, templates } = require('../services/emailService');

/**
 * Notify next user in queue by email (in addition to socket notify).
 * - Picks the first waiting queue row for equipment
 * - Sends email to that user
 * - Marks notified_at to avoid spamming
 */
const notifyNextInQueueByEmail = async (equipmentId) => {
  const eqId = Number(equipmentId);
  if (!eqId) return;

  const [rows] = await sequelize.query(
    `SELECT bq.id, bq.user_id, bq.notified_at,
            u.email, u.full_name,
            e.name AS equipment_name
     FROM borrow_queue bq
     JOIN users u ON u.id = bq.user_id
     JOIN equipments e ON e.id = bq.equipment_id
     WHERE bq.equipment_id = ? AND bq.status = 'waiting'
     ORDER BY bq.created_at ASC
     LIMIT 1`,
    { replacements: [eqId] }
  );
  const next = rows?.[0];
  if (!next) return;
  if (!next.email) return;
  if (next.notified_at) return; // already notified

  const tpl = templates.queueAvailable({ fullName: next.full_name, equipmentName: next.equipment_name });
  await sendEmail({
    to: next.email,
    subject: tpl.subject,
    html: tpl.html,
    meta: { kind: 'queue_available', equipment_id: eqId, queue_id: next.id, user_id: next.user_id },
  });

  await sequelize.query('UPDATE borrow_queue SET notified_at = CURRENT_TIMESTAMP WHERE id = ?', {
    replacements: [next.id],
  });
};

module.exports = {
  notifyNextInQueueByEmail,
};
