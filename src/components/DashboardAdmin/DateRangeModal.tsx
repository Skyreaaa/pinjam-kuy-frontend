import React from 'react';
import './AdminDashboard.css';

interface DateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateFrom: string;
  dateTo: string;
  setDateFrom: (val: string) => void;
  setDateTo: (val: string) => void;
  onApply: () => void;
}

const DateRangeModal: React.FC<DateRangeModalProps> = ({ isOpen, onClose, dateFrom, dateTo, setDateFrom, setDateTo, onApply }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ maxWidth: 340, minWidth: 260, padding: '28px 24px 20px 24px', borderRadius: 14 }}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Tutup" style={{ position: 'absolute', top: 8, right: 8 }}>&times;</button>
        <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 18 }}>Pilih Rentang Tanggal</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <input type="date" className="date-filter-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ minWidth: 110 }} />
          <span style={{ fontSize: 15 }}>-</span>
          <input type="date" className="date-filter-input" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ minWidth: 110 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={onApply} disabled={!dateFrom || !dateTo}>Terapkan</button>
        </div>
      </div>
    </div>
  );
};

export default DateRangeModal;
