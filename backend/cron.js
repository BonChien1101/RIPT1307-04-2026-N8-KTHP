const { processOverdueRequests } = require('./services/overdueService');

let started = false;

const scheduleOverdueJob = () => {
	if (started) return;
	started = true;

	const runJob = async () => {
		try {
			await processOverdueRequests();
		} catch (e) {
			console.error('Overdue cron failed:', e.message);
		}
	};

	const now = new Date();
	const nextRun = new Date(now);
	nextRun.setHours(0, 5, 0, 0);
	if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);

	setTimeout(() => {
		runJob();
		setInterval(runJob, 24 * 60 * 60 * 1000);
	}, nextRun.getTime() - now.getTime());
};

module.exports = { scheduleOverdueJob };