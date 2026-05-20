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

app.use(cors());
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
	return fail(res, err?.message || 'Lỗi server', 'INTERNAL_ERROR', 500);
});

if (require.main === module) {
	const port = Number(process.env.PORT || 5000);
	app.listen(port, () => {
		console.log(`API server running on http://localhost:${port}`);
	});
}

module.exports = app;