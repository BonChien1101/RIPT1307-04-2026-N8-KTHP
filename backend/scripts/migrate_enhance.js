const sequelize = require('../config/database');

const safeAlter = async (sql) => {
  try {
    await sequelize.query(sql);
  } catch (e) {
    // Column likely already exists — ignore
  }
};

const run = async () => {
  // ----- users table -----
  await safeAlter(`ALTER TABLE users ADD COLUMN trust_score INTEGER DEFAULT 100`);
  await safeAlter(`ALTER TABLE users ADD COLUMN trust_rank TEXT DEFAULT 'bronze'`);
  await safeAlter(`ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0`);
  await safeAlter(`ALTER TABLE users ADD COLUMN banned_until TEXT`);
  await safeAlter(`ALTER TABLE users ADD COLUMN club TEXT`);

  // ----- equipments table -----
  await safeAlter(`ALTER TABLE equipments ADD COLUMN condition_status TEXT DEFAULT 'good'`);
  await safeAlter(`ALTER TABLE equipments ADD COLUMN qr_data TEXT`);
  await safeAlter(`ALTER TABLE equipments ADD COLUMN last_maintenance_at TEXT`);
  await safeAlter(`ALTER TABLE equipments ADD COLUMN rating_avg REAL DEFAULT 0`);
  await safeAlter(`ALTER TABLE equipments ADD COLUMN rating_count INTEGER DEFAULT 0`);

  // ----- borrow_requests table -----
  await safeAlter(`ALTER TABLE borrow_requests ADD COLUMN signature_data TEXT`);
  await safeAlter(`ALTER TABLE borrow_requests ADD COLUMN return_image_url TEXT`);
  await safeAlter(`ALTER TABLE borrow_requests ADD COLUMN return_note TEXT`);

  // ----- device_reviews -----
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS device_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      borrow_request_id INTEGER,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (equipment_id) REFERENCES equipments(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ----- repair_logs -----
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS repair_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      description TEXT,
      cost REAL DEFAULT 0,
      repaired_by TEXT,
      repaired_at TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (equipment_id) REFERENCES equipments(id)
    )
  `);

  // ----- borrow_queue -----
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS borrow_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'waiting',
      notified_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (equipment_id) REFERENCES equipments(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ----- tickets -----
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (equipment_id) REFERENCES equipments(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ----- penalties -----
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS penalties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      borrow_request_id INTEGER,
      amount REAL DEFAULT 0,
      reason TEXT,
      status TEXT DEFAULT 'unpaid',
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (borrow_request_id) REFERENCES borrow_requests(id)
    )
  `);

  console.log('Migration complete');
  process.exit(0);
};

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
