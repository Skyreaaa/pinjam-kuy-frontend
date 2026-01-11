import React, { useState, useEffect } from 'react';
import { userApi } from '../../services/api';
import { FaArrowLeft, FaBook, FaUndo, FaMoneyBillWave, FaCheckCircle, FaClock, FaTimesCircle, FaTimes, FaMapMarkerAlt, FaImage } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './ActivityHistory.css';

interface Activity {
  type: 'loan_request' | 'return' | 'return_rejected' | 'fine_payment';
  date: string;
  loanId?: number;
  paymentId?: number;
  kodePinjam?: string;
  bookTitle?: string;
  kodeBuku?: string;
  author?: string;
  publisher?: string;
  category?: string;
  status?: string;
  loanDate?: string;
  expectedReturnDate?: string;
  actualReturnDate?: string;
  returnProofUrl?: string;
  returnProofMetadata?: any;
  rejectionReason?: string;
  adminRejectionProof?: string;
  fineAmount?: number;
  finePaid?: boolean;
  fineReason?: string;
  method?: string;
  amount?: number;
  verifiedAt?: string;
  adminNotes?: string;
  description: string;
}

interface ActivityResponse {
  success: boolean;
  activities: Activity[];
  totalActivities: number;
  periodStart: string;
  periodEnd: string;
}

const ActivityHistory: React.FC = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'loan_request' | 'return' | 'return_rejected'>('all');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchActivityHistory();
  }, []);

  const fetchActivityHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[ActivityHistory] Fetching activity history...');
      const response = await userApi.get<ActivityResponse>('/loans/activity-history');
      
      console.log('[ActivityHistory] Response:', response.data);
      
      if (response.data.success) {
        setActivities(response.data.activities);
        console.log('[ActivityHistory] Loaded activities:', response.data.activities.length);
      }
    } catch (err: any) {
      console.error('[ActivityHistory] Failed to fetch:', err);
      setError(err.response?.data?.message || 'Gagal memuat riwayat aktivitas');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'loan_request':
        return <FaBook className="activity-icon loan" />;
      case 'return':
        return <FaUndo className="activity-icon return" />;
      case 'return_rejected':
        return <FaTimesCircle className="activity-icon rejected" />;
      case 'fine_payment':
        return <FaMoneyBillWave className="activity-icon payment" />;
      default:
        return null;
    }
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'loan_request':
        return 'Peminjaman';
      case 'return':
        return 'Pengembalian';
      case 'return_rejected':
        return 'Pengembalian Ditolak';
      case 'fine_payment':
        return 'Pembayaran Denda';
      default:
        return type;
    }
  };

  const getStatusBadge = (activity: Activity) => {
    if (activity.type === 'fine_payment') {
      if (activity.status === 'approved') {
        return <span className="status-badge approved"><FaCheckCircle /> Disetujui</span>;
      } else if (activity.status === 'pending') {
        return <span className="status-badge pending"><FaClock /> Menunggu</span>;
      } else if (activity.status === 'rejected') {
        return <span className="status-badge rejected"><FaTimesCircle /> Ditolak</span>;
      }
    }
    
    if (activity.status) {
      return <span className="status-badge neutral">{activity.status}</span>;
    }
    
    return null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    const time = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) {
      return `Hari ini, ${time}`;
    } else if (isYesterday) {
      return `Kemarin, ${time}`;
    } else {
      return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const filteredActivities = filter === 'all' 
    ? activities.filter(a => a.type !== 'fine_payment')
    : activities.filter(a => a.type === filter);

  const handleShowDetail = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="activity-history-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Memuat riwayat aktivitas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-history-page">
      <button 
        className="back-button-v5" 
        onClick={() => navigate('/profile')}
        title="Kembali ke Profile"
      >
        <FaArrowLeft />
      </button>

      <div className="page-header">
        <h1>📋 Riwayat Aktivitas</h1>
        <p className="subtitle">Aktivitas 2 bulan terakhir</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="filter-tabs">
        <button 
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Semua ({activities.filter(a => a.type !== 'fine_payment').length})
        </button>
        <button 
          className={`filter-tab ${filter === 'loan_request' ? 'active' : ''}`}
          onClick={() => setFilter('loan_request')}
        >
          Peminjaman ({activities.filter(a => a.type === 'loan_request').length})
        </button>
        <button 
          className={`filter-tab ${filter === 'return' ? 'active' : ''}`}
          onClick={() => setFilter('return')}
        >
          Pengembalian ({activities.filter(a => a.type === 'return').length})
        </button>
        <button 
          className={`filter-tab ${filter === 'return_rejected' ? 'active' : ''}`}
          onClick={() => setFilter('return_rejected')}
        >
          Ditolak ({activities.filter(a => a.type === 'return_rejected').length})
        </button>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="empty-state">
          <p>Tidak ada aktivitas dalam 2 bulan terakhir</p>
        </div>
      ) : (
        <div className="activity-timeline">
          {filteredActivities.map((activity, index) => (
            <div key={`${activity.type}-${activity.loanId || activity.paymentId}-${index}`} className="activity-item">
              <div className="activity-icon-wrapper">
                {getActivityIcon(activity.type)}
              </div>
              <div className="activity-content">
                <div className="activity-header">
                  <span className="activity-type">{getActivityTypeLabel(activity.type)}</span>
                  <span className="activity-date">{formatDate(activity.date)}</span>
                </div>
                <p className="activity-description">{activity.description}</p>
                {activity.kodePinjam && (
                  <div className="activity-meta">
                    <span className="kode-pinjam">Kode: {activity.kodePinjam}</span>
                  </div>
                )}
                {activity.author && (
                  <div className="activity-meta">
                    <span className="author">Penulis: {activity.author}</span>
                  </div>
                )}
                {getStatusBadge(activity) && (
                  <div className="activity-status">
                    {getStatusBadge(activity)}
                  </div>
                )}
                {activity.adminNotes && (
                  <div className="admin-notes">
                    <strong>Catatan Admin:</strong> {activity.adminNotes}
                  </div>
                )}
                <button 
                  className="detail-button"
                  onClick={() => handleShowDetail(activity)}
                >
                  Lihat Detail
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detail */}
      {showDetailModal && selectedActivity && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content-detail" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowDetailModal(false)}>
              <FaTimes />
            </button>
            
            <h2>📖 Detail Aktivitas</h2>
            
            <div className="detail-section">
              <h3>Informasi Buku</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Judul:</span>
                  <span className="detail-value">{selectedActivity.bookTitle}</span>
                </div>
                {selectedActivity.kodeBuku && (
                  <div className="detail-item">
                    <span className="detail-label">Kode Buku:</span>
                    <span className="detail-value">{selectedActivity.kodeBuku}</span>
                  </div>
                )}
                {selectedActivity.kodePinjam && (
                  <div className="detail-item">
                    <span className="detail-label">Kode Pinjam:</span>
                    <span className="detail-value">{selectedActivity.kodePinjam}</span>
                  </div>
                )}
                {selectedActivity.author && (
                  <div className="detail-item">
                    <span className="detail-label">Penulis:</span>
                    <span className="detail-value">{selectedActivity.author}</span>
                  </div>
                )}
                {selectedActivity.publisher && (
                  <div className="detail-item">
                    <span className="detail-label">Penerbit:</span>
                    <span className="detail-value">{selectedActivity.publisher}</span>
                  </div>
                )}
                {selectedActivity.category && (
                  <div className="detail-item">
                    <span className="detail-label">Kategori:</span>
                    <span className="detail-value">{selectedActivity.category}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="detail-section">
              <h3>Waktu Peminjaman</h3>
              <div className="detail-grid">
                {selectedActivity.loanDate && (
                  <div className="detail-item">
                    <span className="detail-label">Tanggal Pinjam:</span>
                    <span className="detail-value">{new Date(selectedActivity.loanDate).toLocaleString('id-ID')}</span>
                  </div>
                )}
                {selectedActivity.expectedReturnDate && (
                  <div className="detail-item">
                    <span className="detail-label">Target Kembali:</span>
                    <span className="detail-value">{new Date(selectedActivity.expectedReturnDate).toLocaleString('id-ID')}</span>
                  </div>
                )}
                {selectedActivity.actualReturnDate && (
                  <div className="detail-item">
                    <span className="detail-label">Dikembalikan:</span>
                    <span className="detail-value">{new Date(selectedActivity.actualReturnDate).toLocaleString('id-ID')}</span>
                  </div>
                )}
                {selectedActivity.status && (
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">{selectedActivity.status}</span>
                  </div>
                )}
              </div>
            </div>

            {selectedActivity.returnProofUrl && (
              <div className="detail-section">
                <h3><FaImage /> Bukti Pengembalian</h3>
                <div className="proof-container">
                  <img 
                    src={selectedActivity.returnProofUrl} 
                    alt="Bukti Pengembalian" 
                    className="proof-image"
                  />
                  {selectedActivity.returnProofMetadata && (
                    <div className="proof-metadata">
                      {selectedActivity.returnProofMetadata.lat && selectedActivity.returnProofMetadata.lng && (
                        <div className="metadata-item">
                          <FaMapMarkerAlt /> 
                          Lokasi: {selectedActivity.returnProofMetadata.lat.toFixed(5)}, {selectedActivity.returnProofMetadata.lng.toFixed(5)}
                        </div>
                      )}
                      {selectedActivity.returnProofMetadata.time && (
                        <div className="metadata-item">
                          <FaClock /> 
                          Waktu: {selectedActivity.returnProofMetadata.time}
                        </div>
                      )}
                      {selectedActivity.returnProofMetadata.accuracy && (
                        <div className="metadata-item">
                          Akurasi: ±{selectedActivity.returnProofMetadata.accuracy}m
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedActivity.type === 'return_rejected' && selectedActivity.rejectionReason && (
              <div className="detail-section">
                <h3><FaTimesCircle /> Alasan Penolakan</h3>
                <div className="rejection-reason">
                  {selectedActivity.rejectionReason}
                </div>
              </div>
            )}

            {selectedActivity.adminRejectionProof && (
              <div className="detail-section">
                <h3><FaImage /> Bukti Penolakan Admin</h3>
                <div className="proof-container">
                  <img 
                    src={selectedActivity.adminRejectionProof} 
                    alt="Bukti Penolakan Admin" 
                    className="proof-image admin-rejection-proof"
                    onClick={() => window.open(selectedActivity.adminRejectionProof, '_blank')}
                    style={{ cursor: 'pointer', border: '2px solid #e53935' }}
                    title="Klik untuk memperbesar"
                  />
                  <p className="admin-proof-info">
                    📸 Bukti penolakan yang diupload oleh admin. Klik untuk memperbesar.
                  </p>
                </div>
              </div>
            )}

            {selectedActivity.fineAmount && selectedActivity.fineAmount > 0 && (
              <div className="detail-section">
                <h3>Informasi Denda</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Jumlah Denda:</span>
                    <span className="detail-value">Rp {selectedActivity.fineAmount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">{selectedActivity.finePaid ? 'Lunas' : 'Belum Lunas'}</span>
                  </div>
                  {selectedActivity.fineReason && (
                    <div className="detail-item">
                      <span className="detail-label">Alasan:</span>
                      <span className="detail-value">{selectedActivity.fineReason}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityHistory;
