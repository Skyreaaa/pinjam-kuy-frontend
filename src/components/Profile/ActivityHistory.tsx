import React, { useState, useEffect } from 'react';
import { userApi } from '../../services/api';
import { FaArrowLeft, FaBook, FaUndo, FaMoneyBillWave, FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './ActivityHistory.css';

interface Activity {
  type: 'loan_request' | 'return' | 'fine_payment';
  date: string;
  loanId?: number;
  paymentId?: number;
  kodePinjam?: string;
  bookTitle?: string;
  author?: string;
  status?: string;
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
  const [filter, setFilter] = useState<'all' | 'loan_request' | 'return' | 'fine_payment'>('all');

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
    ? activities 
    : activities.filter(a => a.type === filter);

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
          Semua ({activities.length})
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
          className={`filter-tab ${filter === 'fine_payment' ? 'active' : ''}`}
          onClick={() => setFilter('fine_payment')}
        >
          Pembayaran ({activities.filter(a => a.type === 'fine_payment').length})
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityHistory;
