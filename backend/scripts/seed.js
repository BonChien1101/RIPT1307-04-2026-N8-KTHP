/* eslint-disable no-console */
require('dotenv').config();

const sequelize = require('../config/database');

const run = async () => {
  await sequelize.authenticate();

  const [[dbRow]] = await sequelize.query('SELECT DATABASE() as db');
  console.log('Đang seed dữ liệu cho DB:', dbRow.db);

  // Seed lại từ đầu
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  await sequelize.query('TRUNCATE TABLE borrow_items');
  await sequelize.query('TRUNCATE TABLE borrow_requests');
  await sequelize.query('TRUNCATE TABLE notifications');
  await sequelize.query('TRUNCATE TABLE equipments');
  await sequelize.query('TRUNCATE TABLE users');
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

  // USERS 
  const [userInsert] = await sequelize.query(
    `INSERT INTO users (full_name, student_code, email, password, role)
     VALUES
      ('Admin', 'AD000', 'admin@example.com', '123456', 'admin'),
      ('Nguyen Van A', 'B20DCCN001', 'a@example.com', '123456', 'student'),
      ('Tran Thi B', 'B20DCCN002', 'b@example.com', '123456', 'student')`
  );
  console.log('Đã chèn users:', userInsert.affectedRows ?? 'OK');

  const [[admin]] = await sequelize.query(`SELECT id FROM users WHERE email='admin@example.com' LIMIT 1`);
  const [[u1]] = await sequelize.query(`SELECT id FROM users WHERE email='a@example.com' LIMIT 1`);

  // EQUIPMENTS 
  await sequelize.query(
    `INSERT INTO equipments (name, category, description, total_quantity, available_quantity, image_url, status)
     VALUES
      ('Projector Epson', 'Presentation', 'Máy chiếu phục vụ thuyết trình', 5, 5, NULL, 'available'),
      ('Micro không dây', 'Audio', 'Micro không dây', 10, 8, NULL, 'available'),
      ('Laptop Dell', 'Computer', 'Laptop cho mượn', 3, 2, NULL, 'available'),
      ('Camera Sony', 'Media', 'Camera quay phim', 2, 2, NULL, 'available')`
  );
  const [[eq1]] = await sequelize.query(`SELECT id FROM equipments WHERE name='Projector Epson' LIMIT 1`);
  const [[eq2]] = await sequelize.query(`SELECT id FROM equipments WHERE name='Micro không dây' LIMIT 1`);

  // BORROW_REQUESTS

  const [reqInsert] = await sequelize.query(
    `INSERT INTO borrow_requests (user_id, borrow_date, expected_return_date, actual_return_date, status, approved_by, note)
     VALUES
      (${u1.id}, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY), NULL, 'pending', NULL, 'Mượn để làm bài thuyết trình'),
      (${u1.id}, DATE_SUB(CURDATE(), INTERVAL 14 DAY), DATE_SUB(CURDATE(), INTERVAL 7 DAY), DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'returned', ${admin.id}, 'Đã trả')`
  );
  console.log('Đã chèn borrow_requests:', reqInsert.affectedRows ?? 'OK');

  const [[reqPending]] = await sequelize.query(
    `SELECT id FROM borrow_requests WHERE user_id=${u1.id} AND status='pending' ORDER BY id DESC LIMIT 1`
  );

  // BORROW_ITEMS 
  await sequelize.query(
    `INSERT INTO borrow_items (request_id, equipment_id, quantity)
     VALUES
      (${reqPending.id}, ${eq1.id}, 1),
      (${reqPending.id}, ${eq2.id}, 2)`
  );

  // NOTIFICATIONS 
  await sequelize.query(
    `INSERT INTO notifications (user_id, title, message, is_read)
     VALUES
      (${u1.id}, 'Yêu cầu mượn đã tạo', 'Bạn đã tạo yêu cầu mượn thiết bị thành công.', 0),
      (${admin.id}, 'Có yêu cầu mượn mới', 'Có một yêu cầu mượn thiết bị đang chờ duyệt.', 0)`
  );

  console.log('Seed hoàn tất');
};

run()
  .then(() => sequelize.close())
  .catch(async (e) => {
    console.error('Seed thất bại:', e);
    try {
      await sequelize.close();
    } catch {
    }
    process.exit(1);
  });
