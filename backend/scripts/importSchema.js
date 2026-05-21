/* eslint-disable no-console */
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const sequelize = require('../config/database');

const splitSqlStatements = (sql) => {
  // Very small splitter for our schema file:
  // - removes /* ... */ blocks
  // - splits by ';' at end of line
  // - keeps CHECK constraints and other parentheses intact
  const withoutBlockComments = sql.replace(/\/\*[\s\S]*?\*\//g, '');

  const lines = withoutBlockComments
    .split(/\r?\n/)
    .map((l) => l.replace(/--.*$/g, '').trim())
    .filter(Boolean);

  const joined = lines.join('\n');

  const parts = joined
    .split(/;\s*(?:\n|$)/g)
    .map((p) => p.trim())
    .filter(Boolean);

  return parts;
};

const run = async () => {
  const schemaPath = process.env.SCHEMA_FILE
    ? path.resolve(process.cwd(), process.env.SCHEMA_FILE)
  : path.resolve(__dirname, '..', 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Không tìm thấy schema file: ${schemaPath}`);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');
  const stmts = splitSqlStatements(sql);

  console.log('Import schema file:', schemaPath);
  console.log('Tổng số statements:', stmts.length);

  await sequelize.authenticate();
  const [[dbRow]] = await sequelize.query('SELECT DATABASE() as db');
  console.log('Đang import vào DB:', dbRow.db);

  for (let i = 0; i < stmts.length; i += 1) {
    const s = stmts[i];
    try {
      // eslint-disable-next-line no-await-in-loop
      await sequelize.query(s);
      console.log(`OK ${i + 1}/${stmts.length}`);
    } catch (e) {
      const err = e?.original || e;
      // Cho phép chạy lại schema nhiều lần:
      // - CREATE TABLE IF NOT EXISTS đã idempotent
      // - CREATE INDEX sẽ fail nếu index đã tồn tại => bỏ qua
      if (err?.code === 'ER_DUP_KEYNAME') {
        console.log(`SKIP ${i + 1}/${stmts.length} (index exists)`);
        continue;
      }
      console.error(`FAIL statement ${i + 1}/${stmts.length}`);
      console.error('--- SQL ---');
      console.error(s);
      console.error('--- ERROR ---');
      console.error(err);
      throw e;
    }
  }

  console.log('Import schema hoàn tất.');

  const [tables] = await sequelize.query('SHOW TABLES');
  console.log('Tables:', tables);
};

run()
  .then(() => sequelize.close())
  .catch(async (e) => {
    console.error('Import schema thất bại:', e);
    try {
      await sequelize.close();
    } catch {
      // ignore
    }
    process.exit(1);
  });
