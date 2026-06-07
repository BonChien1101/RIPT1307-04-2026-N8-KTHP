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


const autoUpgradeDatabase = async () => {
  try {
   
    let columnExists = false;

    if (dialect === 'mysql') {
      const [rows] = await sequelize.query(`
        SELECT COUNT(*) AS count FROM information_schema.columns 
        WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'reset_password_otp'
      `);
      columnExists = rows[0]?.count > 0;
    } else {
     
      const [rows] = await sequelize.query(`PRAGMA table_info(users)`);
      columnExists = rows.some(col => col.name === 'reset_password_otp');
    }

    if (!columnExists) {
      console.log('🔄 Đang tự động thêm các cột phục vụ Quên mật khẩu vào bảng users...');
      
      if (dialect === 'mysql') {
        await sequelize.query("ALTER TABLE users ADD COLUMN reset_password_otp VARCHAR(10) DEFAULT NULL AFTER role");
        await sequelize.query("ALTER TABLE users ADD COLUMN reset_password_expires TIMESTAMP NULL DEFAULT NULL AFTER reset_password_otp");
      } else {
       
        await sequelize.query("ALTER TABLE users ADD COLUMN reset_password_otp TEXT DEFAULT NULL");
        await sequelize.query("ALTER TABLE users ADD COLUMN reset_password_expires TEXT DEFAULT NULL");
      }
      
      console.log('💥 Cập nhật cấu trúc bảng users thành công!');
    } else {
      console.log('✅ Bảng users đã có sẵn cấu trúc Quên mật khẩu, bỏ qua nâng cấp.');
    }
  } catch (error) {
    console.error('❌ Lỗi khi tự động nâng cấp cấu trúc Database:', error);
  }
};

sequelize.authenticate()
  .then(() => {
    console.log('📬 Kết nối CSDL thành công. Đang kiểm tra cấu trúc bảng...');
    return autoUpgradeDatabase();
  })
  .catch(err => {
    console.error('❌ Lỗi kết nối CSDL khi khởi tạo:', err);
  });


module.exports = sequelize;