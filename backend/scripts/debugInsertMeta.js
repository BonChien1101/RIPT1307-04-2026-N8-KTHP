/* eslint-disable no-console */

const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

(async () => {
  try {
    console.log('dialect =', sequelize.getDialect());
    const out = await sequelize.query('SELECT 1 as ok', { type: QueryTypes.SELECT });
    console.log('SELECT meta =', out);

    const rq = await sequelize.query(
      `INSERT INTO borrow_requests (user_id, borrow_date, expected_return_date, status, note, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', ?, NOW(), NOW())`,
      {
        replacements: [1, '2026-01-01', '2026-01-02', null],
        type: QueryTypes.INSERT,
      }
    );

    console.log('INSERT rq =', rq);
    console.log('typeof rq =', typeof rq);
    console.log('rq.insertId =', rq?.insertId);
    console.log('rq[0]?.insertId =', rq?.[0]?.insertId);
    console.log('rq[0] =', rq?.[0]);

    await sequelize.close();
  } catch (e) {
    console.error('debugInsertMeta error =', e);
    console.error('debugInsertMeta error.message =', e?.message);
    console.error('debugInsertMeta error.stack =', e?.stack);
    console.error('debugInsertMeta error.original =', e?.original);
    try {
      await sequelize.close();
    } catch {}
    process.exit(1);
  }
})();
