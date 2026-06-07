CREATE DATABASE borrow_system;
USE borrow_system;
-- =========================================
-- USERS
-- =========================================
CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    student_code VARCHAR(20) UNIQUE NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student')
    NOT NULL DEFAULT 'student',
    reset_password_otp VARCHAR(10) DEFAULT NULL,
    reset_password_expires TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

-- =========================================
-- EQUIPMENTS
-- =========================================
CREATE TABLE IF NOT EXISTS equipments (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100) NULL,
    description TEXT NULL,
    total_quantity INT NOT NULL,
    available_quantity INT NOT NULL,
    image_url VARCHAR(255) NULL,
    status ENUM(
        'available',
        'maintenance',
        'unavailable'
    ) NOT NULL DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT chk_quantity
    CHECK (available_quantity <= total_quantity)

) ENGINE=InnoDB;

-- =========================================
-- BORROW REQUESTS
-- =========================================
CREATE TABLE IF NOT EXISTS borrow_requests (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    borrow_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    actual_return_date DATE NULL,
    status ENUM(
        'pending',
        'approved',
        'borrowed',
        'rejected',
        'returned',
        'overdue',
        'lost',
        'damaged'
    ) NOT NULL DEFAULT 'pending',
    approved_by INT NULL,
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_borrow_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
    CONSTRAINT fk_borrow_admin
    FOREIGN KEY (approved_by)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE

) ENGINE=InnoDB;

-- =========================================
-- BORROW ITEMS
-- =========================================
CREATE TABLE IF NOT EXISTS borrow_items (
    id INT NOT NULL AUTO_INCREMENT,
    request_id INT NOT NULL,
    equipment_id INT NOT NULL,
    quantity INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT chk_borrow_quantity
    CHECK (quantity > 0),
    CONSTRAINT fk_borrow_items_request
    FOREIGN KEY (request_id)
    REFERENCES borrow_requests(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
    CONSTRAINT fk_borrow_items_equipment
    FOREIGN KEY (equipment_id)
    REFERENCES equipments(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE

) ENGINE=InnoDB;

-- =========================================
-- NOTIFICATIONS
-- =========================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_notification_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================================
-- INDEXES 
-- =========================================

SET @index_exists := (
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
            AND table_name = 'borrow_requests'
            AND index_name = 'idx_borrow_user'
);
SET @sql := IF(@index_exists = 0, 'CREATE INDEX idx_borrow_user ON borrow_requests(user_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
            AND table_name = 'borrow_requests'
            AND index_name = 'idx_borrow_status'
);
SET @sql := IF(@index_exists = 0, 'CREATE INDEX idx_borrow_status ON borrow_requests(status)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
            AND table_name = 'equipments'
            AND index_name = 'idx_equipment_status'
);
SET @sql := IF(@index_exists = 0, 'CREATE INDEX idx_equipment_status ON equipments(status)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
            AND table_name = 'notifications'
            AND index_name = 'idx_notification_user'
);
SET @sql := IF(@index_exists = 0, 'CREATE INDEX idx_notification_user ON notifications(user_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
            AND table_name = 'borrow_items'
            AND index_name = 'idx_borrow_items_request'
);
SET @sql := IF(@index_exists = 0, 'CREATE INDEX idx_borrow_items_request ON borrow_items(request_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
            AND table_name = 'borrow_items'
            AND index_name = 'idx_borrow_items_equipment'
);
SET @sql := IF(@index_exists = 0, 'CREATE INDEX idx_borrow_items_equipment ON borrow_items(equipment_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =========================================
-- CATEGORIES
-- =========================================
CREATE TABLE IF NOT EXISTS categories (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

-- =========================================
-- ROLES & PERMISSIONS
-- =========================================
CREATE TABLE IF NOT EXISTS roles (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_by INT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ur_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================================
-- EQUIPMENT IMAGES & QR
-- =========================================
CREATE TABLE IF NOT EXISTS equipment_images (
    id INT NOT NULL AUTO_INCREMENT,
    equipment_id INT NOT NULL,
    url VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_eimg_equipment FOREIGN KEY (equipment_id) REFERENCES equipments(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS equipment_qr_codes (
    id INT NOT NULL AUTO_INCREMENT,
    equipment_id INT NOT NULL,
    qr_code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_eqr_equipment FOREIGN KEY (equipment_id) REFERENCES equipments(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================================
-- RETURNS
-- =========================================
CREATE TABLE IF NOT EXISTS returns (
    id INT NOT NULL AUTO_INCREMENT,
    borrow_item_id INT NOT NULL,
    returned_by INT NULL,
    returned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `condition` ENUM('good','damaged','lost') DEFAULT 'good',
    damage_fee DECIMAL(10,2) DEFAULT 0.00,
    processed_by INT NULL,
    notes TEXT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_return_borrow_item FOREIGN KEY (borrow_item_id) REFERENCES borrow_items(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_return_returned_by FOREIGN KEY (returned_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_return_processed_by FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================================
-- PENALTIES
-- =========================================
CREATE TABLE IF NOT EXISTS penalties (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    borrow_request_id INT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    reason VARCHAR(255) NULL,
    paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_penalty_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_penalty_borrow FOREIGN KEY (borrow_request_id) REFERENCES borrow_requests(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================================
-- ACTIVITY LOGS
-- =========================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id INT NULL,
    action VARCHAR(150) NOT NULL,
    details TEXT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================================
-- SAMPLE DATA: ACCOUNTS, PRODUCTS, IMAGES
-- =========================================

INSERT IGNORE INTO users (full_name, student_code, email, password, role) VALUES
('Admin Tổng', NULL, 'admin@borrowx.vn', '123456', 'admin'),
('Nguyễn Văn An', 'B21DCXX001', 'student1@borrowx.vn', '123456', 'student'),
('Trần Thị Bình', 'B21DCXX002', 'student2@borrowx.vn', '123456', 'student'),
('Lê Văn Cường', 'B21DCXX003', 'student3@borrowx.vn', '123456', 'student'),
('Phạm Thị Dung', 'B21DCXX004', 'student4@borrowx.vn', '123456', 'student'),
('Hoàng Minh Em', 'B21DCXX005', 'student5@borrowx.vn', '123456', 'student');

INSERT INTO equipments (name, category, description, total_quantity, available_quantity, image_url, status)
SELECT 'Máy ảnh Canon EOS 90D', 'Máy ảnh', 'Máy ảnh DSLR 32.5MP dùng cho chụp ảnh và quay video.', 2, 2,
             'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80', 'available'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM equipments WHERE name = 'Máy ảnh Canon EOS 90D');

INSERT INTO equipments (name, category, description, total_quantity, available_quantity, image_url, status)
SELECT 'Máy quay Sony ZV-E10', 'Máy quay', 'Máy quay nhỏ gọn cho livestream và quay vlog.', 3, 3,
             'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80', 'available'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM equipments WHERE name = 'Máy quay Sony ZV-E10');

INSERT INTO equipments (name, category, description, total_quantity, available_quantity, image_url, status)
SELECT 'Tripod Manfrotto Compact', 'Phụ kiện', 'Chân máy chắc chắn cho máy ảnh và máy quay.', 5, 5,
             'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80', 'available'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM equipments WHERE name = 'Tripod Manfrotto Compact');

INSERT INTO equipments (name, category, description, total_quantity, available_quantity, image_url, status)
SELECT 'Micro không dây Rode Wireless GO II', 'Âm thanh', 'Bộ micro không dây gọn nhẹ cho ghi âm và phỏng vấn.', 4, 4,
             'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80', 'available'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM equipments WHERE name = 'Micro không dây Rode Wireless GO II');

INSERT INTO equipments (name, category, description, total_quantity, available_quantity, image_url, status)
SELECT 'Máy chiếu Epson EB-X06', 'Trình chiếu', 'Máy chiếu sáng mạnh cho hội thảo, lớp học và sự kiện.', 2, 2,
             'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80', 'available'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM equipments WHERE name = 'Máy chiếu Epson EB-X06');

INSERT INTO equipment_images (equipment_id, url, is_primary)
SELECT e.id, 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80', TRUE
FROM equipments e
WHERE e.name = 'Máy ảnh Canon EOS 90D'
    AND NOT EXISTS (
            SELECT 1
            FROM equipment_images
            WHERE equipment_id = e.id
                AND url = 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80'
    );

INSERT INTO equipment_images (equipment_id, url, is_primary)
SELECT e.id, 'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=1200&q=80', TRUE
FROM equipments e
WHERE e.name = 'Máy quay Sony ZV-E10'
    AND NOT EXISTS (
            SELECT 1
            FROM equipment_images
            WHERE equipment_id = e.id
                AND url = 'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=1200&q=80'
    );

INSERT INTO equipment_images (equipment_id, url, is_primary)
SELECT e.id, 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80', TRUE
FROM equipments e
WHERE e.name = 'Tripod Manfrotto Compact'
    AND NOT EXISTS (
            SELECT 1
            FROM equipment_images
            WHERE equipment_id = e.id
                AND url = 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80'
    );

INSERT INTO equipment_images (equipment_id, url, is_primary)
SELECT e.id, 'https://images.unsplash.com/photo-1581591524425-c7e0978865b6?auto=format&fit=crop&w=1200&q=80', TRUE
FROM equipments e
WHERE e.name = 'Micro không dây Rode Wireless GO II'
    AND NOT EXISTS (
            SELECT 1
            FROM equipment_images
            WHERE equipment_id = e.id
                AND url = 'https://images.unsplash.com/photo-1581591524425-c7e0978865b6?auto=format&fit=crop&w=1200&q=80'
    );

INSERT INTO equipment_images (equipment_id, url, is_primary)
SELECT e.id, 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80', TRUE
FROM equipments e
WHERE e.name = 'Máy chiếu Epson EB-X06'
    AND NOT EXISTS (
            SELECT 1
            FROM equipment_images
            WHERE equipment_id = e.id
                AND url = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80'
    );

-- =========================================
-- SAMPLE SEEDS: ROLES & BASIC PERMISSIONS
-- =========================================
INSERT IGNORE INTO roles (name, description) VALUES
('super_admin', 'Full system access'),
('warehouse_admin', 'Manage equipment and inventory'),
('request_admin', 'Approve or reject borrow requests'),
('warehouse_staff', 'Confirm handover and returns'),
('assistant', 'Read-only assistant');

INSERT IGNORE INTO permissions (name, description) VALUES
('manage_users', 'Create/edit/lock/unlock user accounts'),
('manage_roles', 'Assign and modify roles and permissions'),
('manage_equipments', 'Create/edit/delete equipments'),
('manage_inventory', 'Update stock quantities and locations'),
('approve_requests', 'Approve or reject borrow requests'),
('record_returns', 'Record returned items and conditions'),
('view_reports', 'View and export reports'),
('view_logs', 'View activity logs');

-- Assign some default permission mappings (best-effort, ids assumed sequential)
-- Note: if running against an existing DB, adapt ids or run after inspecting inserted ids.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON (
    (r.name = 'super_admin') OR
    (r.name = 'warehouse_admin' AND p.name IN ('manage_equipments','manage_inventory','record_returns')) OR
    (r.name = 'request_admin' AND p.name = 'approve_requests')
);
