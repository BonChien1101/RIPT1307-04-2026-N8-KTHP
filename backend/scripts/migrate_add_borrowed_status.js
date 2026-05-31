/* eslint-disable no-console */
require('dotenv').config();

const sequelize = require('../config/database');

const hasBorrowed = async () => {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_TYPE as columnType
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'borrow_requests'
       AND COLUMN_NAME = 'status'
     LIMIT 1`
  );
  const columnType = rows?.[0]?.columnType;
  if (!columnType) throw new Error('Cannot read borrow_requests.status COLUMN_TYPE');
  return String(columnType).includes("'borrowed'");
};

const run = async () => {
  await sequelize.authenticate();
  const [[dbRow]] = await sequelize.query('SELECT DATABASE() as db');
  console.log('DB:', dbRow.db);

  const already = await hasBorrowed();
  if (already) {
    console.log("OK: status already contains 'borrowed'");
    return;
  }

  console.log("Migrating: add 'borrowed' to borrow_requests.status ENUM...");
  await sequelize.query(
    `ALTER TABLE borrow_requests
     MODIFY status ENUM('pending','approved','borrowed','rejected','returned','overdue','lost','damaged')
     NOT NULL DEFAULT 'pending'`
  );

  console.log('DONE');
};

run()
  .then(() => sequelize.close())
  .catch(async (e) => {
    console.error('Migration failed:', e);
    try {
      await sequelize.close();
    } catch {}
    process.exit(1);
  });
