
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

CREATE INDEX idx_borrow_user
ON borrow_requests(user_id);
CREATE INDEX idx_borrow_status
ON borrow_requests(status);
CREATE INDEX idx_equipment_status
ON equipments(status);
CREATE INDEX idx_notification_user
ON notifications(user_id);
CREATE INDEX idx_borrow_items_request
ON borrow_items(request_id);
CREATE INDEX idx_borrow_items_equipment
ON borrow_items(equipment_id);

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
    returned_by INT NOT NULL,
    returned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    condition ENUM('good','damaged','lost') DEFAULT 'good',
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
