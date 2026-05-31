require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { fail } = require('./utils/response');

const authRoutes = require('./routes/authRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const borrowRoutes = require('./routes/borrowRoutes');
const statisticsRoutes = require('./routes/statisticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

const docOriginCors = () => {
	const raw = (process.env.CORS_ORIGINS || '').trim();
	if (!raw) return null;
	return raw
		.split(',')
		.map((x) => x.trim())
		.filter(Boolean);
};

const danhSachOrigin = docOriginCors();

app.use(
	cors({
		origin(origin, cb) {
			// Không có Origin (Postman/SSR/healthcheck) thì cho qua
			if (!origin) return cb(null, true);
			// Nếu không cấu hình CORS_ORIGINS thì mặc định mở (tiện dev)
			if (!danhSachOrigin) return cb(null, true);
			if (danhSachOrigin.includes(origin)) return cb(null, true);
			return cb(new Error('CORS_NOT_ALLOWED'));
		},
		credentials: true,
	})
);

// Express 5 + path-to-regexp không hỗ trợ '*' kiểu cũ cho route.
// Xử lý preflight OPTIONS bằng middleware để deploy dùng được.
app.use((req, res, next) => {
	if (req.method === 'OPTIONS') return res.sendStatus(204);
	return next();
});
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
	res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/equipments', equipmentRoutes);
app.use('/api', notificationRoutes);
app.use('/api', borrowRoutes);
app.use('/api', statisticsRoutes);

app.use((req, res) => {
	return fail(res, 'Không tìm thấy API', 'NOT_FOUND', 404);
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
	// eslint-disable-next-line no-console
	console.error('[globalError]', {
		message: err?.message,
		stack: err?.stack,
		original: err?.original,
		path: req?.path,
		method: req?.method,
	});
	if (err?.message === 'CORS_NOT_ALLOWED') {
		return fail(res, 'CORS: origin không được phép', 'CORS_NOT_ALLOWED', 403);
	}
	return fail(res, err?.message || 'Lỗi server', 'INTERNAL_ERROR', 500);
});

if (require.main === module) {
	const port = Number(process.env.PORT || 5000);
	app.listen(port, () => {
		console.log(`API server running on http://localhost:${port}`);
	});
}

module.exports = app;