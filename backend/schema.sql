
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