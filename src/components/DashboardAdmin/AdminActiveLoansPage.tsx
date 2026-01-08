// AdminActiveLoansPage.tsx - Kelola Peminjaman Aktif
import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import EmptyState from '../common/EmptyState';
import './AdminActiveLoansPage.css';

interface ActiveLoan {
  id: number;
  kodePinjam: string;
  bookTitle: string;
  borrowerName: string;
  npm: string;
  loanDate: string;
  expectedReturnDate: string;
  status: 'Diambil' | 'Sedang Dipinjam' | 'Terlambat';
  daysRemaining: number;
  isOverdue: boolean;
}

const AdminActiveLoansPage: React.FC = () => {
  const [loans, setLoans] = useState<ActiveLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'overdue'>('all');

  const fetchActiveLoans = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getActiveLoans();
      setLoans(data.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Gagal memuat data peminjaman aktif');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveLoans();
    // Auto-refresh setiap 30 detik
    const interval = setInterval(fetchActiveLoans, 30000);
    return () => clearInterval(interval);
  }, []);

  const calculateDaysRemaining = (expectedReturnDate: string): number => {
    const now = new Date();
    const returnDate = new Date(expectedReturnDate);
    const diffTime = returnDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const sendReminder = async (loanId: number, borrowerName: string) => {
    try {
      await adminApi.sendLoanReminder(loanId);
      alert(`Peringatan berhasil dikirim ke ${borrowerName}`);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Gagal mengirim peringatan');
    }
  };

  const filteredLoans = loans.filter(loan => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'overdue') return loan.isOverdue;
    if (filterStatus === 'active') return !loan.isOverdue;
    return true;
  });

  const getStatusColor = (daysRemaining: number, isOverdue: boolean) => {
    if (isOverdue) return '#e53935'; // Merah
    if (daysRemaining <= 1) return '#ff9800'; // Orange
    if (daysRemaining <= 3) return '#ffc107'; // Kuning
    return '#4caf50'; // Hijau
  };

  const getStatusIcon = (daysRemaining: number, isOverdue: boolean) => {
    if (isOverdue) return '⚠️';
    if (daysRemaining <= 1) return '⏰';
    if (daysRemaining <= 3) return '📅';
    return '✅';
  };

  if (loading && loans.length === 0) {
    return (
      <div className="admin-active-loans-container">
        <h2>📚 Kelola Peminjaman Aktif</h2>
        <div className="loading-state">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="admin-active-loans-container">
      <div className="page-header">
        <h2>📚 Kelola Peminjaman Aktif</h2>
        <button className="btn btn-refresh" onClick={fetchActiveLoans}>
          🔄 Refresh
        </button>
      </div>

      <div className="filter-bar">
        <button 
          className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          Semua ({loans.length})
        </button>
        <button 
          className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
          onClick={() => setFilterStatus('active')}
        >
          Aktif ({loans.filter(l => !l.isOverdue).length})
        </button>
        <button 
          className={`filter-btn ${filterStatus === 'overdue' ? 'active' : ''}`}
          onClick={() => setFilterStatus('overdue')}
        >
          Terlambat ({loans.filter(l => l.isOverdue).length})
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {filteredLoans.length === 0 ? (
        <EmptyState
          icon="📭"
          title="Tidak ada peminjaman aktif"
          description={
            filterStatus === 'all' 
              ? "Saat ini tidak ada buku yang sedang dipinjam" 
              : filterStatus === 'overdue'
              ? "Tidak ada peminjaman yang terlambat"
              : "Tidak ada peminjaman aktif dalam kategori ini"
          }
        />
      ) : (
        <div className="loans-grid">
          {filteredLoans.map((loan) => {
            const daysRemaining = calculateDaysRemaining(loan.expectedReturnDate);
            const isOverdue = daysRemaining < 0;
            const statusColor = getStatusColor(daysRemaining, isOverdue);
            const statusIcon = getStatusIcon(daysRemaining, isOverdue);

            return (
              <div 
                key={loan.id} 
                className="loan-card"
                style={{ borderLeft: `4px solid ${statusColor}` }}
              >
                <div className="loan-card-header">
                  <div className="loan-status-badge" style={{ background: statusColor }}>
                    {statusIcon} {loan.status}
                  </div>
                  <div className="loan-code">{loan.kodePinjam}</div>
                </div>

                <div className="loan-card-body">
                  <div className="loan-info-row">
                    <span className="label">📖 Buku:</span>
                    <span className="value"><strong>{loan.bookTitle}</strong></span>
                  </div>
                  <div className="loan-info-row">
                    <span className="label">👤 Peminjam:</span>
                    <span className="value">{loan.borrowerName} ({loan.npm})</span>
                  </div>
                  <div className="loan-info-row">
                    <span className="label">📅 Dipinjam:</span>
                    <span className="value">
                      {new Date(loan.loanDate).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="loan-info-row">
                    <span className="label">⏰ Tenggat:</span>
                    <span className="value">
                      {new Date(loan.expectedReturnDate).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="countdown-section" style={{ background: `${statusColor}15` }}>
                    <div className="countdown-label">Sisa Waktu</div>
                    <div className="countdown-value" style={{ color: statusColor }}>
                      {isOverdue ? (
                        <>
                          <strong style={{ fontSize: '2rem' }}>{Math.abs(daysRemaining)}</strong>
                          <span style={{ fontSize: '0.9rem', marginLeft: '4px' }}>hari terlambat</span>
                        </>
                      ) : (
                        <>
                          <strong style={{ fontSize: '2rem' }}>{daysRemaining}</strong>
                          <span style={{ fontSize: '0.9rem', marginLeft: '4px' }}>hari lagi</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="loan-card-footer">
                  <button 
                    className="btn btn-sm btn-warning"
                    onClick={() => sendReminder(loan.id, loan.borrowerName)}
                    disabled={!isOverdue && daysRemaining > 1}
                  >
                    📢 Kirim Peringatan
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminActiveLoansPage;
