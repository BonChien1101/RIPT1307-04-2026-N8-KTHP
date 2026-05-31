const seq = require('../config/database');
(async () => {
  try {
    const [rows] = await seq.query('SELECT * FROM borrow_queue LIMIT 2');
    console.log('borrow_queue rows:', JSON.stringify(rows));

    const [eqs] = await seq.query('SELECT id, name, status, available_quantity FROM equipments LIMIT 2');
    console.log('equipment sample:', JSON.stringify(eqs));

    if (rows.length > 0) {
      const [joined] = await seq.query(
        'SELECT bq.id, e.name FROM borrow_queue bq JOIN equipments e ON e.id = bq.equipment_id LIMIT 1'
      );
      console.log('join test:', JSON.stringify(joined));
    } else {
      console.log('No rows in borrow_queue, trying direct join with equipments...');
      const [j2] = await seq.query('SELECT e.id, e.name, e.status, e.available_quantity FROM equipments e LIMIT 2');
      console.log('equipments direct:', JSON.stringify(j2));
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  }
  process.exit(0);
})();
