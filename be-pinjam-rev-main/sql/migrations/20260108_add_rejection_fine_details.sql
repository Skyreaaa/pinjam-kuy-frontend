-- Migration: Add rejection reason and fine reason columns
-- Date: 2026-01-08
-- Purpose: Store admin's reason for rejection and fine when processing returns

ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS rejectionReason TEXT COMMENT 'Alasan admin menolak bukti pengembalian',
ADD COLUMN IF NOT EXISTS fineReason TEXT COMMENT 'Alasan admin memberikan denda saat menerima pengembalian';
