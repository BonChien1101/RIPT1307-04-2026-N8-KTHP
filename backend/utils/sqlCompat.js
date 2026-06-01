const getInsertedId = (...values) => {
	for (const result of values.flat()) {
		if (!result) continue;
		const id = result.insertId ?? result.lastID ?? result.lastInsertRowid ?? result.id;
		if (id !== undefined && id !== null) return id;
	}
	return null;
};

const getAffectedRows = (...values) => {
	for (const result of values.flat()) {
		if (!result) continue;
		// Some dialects/versions return affected row count as a plain number
		// (e.g., QueryTypes.UPDATE on sqlite / some mysql drivers).
		if (Number.isFinite(result)) return result;

		// Sequelize raw queries return different shapes by dialect and by QueryTypes.
		// MySQL often returns OkPacket-like objects (affectedRows) either as the first
		// element in an array or as the 2nd "metadata" value from sequelize.query().
		if (Array.isArray(result)) {
			const nested = getAffectedRows(...result);
			if (nested) return nested;
			continue;
		}
		const count = result.affectedRows ?? result.changes ?? result.rowCount;
		if (count !== undefined && count !== null) return count;
	}
	return 0;
};

module.exports = { getInsertedId, getAffectedRows };