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

const overdueRate = async (req, res) => {
	try {
		const [[total]] = await sequelize.query(
			"SELECT COUNT(*) as total FROM borrow_requests WHERE status IN ('returned','overdue','damaged','lost')"
		);
		const [[overdue]] = await sequelize.query(
			`SELECT COUNT(*) as total FROM borrow_requests
			 WHERE status = 'returned' AND actual_return_date > expected_return_date`
		);

		const totalBorrows = Number(total.total) || 0;
		const overdueCount = Number(overdue.total) || 0;
		const overdueRatePercent = totalBorrows > 0 ? ((overdueCount / totalBorrows) * 100).toFixed(2) : '0.00';

		return ok(res, { total_borrows: totalBorrows, overdue_count: overdueCount, overdue_rate_percent: overdueRatePercent }, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi tính tỉ lệ trễ hạn', 'INTERNAL_ERROR', 500);
	}
};

const monthlyTrend = async (req, res) => {
	try {
		const { year } = req.query || {};
		const nam = Number(year) || new Date().getFullYear();
		const dialect = sequelize.getDialect();

		let extractMonth;
		if (dialect === 'mysql') {
			extractMonth = 'MONTH(borrow_date)';
		} else {
			extractMonth = "CAST(strftime('%m', borrow_date) AS INTEGER)";
		}

		const [rows] = await sequelize.query(
			`SELECT ${extractMonth} as thang, COUNT(*) as tong
			 FROM borrow_requests
			 WHERE ${dialect === 'mysql' ? 'YEAR(borrow_date) = ?' : "strftime('%Y', borrow_date) = ?"}
			 GROUP BY thang
			 ORDER BY thang ASC`,
			{ replacements: [String(nam)] }
		);

		// Fill all 12 months
		const result = [];
		for (let m = 1; m <= 12; m++) {
			const found = rows.find((r) => Number(r.thang) === m);
			result.push({ month: m, count: found ? Number(found.tong) : 0 });
		}

		return ok(res, result, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy xu hướng theo tháng', 'INTERNAL_ERROR', 500);
	}
};

const clubStats = async (req, res) => {
	try {
		const [rows] = await sequelize.query(
			`SELECT u.club, COUNT(br.id) as tong_muon
			 FROM borrow_requests br
			 JOIN users u ON u.id = br.user_id
			 WHERE u.club IS NOT NULL AND u.club != ''
			 GROUP BY u.club
			 ORDER BY tong_muon DESC
			 LIMIT 20`
		);
		return ok(res, rows, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy thống kê câu lạc bộ', 'INTERNAL_ERROR', 500);
	}
};

const aiSuggestion = async (req, res) => {
	try {
		// Get top 10 equipment borrowed in last 3 months
		const dialect = sequelize.getDialect();
		let dateFilter;
		if (dialect === 'mysql') {
			dateFilter = `br.borrow_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)`;
		} else {
			dateFilter = `br.borrow_date >= datetime('now', '-90 days')`;
		}

		const [topEquip] = await sequelize.query(
			`SELECT e.id, e.name, e.category, SUM(bi.quantity) as tong
			 FROM borrow_items bi
			 JOIN borrow_requests br ON br.id = bi.request_id
			 JOIN equipments e ON e.id = bi.equipment_id
			 WHERE ${dateFilter}
			 GROUP BY e.id, e.name, e.category
			 ORDER BY tong DESC
			 LIMIT 10`
		);

		const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

		if (!GEMINI_API_KEY) {
			// Rule-based static suggestion
			const suggestions = [];
			const categories = {};
			topEquip.forEach((e) => {
				const cat = e.category || 'Khác';
				if (!categories[cat]) categories[cat] = [];
				categories[cat].push(e);
			});

			Object.entries(categories).forEach(([cat, items]) => {
				if (items.length >= 2) {
					suggestions.push({
						name: `Bộ ${cat}`,
						reason: `Các thiết bị thuộc danh mục "${cat}" thường được mượn cùng nhau`,
						equipment: items.slice(0, 3).map((e) => e.name),
					});
				}
			});

			if (suggestions.length === 0 && topEquip.length >= 2) {
				suggestions.push({
					name: 'Combo phổ biến nhất',
					reason: 'Dựa trên lịch sử mượn 3 tháng gần nhất',
					equipment: topEquip.slice(0, 3).map((e) => e.name),
				});
			}

			return ok(res, suggestions, 'OK');
		}

		// Call Gemini API
		const equipList = topEquip.map((e) => `- ${e.name} (${e.category || 'N/A'}): ${e.tong} lần mượn`).join('\n');
		const prompt = `Dưới đây là danh sách thiết bị được mượn nhiều nhất trong 3 tháng gần đây tại một campus thông minh:\n${equipList}\n\nHãy gợi ý 3 bộ combo thiết bị phù hợp cho các sự kiện/hoạt động phổ biến. Trả lời theo định dạng JSON: [{\"name\": \"tên combo\", \"reason\": \"lý do\", \"equipment\": [\"tên thiết bị 1\", \"tên thiết bị 2\"]}]`;

		const fetch = require('node-fetch').default || require('node-fetch');
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
			}
		);

		if (!response.ok) {
			throw new Error(`Gemini API error: ${response.status}`);
		}

		const geminiData = await response.json();
		const textContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

		let parsed = [];
		try {
			const jsonMatch = textContent.match(/\[[\s\S]*\]/);
			if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
		} catch {
			parsed = [];
		}

		// Map equipment names to ids
		const suggestions = parsed.map((s) => ({
			name: s.name,
			reason: s.reason,
			equipment: (s.equipment || []).map((eName) => {
				const found = topEquip.find((e) => e.name === eName);
				return found ? found.name : eName;
			}),
		}));

		return ok(res, suggestions, 'OK');
	} catch (e) {
		return fail(res, 'Lỗi server khi lấy gợi ý AI', 'INTERNAL_ERROR', 500);
	}
};

module.exports = { dashboard, thongKeTheoThang, topThietBi, overdueRate, monthlyTrend, clubStats, aiSuggestion };

