-- Migration: Add fine_payments table
-- Date: 2026-01-08

CREATE TABLE IF NOT EXISTS fine_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    username VARCHAR(255),
    npm VARCHAR(50),
    method ENUM('qris', 'bank_transfer', 'cash') NOT NULL,
    amount_total DECIMAL(10, 2) NOT NULL,
    proof_url VARCHAR(500),
    loan_ids TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    account_name VARCHAR(255),
    bank_name VARCHAR(100),
    admin_notes TEXT,
    verified_by INT,
    verified_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);
