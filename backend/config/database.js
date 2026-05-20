const { Sequelize } = require("sequelize");

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

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",
    ...(dbSsl
      ? {
          dialectOptions: {
            ssl: {
              // Aiven thường yêu cầu SSL. Nếu không truyền CA cert thì vẫn bật SSL ở mức cơ bản.
              ...(dbCaCert ? { ca: dbCaCert.replace(/\\n/g, '\n') } : {}),
              // Một số môi trường Node báo "self signed certificate in certificate chain" dù đã có CA.
              // Mặc định để false cho dev; có thể bật lại bằng DB_SSL_REJECT_UNAUTHORIZED=true.
              rejectUnauthorized: dbRejectUnauthorized,
            },
          },
        }
      : {}),
  }
);

module.exports = sequelize;