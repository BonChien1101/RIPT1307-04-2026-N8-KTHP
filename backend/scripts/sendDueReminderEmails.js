/**
 * Send reminder emails for borrow requests:
 * - Near due: expected_return_date is in N days and status='borrowed'
 * - Overdue: expected_return_date < today and status='borrowed'
 *
 * Intended to be triggered by a scheduler (cron/Render cron).
 */
require('dotenv').config();

const sequelize = require('../config/database');
const { sendEmail, templates } = require('../services/emailService');

const parseIntSafe = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const dialect = () => sequelize.getDialect();

const sqlToday = () => (dialect() === 'mysql' ? 'CURDATE()' : "DATE('now')");
const sqlDateAddDays = (dateExpr, days) => {
  if (dialect() === 'mysql') return `DATE_ADD(${dateExpr}, INTERVAL ${days} DAY)`;
  // sqlite
  return `DATE(${dateExpr}, '${days} day')`;
};

const run = async () => {
  const daysBefore = parseIntSafe(process.env.DUE_SOON_DAYS, 2);

  // Near due
  const [nearRows] = await sequelize.query(
    `SELECT br.id as request_id, br.expected_return_date,
            u.email, u.full_name,
            e.name as equipment_name
     FROM borrow_requests br
     JOIN users u ON u.id = br.user_id
     JOIN borrow_items bi ON bi.request_id = br.id
     JOIN equipments e ON e.id = bi.equipment_id
     WHERE br.status = 'borrowed'
       AND br.expected_return_date IS NOT NULL
       AND br.expected_return_date = ${sqlDateAddDays(sqlToday(), daysBefore)}`
  );

  for (const row of nearRows || []) {
    if (!row.email) continue;
    const tpl = templates.nearDue({
      fullName: row.full_name,
      equipmentName: row.equipment_name,
      expectedReturnDate: row.expected_return_date,
      requestId: row.request_id,
    });
    await sendEmail({
      to: row.email,
      subject: tpl.subject,
      html: tpl.html,
      meta: { kind: 'near_due', request_id: row.request_id },
    });
  }

  // Overdue
  const [overdueRows] = await sequelize.query(
    `SELECT br.id as request_id, br.expected_return_date,
            u.email, u.full_name,
            e.name as equipment_name,
            (JULIANDAY(${sqlToday()}) - JULIANDAY(br.expected_return_date)) as days_late_sqlite
     FROM borrow_requests br
     JOIN users u ON u.id = br.user_id
     JOIN borrow_items bi ON bi.request_id = br.id
     JOIN equipments e ON e.id = bi.equipment_id
     WHERE br.status = 'borrowed'
       AND br.expected_return_date IS NOT NULL
       AND br.expected_return_date < ${sqlToday()}`
  );

  for (const row of overdueRows || []) {
    if (!row.email) continue;

    let daysLate = 1;
    if (dialect() === 'mysql') {
      // MySQL: compute days late with DATEDIFF
      const [dd] = await sequelize.query(
        `SELECT DATEDIFF(${sqlToday()}, ?) as daysLate`,
        { replacements: [row.expected_return_date] }
      );
      daysLate = dd?.[0]?.daysLate || 1;
    } else {
      daysLate = Math.max(1, Math.floor(Number(row.days_late_sqlite || 1)));
    }

    const tpl = templates.overdue({
      fullName: row.full_name,
      equipmentName: row.equipment_name,
      expectedReturnDate: row.expected_return_date,
      requestId: row.request_id,
      daysLate,
    });
    await sendEmail({
      to: row.email,
      subject: tpl.subject,
      html: tpl.html,
      meta: { kind: 'overdue', request_id: row.request_id, daysLate },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Reminder email job done', {
    nearDue: nearRows?.length || 0,
    overdue: overdueRows?.length || 0,
    dialect: dialect(),
  });
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Reminder email job failed:', err);
    process.exit(1);
  });
