/* eslint-disable no-console */
require('dotenv').config();

const sequelize = require('../config/database');
require('../models');
const { getInsertedId } = require('../utils/sqlCompat');

const isMysql = () => sequelize.getDialect() === 'mysql';

const resetTables = async () => {
	const tables = [
		'borrow_items',
		'borrow_requests',
		'notifications',
		'equipment_qr_codes',
		'equipment_images',
		'penalties',
		'returns',
		'role_permissions',
		'user_roles',
		'equipments',
		'categories',
		'users',
		'permissions',
		'roles',
	];

	if (isMysql()) {
		await sequelize.query('SET FOREIGN_KEY_CHECKS=0');
		for (const table of tables) {
			// eslint-disable-next-line no-await-in-loop
			await sequelize.query(`TRUNCATE TABLE ${table}`);
		}
		await sequelize.query('SET FOREIGN_KEY_CHECKS=1');
		return;
	}

	await sequelize.query('PRAGMA foreign_keys = OFF');
	for (const table of tables) {
		// eslint-disable-next-line no-await-in-loop
		await sequelize.query(`DELETE FROM ${table}`);
	}
	await sequelize.query('DELETE FROM sqlite_sequence');
	await sequelize.query('PRAGMA foreign_keys = ON');
};

const todaySql = () => (isMysql() ? 'CURDATE()' : "DATE('now')");

const offsetDateSql = (days) => {
	if (isMysql()) {
		if (days === 0) return 'CURDATE()';
		return days > 0
			? `DATE_ADD(CURDATE(), INTERVAL ${days} DAY)`
			: `DATE_SUB(CURDATE(), INTERVAL ${Math.abs(days)} DAY)`;
	}
	if (days === 0) return "DATE('now')";
	return days > 0 ? `DATE('now', '+${days} day')` : `DATE('now', '${days} day')`;
};

const createSampleEquipmentRows = (categoryRows) => {
	const categories = {
		Presentation: categoryRows.find((item) => item.name === 'Presentation')?.id,
		Audio: categoryRows.find((item) => item.name === 'Audio')?.id,
		Computer: categoryRows.find((item) => item.name === 'Computer')?.id,
		Media: categoryRows.find((item) => item.name === 'Media')?.id,
	};

	const sampleGroups = [
		{
			category: 'Presentation',
			prefix: 'Máy chiếu mẫu',
			description: 'Thiết bị trình chiếu phục vụ lớp học, hội thảo và thuyết trình.',
			totalStart: 2,
			availableStart: 1,
		},
		{
			category: 'Audio',
			prefix: 'Bộ âm thanh mẫu',
			description: 'Thiết bị âm thanh phục vụ giảng dạy, sự kiện và phòng họp.',
			totalStart: 4,
			availableStart: 3,
		},
		{
			category: 'Computer',
			prefix: 'Laptop mẫu',
			description: 'Máy tính xách tay phục vụ thực hành, thuyết trình và demo.',
			totalStart: 3,
			availableStart: 2,
		},
		{
			category: 'Media',
			prefix: 'Camera mẫu',
			description: 'Thiết bị quay chụp phục vụ truyền thông, lưu trữ và thực hành.',
			totalStart: 2,
			availableStart: 2,
		},
	];

	const rows = [];
	for (let index = 1; index <= 100; index += 1) {
		const group = sampleGroups[(index - 1) % sampleGroups.length];
		const suffix = String(index).padStart(3, '0');
		const totalQuantity = group.totalStart + ((index - 1) % 4);
		const availableQuantity = Math.min(group.availableStart + ((index - 1) % 3), totalQuantity);
		rows.push([
			`${group.prefix} ${suffix}`,
			categories[group.category],
			`${group.description} Mẫu số ${suffix}.`,
			totalQuantity,
			availableQuantity,
			null,
			'available',
		]);
	}

	return rows;
};

const run = async () => {
	await sequelize.authenticate();
	await sequelize.sync({ alter: false });

	const dialect = sequelize.getDialect();
	console.log('Đang seed dữ liệu cho dialect:', dialect);

	await resetTables();

	const [userInsert] = await sequelize.query(
		`INSERT INTO users (full_name, student_code, email, password, role)
		 VALUES
		  ('Admin', 'AD000', 'admin@example.com', '123456', 'admin'),
		  ('Trương Công Chiến', 'B24DCCC040', 'chiensenpaiii2006@gmail.com', '123456', 'student'),
		  ('Tran Thi B', 'B20DCCN002', 'b@example.com', '123456', 'student')`
	);
	console.log('Đã chèn users:', userInsert?.changes ?? 'OK');

	const [admins] = await sequelize.query(`SELECT id FROM users WHERE email='admin@example.com' LIMIT 1`);
	const [students] = await sequelize.query(`SELECT id FROM users WHERE email='a@example.com' LIMIT 1`);
	const admin = admins?.[0];
	const u1 = students?.[0];

	await sequelize.query(
		`${isMysql() ? 'INSERT IGNORE' : 'INSERT OR IGNORE'} INTO categories (name)
		 VALUES ('Presentation'), ('Audio'), ('Computer'), ('Media')`
	);

	await sequelize.query(
		`INSERT INTO equipments (name, category_id, description, total_quantity, available_quantity, image_url, status)
		 SELECT 'Projector Epson', id, 'Máy chiếu phục vụ thuyết trình', 5, 5, NULL, 'available' FROM categories WHERE name = 'Presentation'
		 UNION ALL
		 SELECT 'Micro không dây', id, 'Micro không dây', 10, 8, NULL, 'available' FROM categories WHERE name = 'Audio'
		 UNION ALL
		 SELECT 'Laptop Dell', id, 'Laptop cho mượn', 3, 2, NULL, 'available' FROM categories WHERE name = 'Computer'
		 UNION ALL
		 SELECT 'Camera Sony', id, 'Camera quay phim', 2, 2, NULL, 'available' FROM categories WHERE name = 'Media'`
	);

	const [categoryRows] = await sequelize.query(`SELECT id, name FROM categories ORDER BY id ASC`);
	const sampleEquipmentRows = createSampleEquipmentRows(categoryRows);
	const equipmentPlaceholders = sampleEquipmentRows.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(',\n');
	const equipmentValues = sampleEquipmentRows.flat();
	await sequelize.query(
		`INSERT INTO equipments (name, category_id, description, total_quantity, available_quantity, image_url, status)
		 VALUES ${equipmentPlaceholders}`,
		{ replacements: equipmentValues }
	);

	const [eqRows1] = await sequelize.query(`SELECT id FROM equipments WHERE name='Projector Epson' LIMIT 1`);
	const [eqRows2] = await sequelize.query(`SELECT id FROM equipments WHERE name='Micro không dây' LIMIT 1`);
	const eq1 = eqRows1?.[0];
	const eq2 = eqRows2?.[0];

	const [reqInsert] = await sequelize.query(
		`INSERT INTO borrow_requests (user_id, borrow_date, expected_return_date, actual_return_date, status, approved_by, note)
		 VALUES
		  (${u1.id}, ${todaySql()}, ${offsetDateSql(7)}, NULL, 'pending', NULL, 'Mượn để làm bài thuyết trình'),
		  (${u1.id}, ${offsetDateSql(-14)}, ${offsetDateSql(-7)}, ${offsetDateSql(-6)}, 'returned', ${admin.id}, 'Đã trả')`
	);
	console.log('Đã chèn borrow_requests:', reqInsert?.changes ?? 'OK');

	const [reqRows] = await sequelize.query(
		`SELECT id FROM borrow_requests WHERE user_id=${u1.id} AND status='pending' ORDER BY id DESC LIMIT 1`
	);
	const reqPending = reqRows?.[0];

	const [borrowItemInsert] = await sequelize.query(
		`INSERT INTO borrow_items (request_id, equipment_id, quantity)
		 VALUES
		  (${reqPending.id}, ${eq1.id}, 1),
		  (${reqPending.id}, ${eq2.id}, 2)`
	);
	console.log('Đã chèn borrow_items:', borrowItemInsert?.changes ?? 'OK');

	const [notificationInsert] = await sequelize.query(
		`INSERT INTO notifications (user_id, title, message, is_read)
		 VALUES
		  (${u1.id}, 'Yêu cầu mượn đã tạo', 'Bạn đã tạo yêu cầu mượn thiết bị thành công.', 0),
		  (${admin.id}, 'Có yêu cầu mượn mới', 'Có một yêu cầu mượn thiết bị đang chờ duyệt.', 0)`
	);
	console.log('Đã chèn notifications:', notificationInsert?.changes ?? 'OK');

	console.log('Seed hoàn tất');
};

run()
	.then(() => sequelize.close())
	.catch(async (e) => {
		console.error('Seed thất bại:', e);
		try {
			await sequelize.close();
		} catch {
			// ignore
		}
		process.exit(1);
	});