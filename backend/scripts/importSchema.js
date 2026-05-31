/* eslint-disable no-console */
require('dotenv').config();

const sequelize = require('../config/database');
require('../models');

const run = async () => {
  await sequelize.authenticate();
  const dialect = sequelize.getDialect();
  console.log('Import schema bằng Sequelize sync cho dialect:', dialect);

  await sequelize.sync({ alter: false });

  const [tables] = dialect === 'sqlite'
    ? await sequelize.query("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    : await sequelize.query('SHOW TABLES');

  console.log('Đồng bộ schema hoàn tất.');
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
