import React, { useState, useEffect } from 'react';
import { FaBook, FaUser, FaClock, FaMapMarkerAlt, FaCheckCircle, FaTimesCircle, FaImage, FaSpinner, FaCalendarAlt, FaSyncAlt } from 'react-icons/fa';
import { adminApiAxios } from '../../services/api';
import AlertModal from '../common/AlertModal';
import ConfirmModal from '../common/ConfirmModal';
import PromptModal from '../common/PromptModal';
import './AdminReturnsReviewPage.css';

interface ReturnProofMetadata {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  captureTime?: string;
  address?: string;
}

interface ReturnForReview {
  loanId: number;
  userId: number;
  bookId: number;
  userName: string;
  userNpm: string;
  bookTitle: string;
  kodePinjam: string;
  loanDate: string;
  returnDate: string;
  status: string;
  proofUrl: string | null;
  returnProofMetadata: ReturnProofMetadata | null;
}

// Modal untuk Reject dengan form reason + fine + admin proof upload
const RejectFormModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, fineAmount: number, adminProofFile?: File) => void;
  processing: boolean;
}> = ({ open, onClose, onConfirm, processing }) => {
  const [reason, setReason] = React.useState('');
  const [fine, setFine] = React.useState(0);
  const [adminProofFile, setAdminProofFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setAdminProofFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      alert('Silakan pilih file gambar (JPG, PNG)');
    }
  };

  const clearFile = () => {
    setAdminProofFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  if (!open) return null;

  const handleSubmit = () => {
    if (!reason.trim()) {
      alert('Alasan penolakan harus diisi!');
      return;
    }
    onConfirm(reason, fine, adminProofFile || undefined);
    setReason('');
    setFine(0);
    clearFile();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      zIndex: 10000,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="modal-content-form" onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 500,
        background: '#fff',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        position: 'relative'
      }}>
        <button className="close-modal-btn" onClick={onClose} style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'transparent',
          border: 'none',
          fontSize: 24,
          cursor: 'pointer',
          color: '#999'
        }}>✕</button>
        <h2 style={{color: '#dc3545', marginBottom: 20}}>❌ Tolak Pengembalian</h2>
        
        <div style={{marginBottom: 20}}>
          <label style={{display: 'block', fontWeight: 600, marginBottom: 8}}>Alasan Penolakan (Wajib):</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Foto tidak jelas, lokasi tidak sesuai dengan perpustakaan..."
            rows={4}
            style={{width: '100%', padding: 10, fontSize: 14, borderRadius: 8, border: '1px solid #ddd'}}
            required
          />
        </div>

        <div style={{marginBottom: 20}}>
          <label style={{display: 'block', fontWeight: 600, marginBottom: 8}}>Denda (Opsional):</label>
          <input
            type="number"
            value={fine}
            onChange={(e) => setFine(Number(e.target.value))}
            placeholder="0"
            min="0"
            style={{width: '100%', padding: 10, fontSize: 14, borderRadius: 8, border: '1px solid #ddd'}}
          />
          <small style={{color: '#666'}}>Kosongkan jika tidak ada denda</small>
        </div>

        <div style={{marginBottom: 20}}>
          <label style={{display: 'block', fontWeight: 600, marginBottom: 8}}>📸 Bukti Penolakan (Opsional):</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{
              width: '100%', 
              padding: 8, 
              fontSize: 14, 
              borderRadius: 8, 
              border: '1px solid #ddd',
              marginBottom: 8
            }}
          />
          <small style={{color: '#666'}}>Upload foto sebagai bukti penolakan (JPG/PNG)</small>
          
          {previewUrl && (
            <div style={{marginTop: 12, textAlign: 'center'}}>
              <img 
                src={previewUrl} 
                alt="Preview" 
                style={{
                  maxWidth: '100%', 
                  maxHeight: 200, 
                  borderRadius: 8, 
                  border: '2px solid #ddd'
                }} 
              />
              <div style={{marginTop: 8}}>
                <button
                  type="button"
                  onClick={clearFile}
                  style={{
                    background: '#f5222d',
                    color: 'white',
                    border: 'none',
                    padding: '4px 12px',
                    borderRadius: 4,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  Hapus Foto
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{display: 'flex', gap: 10, justifyContent: 'flex-end'}}>
          <button 
            onClick={onClose}
            style={{padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer'}}
            disabled={processing}
          >
            Batal
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!reason.trim() || processing}
            style={{
              padding: '10px 20px', 
              borderRadius: 8, 
              border: 'none', 
              background: reason.trim() ? '#dc3545' : '#ccc', 
              color: '#fff',
              cursor: reason.trim() ? 'pointer' : 'not-allowed',
              fontWeight: 600
            }}
          >
            {processing ? 'Memproses...' : 'Tolak & Kirim Notifikasi'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal untuk Approve dengan opsi fine
const ApproveFormModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: (fineAmount: number, fineReason: string) => void;
  processing: boolean;
}> = ({ open, onClose, onConfirm, processing }) => {
  const [withFine, setWithFine] = React.useState(false);
  const [fine, setFine] = React.useState(0);
  const [fineReason, setFineReason] = React.useState('');

  if (!open) return null;

  const handleSubmit = () => {
    if (withFine && (!fine || !fineReason.trim())) {
      alert('Jika memberikan denda, jumlah dan alasan wajib diisi!');
      return;
    }
    onConfirm(withFine ? fine : 0, withFine ? fineReason : '');
    setWithFine(false);
    setFine(0);
    setFineReason('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      zIndex: 10000,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="modal-content-form" onClick={(e) => e.stopPropagation()} style={{
        maxWidth: 500,
        background: '#fff',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        position: 'relative'
      }}>
        <button className="close-modal-btn" onClick={onClose} style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'transparent',
          border: 'none',
          fontSize: 24,
          cursor: 'pointer',
          color: '#999'
        }}>✕</button>
        <h2 style={{color: '#28a745', marginBottom: 20}}>✅ Setujui Pengembalian</h2>
        
        <div style={{marginBottom: 20}}>
          <label style={{display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer'}}>
            <input
              type="checkbox"
              checked={withFine}
              onChange={(e) => setWithFine(e.target.checked)}
              style={{width: 18, height: 18}}
            />
            <span style={{fontWeight: 600}}>Berikan Denda</span>
          </label>
          <small style={{color: '#666', marginLeft: 28}}>Centang jika ada denda tambahan (kerusakan, dll)</small>
        </div>

        {withFine && (
          <>
            <div style={{marginBottom: 20}}>
              <label style={{display: 'block', fontWeight: 600, marginBottom: 8}}>Jumlah Denda:</label>
              <input
                type="number"
                value={fine}
                onChange={(e) => setFine(Number(e.target.value))}
                placeholder="50000"
                min="0"
                style={{width: '100%', padding: 10, fontSize: 14, borderRadius: 8, border: '1px solid #ddd'}}
                required
              />
            </div>

            <div style={{marginBottom: 20}}>
              <label style={{display: 'block', fontWeight: 600, marginBottom: 8}}>Alasan Denda:</label>
              <textarea
                value={fineReason}
                onChange={(e) => setFineReason(e.target.value)}
                placeholder="Contoh: Buku rusak/hilang halaman, terlambat 5 hari..."
                rows={3}
                style={{width: '100%', padding: 10, fontSize: 14, borderRadius: 8, border: '1px solid #ddd'}}
                required
              />
            </div>
          </>
        )}

        <div style={{display: 'flex', gap: 10, justifyContent: 'flex-end'}}>
          <button 
            onClick={onClose}
            style={{padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer'}}
            disabled={processing}
          >
            Batal
          </button>
          <button 
            onClick={handleSubmit}
            disabled={processing}
            style={{
              padding: '10px 20px', 
              borderRadius: 8, 
              border: 'none', 
              background: '#28a745', 
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {processing ? 'Memproses...' : 'Setujui & Kirim Notifikasi'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminReturnsReviewPage: React.FC = () => {
  const [returns, setReturns] = useState<ReturnForReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ready'>('ready');
  
  // Modal states
  const [detailModal, setDetailModal] = useState<{open: boolean; item: ReturnForReview | null}>({ open: false, item: null });
  const [alertModal, setAlertModal] = useState<{open: boolean; title?: string; message: string; type?: 'success'|'error'|'warning'|'info'}>({ open: false, message: '' });
  const [confirmModal, setConfirmModal] = useState<{open: boolean; loanId?: number; title?: string; message: string}>({ open: false, message: '' });
  const [promptModal, setPromptModal] = useState<{open: boolean; loanId?: number}>({ open: false });
  const [rejectModal, setRejectModal] = useState<{open: boolean; loanId?: number}>({ open: false });
  const [approveModal, setApproveModal] = useState<{open: boolean; loanId?: number}>({ open: false });

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const response = await adminApiAxios.get('/admin/returns/review');
      setReturns(response.data.returns || []);
    } catch (error) {
      console.error('Failed to fetch returns:', error);
      setAlertModal({ open: true, message: 'Gagal memuat data pengembalian', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (loanId: number) => {
    setDetailModal({ open: false, item: null }); // Tutup modal detail dulu
    setApproveModal({ open: true, loanId });
  };

  const confirmApprove = async (fineAmount: number, fineReason: string) => {
    const loanId = approveModal.loanId;
    if (!loanId) return;
    
    setProcessing(true);
    try {
      await adminApiAxios.post(`/admin/returns/process`, { loanId, manualFineAmount: fineAmount, fineReason });
      setAlertModal({ open: true, message: 'Pengembalian berhasil disetujui!', type: 'success' });
      setApproveModal({ open: false });
      fetchReturns();
    } catch (error) {
      console.error('Failed to approve return:', error);
      setAlertModal({ open: true, message: 'Gagal menyetujui pengembalian', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = (loanId: number) => {
    setDetailModal({ open: false, item: null }); // Tutup modal detail dulu
    setRejectModal({ open: true, loanId });
  };

  const confirmReject = async (reason: string, fineAmount: number, adminProofFile?: File) => {
    const loanId = rejectModal.loanId;
    if (!loanId) return;
    
    setProcessing(true);
    try {
      // Prepare FormData for file upload
      const formData = new FormData();
      formData.append('loanId', loanId.toString());
      formData.append('reason', reason);
      formData.append('fineAmount', fineAmount.toString());
      
      if (adminProofFile) {
        formData.append('adminProof', adminProofFile);
      }

      await adminApiAxios.post(`/admin/returns/reject`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setAlertModal({ open: true, message: 'Pengembalian ditolak dan bukti tersimpan', type: 'warning' });
      setRejectModal({ open: false });
      fetchReturns();
    } catch (error) {
      console.error('Failed to reject return:', error);
      setAlertModal({ open: true, message: 'Gagal menolak pengembalian', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const filteredReturns = filter === 'ready' 
    ? returns.filter(r => r.status === 'Siap Dikembalikan')
    : returns;

  if (loading) {
    return (
      <div className="admin-returns-loading">
        <FaSpinner className="spinner" />
        <p>Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="admin-returns-review-page">
      <div className="page-header">
        <h1>Review Pengembalian Buku</h1>
        <p>Verifikasi bukti pengembalian dari user</p>
      </div>

      <div className="filter-tabs">
        <button 
          className={filter === 'ready' ? 'active' : ''} 
          onClick={() => setFilter('ready')}
        >
          Siap Dikembalikan ({returns.filter(r => r.status === 'Siap Dikembalikan').length})
        </button>
        <button 
          className={filter === 'all' ? 'active' : ''} 
          onClick={() => setFilter('all')}
        >
          Semua ({returns.length})
        </button>
        <button 
          className="refresh-btn"
          onClick={() => fetchReturns()}
          disabled={loading}
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            background: loading ? '#ccc' : '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 600,
            fontSize: 14
          }}
        >
          <FaSyncAlt className={loading ? 'spin' : ''} /> Refresh Data
        </button>
      </div>

      {filteredReturns.length === 0 ? (
        <div className="empty-state">
          <FaCheckCircle size={60} />
          <h3>Tidak Ada Pengembalian</h3>
          <p>Belum ada bukti pengembalian yang perlu direview</p>
        </div>
      ) : (
        <div className="returns-grid">
          {filteredReturns.map((item) => {
            const metadata = item.returnProofMetadata;
            
            return (
              <div key={item.loanId} className="return-card">
                <div className="card-header">
                  <div className="book-info">
                    <FaBook className="icon" />
                    <div>
                      <h3>{item.bookTitle}</h3>
                      <span className="kode-pinjam">{item.kodePinjam}</span>
                    </div>
                  </div>
                  <span className={`status-badge ${item.status.replace(/\s/g, '-').toLowerCase()}`}>
                    {item.status}
                  </span>
                </div>

                <div className="card-body">
                  <div className="user-info">
                    <FaUser className="icon" />
                    <div>
                      <strong>{item.userName}</strong>
                      <span>NPM: {item.userNpm}</span>
                    </div>
                  </div>

                  <div className="dates-info">
                    <div className="date-item">
                      <FaCalendarAlt className="icon" />
                      <span>Pinjam: {new Date(item.loanDate).toLocaleDateString('id-ID')}</span>
                    </div>
                    <div className="date-item">
                      <FaClock className="icon" />
                      <span>Batas: {new Date(item.returnDate).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </div>

                <div className="card-actions">
                  <button 
                    className="detail-btn"
                    onClick={() => setDetailModal({ open: true, item })}
                  >
                    <FaImage /> Lihat Detail
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {detailModal.open && detailModal.item && (
        <div className="detail-modal-overlay" onClick={() => setDetailModal({ open: false, item: null })}>
          <div className="detail-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setDetailModal({ open: false, item: null })}>
              ✕
            </button>
            
            <h2 className="modal-title">Detail Pengembalian Buku</h2>
            
            {/* Foto Bukti */}
            {detailModal.item.proofUrl && (
              <div className="proof-image-section">
                <h3>Bukti Pengembalian</h3>
                <img src={detailModal.item.proofUrl} alt="Bukti" className="proof-full-image" />
              </div>
            )}

            {/* Info Detail */}
            <div className="detail-info-grid">
              <div className="info-row">
                <label>Nama Buku:</label>
                <span>{detailModal.item.bookTitle}</span>
              </div>
              <div className="info-row">
                <label>Kode Peminjaman:</label>
                <span className="code-highlight">{detailModal.item.kodePinjam}</span>
              </div>
              <div className="info-row">
                <label>Peminjam:</label>
                <span>{detailModal.item.userName}</span>
              </div>
              <div className="info-row">
                <label>NPM:</label>
                <span>{detailModal.item.userNpm}</span>
              </div>
              <div className="info-row">
                <label>Tanggal Diambil:</label>
                <span>
                  {new Date(detailModal.item.loanDate).toLocaleString('id-ID', {
                    dateStyle: 'full',
                    timeStyle: 'short'
                  })}
                </span>
              </div>
              <div className="info-row">
                <label>Batas Pengembalian:</label>
                <span>
                  {new Date(detailModal.item.returnDate).toLocaleString('id-ID', {
                    dateStyle: 'full',
                    timeStyle: 'short'
                  })}
                </span>
              </div>

              {/* Metadata */}
              {detailModal.item.returnProofMetadata && (
                <>
                  {detailModal.item.returnProofMetadata.captureTime && (
                    <div className="info-row">
                      <label>Waktu Upload:</label>
                      <span>
                        {new Date(detailModal.item.returnProofMetadata.captureTime).toLocaleString('id-ID', {
                          dateStyle: 'full',
                          timeStyle: 'medium'
                        })}
                      </span>
                    </div>
                  )}
                  {detailModal.item.returnProofMetadata.latitude && detailModal.item.returnProofMetadata.longitude && (
                    <div className="info-row">
                      <label>Koordinat GPS:</label>
                      <span>
                        {detailModal.item.returnProofMetadata.latitude.toFixed(5)}, {detailModal.item.returnProofMetadata.longitude.toFixed(5)}
                        {detailModal.item.returnProofMetadata.accuracy && ` (±${Math.round(detailModal.item.returnProofMetadata.accuracy)}m)`}
                      </span>
                    </div>
                  )}
                  {detailModal.item.returnProofMetadata.address && (
                    <div className="info-row">
                      <label>Lokasi:</label>
                      <span>📍 {detailModal.item.returnProofMetadata.address}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="modal-actions">
              <button 
                className="btn-reject-modal"
                onClick={() => {
                  handleReject(detailModal.item!.loanId);
                }}
                disabled={processing}
              >
                <FaTimesCircle /> Tolak
              </button>
              <button 
                className="btn-approve-modal"
                onClick={() => {
                  handleApprove(detailModal.item!.loanId);
                }}
                disabled={processing}
              >
                <FaCheckCircle /> {processing ? 'Memproses...' : 'Setujui Pengembalian'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        open={alertModal.open}
        onClose={() => setAlertModal({ open: false, message: '' })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Reject Modal with Reason + Fine */}
      {rejectModal.open && (
        <RejectFormModal
          open={rejectModal.open}
          onClose={() => setRejectModal({ open: false })}
          onConfirm={confirmReject}
          processing={processing}
        />
      )}

      {/* Approve Modal with Fine Option */}
      {approveModal.open && (
        <ApproveFormModal
          open={approveModal.open}
          onClose={() => setApproveModal({ open: false })}
          onConfirm={confirmApprove}
          processing={processing}
        />
      )}
    </div>
  );
};

export default AdminReturnsReviewPage;

