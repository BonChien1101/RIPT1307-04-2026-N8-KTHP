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
		if (Number.isFinite(result)) return result;
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