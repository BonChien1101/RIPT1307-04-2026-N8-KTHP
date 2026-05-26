const path = require('path');
const { Sequelize } = require('sequelize');

const parseBoolean = (v) => {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
};

const dbSsl = parseBoolean(process.env.DB_SSL);
const dbCaCert = process.env.DB_CA_CERT;
const dbRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED
  ? parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED)
  : false;

const dialect = String(process.env.DB_DIALECT || 'sqlite').trim().toLowerCase();

let sequelize;

if (dialect === 'mysql') {
  sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    ...(dbSsl
      ? {
          dialectOptions: {
            ssl: {
              ...(dbCaCert ? { ca: dbCaCert.replace(/\n/g, '\n') } : {}),
              rejectUnauthorized: dbRejectUnauthorized,
            },
          },
        }
      : {}),
  });
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || path.resolve(__dirname, '../borrowx.sqlite'),
    logging: false,
  });
}

module.exports = sequelize;