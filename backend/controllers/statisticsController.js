const sequelize = require('../config/database');
const { ok, fail } = require('../utils/response');

const monthFilter = (column, year, month) => {
	if (sequelize.getDialect() === 'mysql') {
		return {
			sql: `YEAR(${column}) = ? AND MONTH(${column}) = ?`,
			params: [String(year), String(month)],
		};
	}

	return {
		sql: `strftime('%Y', ${column}) = ? AND strftime('%m', ${column}) = ?`,
		params: [String(year), String(month).padStart(2, '0')],
	};
};

const dashboard = async (req, res) => {
	try {
		const [[tongThietBi]] = await sequelize.query('SELECT COUNT(*) as total FROM equipments');
		const [[tongYeuCau]] = await sequelize.query('SELECT COUNT(*) as total FROM borrow_requests');
		const [[dangChoDuyet]] = await sequelize.query(
			"SELECT COUNT(*) as total FROM borrow_requests WHERE status = 'pending'"
		);

		return ok(
			res,
			{
				tongThietBi: tongThietBi.total,
				tongYeuCau: tongYeuCau.total,
				dangChoDuyet: dangChoDuyet.total,
			},
			'OK'
		);
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy dashboard', 'INTERNAL_ERROR', 500);
	}
};

const thongKeTheoThang = async (req, res) => {
	try {
		const { year, month } = req.query || {};
		const nam = Number(year);
		const thang = Number(month);
		if (!nam || !thang || thang < 1 || thang > 12) {
			return fail(res, 'Tham số year/month không hợp lệ', 'VALIDATION_ERROR', 400);
		}

		const filter = monthFilter('borrow_date', nam, thang);
		const [rows] = await sequelize.query(
			`SELECT DATE(borrow_date) as ngay, COUNT(*) as tong
			 FROM borrow_requests
			 WHERE ${filter.sql}
			 GROUP BY DATE(borrow_date)
			 ORDER BY ngay ASC`,
			{ replacements: filter.params }
		);

		return ok(res, rows, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi thống kê theo tháng', 'INTERNAL_ERROR', 500);
	}
};

const topThietBi = async (req, res) => {
	try {
		const { year, month, limit } = req.query || {};
		const nam = Number(year);
		const thang = Number(month);
		const gioiHan = Math.min(Number(limit || 10), 50);
		if (!nam || !thang || thang < 1 || thang > 12) {
			return fail(res, 'Tham số year/month không hợp lệ', 'VALIDATION_ERROR', 400);
		}

		const filter = monthFilter('br.borrow_date', nam, thang);
		const [rows] = await sequelize.query(
			`SELECT e.id, e.name, SUM(bi.quantity) as tongMuon
			 FROM borrow_items bi
			 JOIN borrow_requests br ON br.id = bi.request_id
			 JOIN equipments e ON e.id = bi.equipment_id
			 WHERE ${filter.sql}
			 AND br.status IN ('approved','borrowed','returned')
			 GROUP BY e.id, e.name
			 ORDER BY tongMuon DESC
			 LIMIT ?`,
			{ replacements: [...filter.params, gioiHan] }
		);

		return ok(res, rows, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy top thiết bị', 'INTERNAL_ERROR', 500);
	}
};

module.exports = { dashboard, thongKeTheoThang, topThietBi };
