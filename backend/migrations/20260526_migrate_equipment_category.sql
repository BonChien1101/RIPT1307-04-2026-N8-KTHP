-- Migration: convert equipments.category (VARCHAR) to foreign key category_id -> categories(id)
-- Safe steps: create categories, import distinct names, add category_id, populate, drop old column, add FK

-- NOTE: Some MySQL engines perform implicit commits on DDL. Run on a test DB first and backup before applying.

-- 1) Ensure categories table exists
CREATE TABLE IF NOT EXISTS categories (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

-- 2) Insert distinct category names from equipments (if any)
INSERT IGNORE INTO categories (name)
SELECT DISTINCT TRIM(category) FROM equipments WHERE category IS NOT NULL AND TRIM(category) <> '';

-- 3) Add new nullable category_id column
ALTER TABLE equipments
  ADD COLUMN category_id INT NULL;

-- 4) Populate category_id by matching name
UPDATE equipments e
JOIN categories c ON TRIM(e.category) = c.name
SET e.category_id = c.id
WHERE e.category IS NOT NULL AND TRIM(e.category) <> '';

-- 5) If you want to keep history, skip dropping the old column. Otherwise drop it.
-- Drop old category column (run only if the column still exists)
ALTER TABLE equipments
  DROP COLUMN category;

-- 6) Add foreign key constraint
ALTER TABLE equipments
  ADD CONSTRAINT fk_equipments_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- End migration
