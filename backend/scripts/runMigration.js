/* eslint-disable no-console */
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const sequelize = require('../config/database');

const run = async () => {
  const migrationPath = process.env.MIGRATION_FILE
    ? path.resolve(process.cwd(), process.env.MIGRATION_FILE)
    : path.resolve(__dirname, '..', 'migrations', '20260526_migrate_equipment_category.sql');

  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Không tìm thấy migration file: ${migrationPath}`);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  const statements = sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/;\s*(?:\n|$)/g)
    .map((s) => s.trim())
    .filter(Boolean);

  console.log('Migration file:', migrationPath);
  console.log('Tổng số statements:', statements.length);

  await sequelize.authenticate();

  for (let i = 0; i < statements.length; i += 1) {
    const statement = statements[i];
    try {
      // eslint-disable-next-line no-await-in-loop
      await sequelize.query(statement);
      console.log(`OK ${i + 1}/${statements.length}`);
    } catch (error) {
      const err = error?.original || error;
      if (err?.code === 'ER_DUP_FIELDNAME' || err?.code === 'ER_DUP_KEYNAME') {
        console.log(`SKIP ${i + 1}/${statements.length} (${err.code})`);
        continue;
      }
      console.error(`FAIL statement ${i + 1}/${statements.length}`);
      console.error(statement);
      console.error(err);
      throw error;
    }
  }

  console.log('Migration hoàn tất.');
};

run()
  .then(() => sequelize.close())
  .catch(async (error) => {
    console.error('Migration thất bại:', error);
    try {
      await sequelize.close();
    } catch {
      // ignore
    }
    process.exit(1);
  });
