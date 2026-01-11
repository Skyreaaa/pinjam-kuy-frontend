import React, { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaQrcode, FaUniversity, FaStore, FaArrowLeft, FaImage, FaTimes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../services/api';
import { QRCodeCanvas } from 'qrcode.react';
import './FinePaymentPage.css';

interface FineDetail {
  loanId: number;
  bookTitle: string;
  kodePinjam: string;
  loanDate: string;
  returnDate: string;
  fineAmount: number;
  fineReason: string;
  returnProofUrl: string;
}

interface PaymentHistory {
  id: number;
  method: string;
  amount_total: number;
  status: string;
  created_at: string;
  admin_notes?: string;
  proof_url?: string;
  account_name?: string;
  bank_name?: string;
}

const FinePaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pembayaran' | 'riwayat'>('pembayaran');
  const [fines, setFines] = useState<FineDetail[]>([]);
  const [selectedFines, setSelectedFines] = useState<number[]>([]); // Selected loan IDs
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [totalFine, setTotalFine] = useState(0);
  const [selectedTotal, setSelectedTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState<string | null>(null);
  const [hasPendingPayment, setHasPendingPayment] = useState(false);
  
  // Helper: Convert proof URL to Cloudinary URL
  const getProofUrl = (url?: string) => {
    if (!url) return null;
    
    console.log('[getProofUrl] Input:', url);
    
    // Already a full URL (http/https)
    if (url.startsWith('http')) {
      console.log('[getProofUrl] Already full URL:', url);
      return url;
    }
    
    const cloudName = 'dxew9tloz';
    
    // Clean the path: remove /uploads/ prefix and any duplicate folders
    let publicId = url.replace(/^\/uploads\//, '').replace(/^uploads\//, '');
    
    // Remove duplicate fine-proofs/ if exists
    publicId = publicId.replace(/^fine-proofs\/fine-proofs\//, 'fine-proofs/');
    
    // Construct Cloudinary URL with the clean public_id
    const cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`;
    console.log('[getProofUrl] Cloudinary URL:', cloudinaryUrl);
    return cloudinaryUrl;
  };
  
  // Bank transfer form
  const [bankForm, setBankForm] = useState({
    accountName: '',
    bankName: '',
    proofFile: null as File | null,
    proofPreview: ''
  });
  
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    fetchFines();
    fetchPaymentHistory();
  }, []);

  const fetchFines = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const response = await userApi.get('/loans/user-loans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('💰 [FinePaymentPage] All loans:', response.data);
      console.log('💰 [FinePaymentPage] Loans with fines:', response.data.filter((loan: any) => loan.fineAmount > 0));
      
      // Filter loans dengan denda yang belum dibayar
      // Handle finePaid as number (0) or boolean (false) or null/undefined
      const finesData: FineDetail[] = response.data.filter((loan: any) => {
        const hasFine = loan.fineAmount > 0;
        // Check if finePaid is 0, false, null, or undefined (all mean "unpaid")
        const isUnpaid = !loan.finePaid || loan.finePaid === 0 || loan.finePaid == null;
        const isReturned = loan.status === 'Dikembalikan';
        
        console.log(`💰 [FinePaymentPage] Loan ${loan.id} - hasFine: ${hasFine}, isUnpaid: ${isUnpaid}, isReturned: ${isReturned}`, {
          fineAmount: loan.fineAmount,
          finePaid: loan.finePaid,
          finePaidType: typeof loan.finePaid,
          status: loan.status
        });
        
        return hasFine && isUnpaid && isReturned;
      }).map((loan: any) => ({
        loanId: loan.id,
        bookTitle: loan.bookTitle,
        kodePinjam: loan.kodePinjam,
        loanDate: loan.loanDate,
        returnDate: loan.actualReturnDate,
        fineAmount: loan.fineAmount,
        fineReason: loan.fineReason || 'Denda keterlambatan',
        returnProofUrl: loan.returnProofUrl
      }));
      
      console.log('💰 [FinePaymentPage] Filtered fines data:', finesData);
      
      setFines(finesData);
      setTotalFine(finesData.reduce((sum, f) => sum + f.fineAmount, 0));
      // Auto-select all fines by default
      setSelectedFines(finesData.map(f => f.loanId));
      setSelectedTotal(finesData.reduce((sum, f) => sum + f.fineAmount, 0));
    } catch (error) {
      console.error('Failed to fetch fines:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const response = await userApi.get('/loans/payment-history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPaymentHistory(response.data);
      
      // Check if there's any pending payment
      const pending = response.data.some((p: PaymentHistory) => p.status === 'pending');
      setHasPendingPayment(pending);
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
    }
  };

  // Handle fine selection
  const handleSelectFine = (loanId: number) => {
    setSelectedFines(prev => {
      const newSelected = prev.includes(loanId)
        ? prev.filter(id => id !== loanId)
        : [...prev, loanId];
      
      // Calculate new total
      const newTotal = fines
        .filter(f => newSelected.includes(f.loanId))
        .reduce((sum, f) => sum + f.fineAmount, 0);
      setSelectedTotal(newTotal);
      
      return newSelected;
    });
  };

  // Select all fines
  const handleSelectAll = () => {
    if (selectedFines.length === fines.length) {
      // Unselect all
      setSelectedFines([]);
      setSelectedTotal(0);
    } else {
      // Select all
      setSelectedFines(fines.map(f => f.loanId));
      setSelectedTotal(totalFine);
    }
  };

  const handlePaymentMethod = (method: 'qris' | 'bank' | 'cash') => {
    setShowMethodModal(false);
    if (method === 'qris') setShowQrisModal(true);
    else if (method === 'bank') setShowBankModal(true);
    else if (method === 'cash') setShowCashModal(true);
  };

  const handleBankFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBankForm(prev => ({ ...prev, proofFile: file, proofPreview: URL.createObjectURL(file) }));
    }
  };

  const submitBankPayment = async () => {
    if (!bankForm.accountName || !bankForm.proofFile) {
      alert('Nama rekening dan bukti transfer wajib diisi!');
      return;
    }

    if (selectedFines.length === 0) {
      alert('Pilih minimal 1 denda untuk dibayar!');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('method', 'bank_transfer');
      formData.append('accountName', bankForm.accountName);
      formData.append('bankName', bankForm.bankName);
      formData.append('proof', bankForm.proofFile);
      formData.append('loanIds', JSON.stringify(selectedFines));
      formData.append('totalAmount', selectedTotal.toString());

      const token = sessionStorage.getItem('token');
      await userApi.post('/loans/submit-fine-payment', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadSuccess(true);
      setTimeout(() => {
        setShowBankModal(false);
        setUploadSuccess(false);
        setActiveTab('riwayat'); // Pindah ke tab riwayat
        fetchFines(); // Refresh data
        fetchPaymentHistory(); // Refresh history
      }, 2000);
    } catch (error) {
      console.error('Failed to submit payment:', error);
      alert('Gagal mengirim bukti pembayaran. Silakan coba lagi.');
    } finally {
      setUploading(false);
    }
  };

  const submitQrisPayment = async () => {
    if (selectedFines.length === 0) {
      alert('Pilih minimal 1 denda untuk dibayar!');
      return;
    }

    setUploading(true);
    try {
      const token = sessionStorage.getItem('token');
      await userApi.post('/loans/submit-fine-payment', {
        method: 'qris',
        loanIds: selectedFines,
        totalAmount: selectedTotal
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUploadSuccess(true);
      setTimeout(() => {
        setShowQrisModal(false);
        setUploadSuccess(false);
        setActiveTab('riwayat'); // Pindah ke tab riwayat
        fetchPaymentHistory(); // Refresh history
        alert('Pembayaran QRIS berhasil diajukan! Cek tab Riwayat untuk status pembayaran.');
      }, 2000);
    } catch (error) {
      console.error('Failed to submit QRIS payment:', error);
      alert('Gagal. Silakan coba lagi.');
    } finally {
      setUploading(false);
    }
  };

  const submitCashPayment = async () => {
    if (selectedFines.length === 0) {
      alert('Pilih minimal 1 denda untuk dibayar!');
      return;
    }

    setUploading(true);
    try {
      const token = sessionStorage.getItem('token');
      await userApi.post('/loans/submit-fine-payment', {
        method: 'cash',
        loanIds: selectedFines,
        totalAmount: selectedTotal
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUploadSuccess(true);
      setTimeout(() => {
        setShowCashModal(false);
        setUploadSuccess(false);
        setActiveTab('riwayat'); // Pindah ke tab riwayat
        fetchPaymentHistory(); // Refresh history
        alert('Permintaan bayar di tempat berhasil diajukan! Cek tab Riwayat untuk status.');
        setUploadSuccess(false);
        alert('Permintaan pembayaran tunai berhasil! Silakan datang ke perpustakaan dan tunjukkan halaman ini ke admin.');
      }, 2000);
    } catch (error) {
      console.error('Failed to submit cash payment:', error);
      alert('Gagal. Silakan coba lagi.');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'pending') return <span className="status-badge pending">🟡 Menunggu Verifikasi</span>;
    if (status === 'approved') return <span className="status-badge approved">🟢 Disetujui</span>;
    if (status === 'rejected') return <span className="status-badge rejected">🔴 Ditolak</span>;
    return <span className="status-badge">{status}</span>;
  };

  const getMethodLabel = (method: string) => {
    if (method === 'qris') return 'QRIS';
    if (method === 'bank_transfer') return 'Transfer Bank';
    if (method === 'cash') return 'Bayar di Tempat';
    return method;
  };

  if (loading) {
    return (
      <div className="fine-payment-page">
        <div className="loading-state">
          <FaMoneyBillWave className="spin" size={48} />
          <p>Memuat data denda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fine-payment-page">
      {/* Tombol Back Bulat Kuning */}
      <button 
        className="back-button-v5" 
        onClick={() => navigate('/home')}
        title="Kembali ke Home"
      >
        <FaArrowLeft />
      </button>

      <div className="page-header">
        <h1><FaMoneyBillWave /> Pembayaran Denda</h1>
        {fines.length > 0 && (
          <div className="total-fine-info">
            <div className="total-fine-badge all">
              Total Semua Denda: <strong>Rp {totalFine.toLocaleString('id-ID')}</strong>
            </div>
            {selectedTotal > 0 && selectedTotal !== totalFine && (
              <div className="total-fine-badge selected">
                Denda Terpilih: <strong>Rp {selectedTotal.toLocaleString('id-ID')}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'pembayaran' ? 'active' : ''}`}
          onClick={() => setActiveTab('pembayaran')}
        >
          Pembayaran
        </button>
        <button 
          className={`tab-btn ${activeTab === 'riwayat' ? 'active' : ''}`}
          onClick={() => setActiveTab('riwayat')}
        >
          Riwayat Pembayaran
        </button>
      </div>

      {/* Tab Content: Pembayaran */}
      {activeTab === 'pembayaran' && (
        <>
          {fines.length === 0 ? (
            <div className="empty-state">
              <FaCheckCircle size={64} color="#52c41a" />
              <h2>Tidak Ada Denda</h2>
              <p>Selamat! Anda tidak memiliki denda yang harus dibayar.</p>
            </div>
          ) : (
            <>
              <div className="fines-table-container">
                <div className="selection-controls">
                  <button 
                    className="btn-select-all"
                    onClick={handleSelectAll}
                  >
                    {selectedFines.length === fines.length ? '❌ Batal Pilih Semua' : '✅ Pilih Semua'}
                  </button>
                  <span className="selection-info">
                    {selectedFines.length} dari {fines.length} denda terpilih
                  </span>
                </div>

                <table className="fines-table">
                  <thead>
                    <tr>
                      <th style={{width: '50px'}}>Pilih</th>
                      <th>Kode Peminjaman</th>
                      <th>Judul Buku</th>
                      <th>Tanggal Pinjam</th>
                      <th>Tanggal Kembali</th>
                      <th>Alasan Denda</th>
                      <th>Jumlah Denda</th>
                      <th>Bukti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fines.map((fine) => (
                      <tr key={fine.loanId} className={selectedFines.includes(fine.loanId) ? 'selected-row' : ''}>
                        <td>
                          <input 
                            type="checkbox"
                            checked={selectedFines.includes(fine.loanId)}
                            onChange={() => handleSelectFine(fine.loanId)}
                            className="fine-checkbox"
                          />
                        </td>
                        <td><strong>{fine.kodePinjam}</strong></td>
                        <td>{fine.bookTitle}</td>
                        <td>{new Date(fine.loanDate).toLocaleDateString('id-ID')}</td>
                        <td>{new Date(fine.returnDate).toLocaleDateString('id-ID')}</td>
                        <td>{fine.fineReason}</td>
                        <td className="fine-amount">Rp {fine.fineAmount.toLocaleString('id-ID')}</td>
                        <td>
                          {fine.returnProofUrl && (
                            <button 
                              className="btn-view-proof"
                              onClick={() => setShowProofModal(fine.returnProofUrl)}
                            >
                              <FaImage /> Lihat
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6} style={{textAlign: 'right', fontWeight: 700}}>
                        Total Terpilih:
                      </td>
                      <td className="fine-amount" style={{fontWeight: 700, fontSize: 18}}>
                        Rp {selectedTotal.toLocaleString('id-ID')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {hasPendingPayment && (
                <div className="pending-payment-notice">
                  <FaExclamationTriangle /> Anda memiliki pembayaran yang menunggu verifikasi admin. Mohon tunggu hingga disetujui sebelum mengajukan pembayaran baru.
                </div>
              )}

              <div className="payment-action">
                <button 
                  className="btn-pay-now"
                  onClick={() => setShowMethodModal(true)}
                  disabled={hasPendingPayment || selectedFines.length === 0}
                >
                  <FaMoneyBillWave /> 
                  {hasPendingPayment 
                    ? 'Menunggu Verifikasi...' 
                    : selectedFines.length === 0 
                      ? 'Pilih Denda Terlebih Dahulu'
                      : `Bayar ${selectedFines.length} Denda (Rp ${selectedTotal.toLocaleString('id-ID')})`
                  }
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* Tab Content: Riwayat */}
      {activeTab === 'riwayat' && (
        <div className="payment-history-container">
          {paymentHistory.length === 0 ? (
            <div className="empty-state">
              <FaMoneyBillWave size={64} color="#999" />
              <h2>Belum Ada Riwayat</h2>
              <p>Anda belum pernah mengajukan pembayaran denda.</p>
            </div>
          ) : (
            <div className="history-list">
              {paymentHistory.map((payment) => (
                <div key={payment.id} className="history-item">
                  <div className="history-header">
                    <span className="payment-method">{getMethodLabel(payment.method)}</span>
                    {getStatusBadge(payment.status)}
                  </div>
                  <div className="history-body">
                    <div className="history-row">
                      <span className="label">Total Pembayaran:</span>
                      <span className="value">Rp {payment.amount_total.toLocaleString('id-ID')}</span>
                    </div>
                    {payment.account_name && (
                      <div className="history-row">
                        <span className="label">Atas Nama:</span>
                        <span className="value">{payment.account_name}</span>
                      </div>
                    )}
                    {payment.bank_name && (
                      <div className="history-row">
                        <span className="label">Bank:</span>
                        <span className="value">{payment.bank_name}</span>
                      </div>
                    )}
                    <div className="history-row">
                      <span className="label">Tanggal Pengajuan:</span>
                      <span className="value">{new Date(payment.created_at).toLocaleString('id-ID')}</span>
                    </div>
                    {payment.proof_url && (
                      <div className="history-row">
                        <button 
                          className="btn-view-proof"
                          onClick={() => setShowProofModal(getProofUrl(payment.proof_url) || '')}
                        >
                          <FaImage /> Lihat Bukti
                        </button>
                      </div>
                    )}
                    {payment.status === 'rejected' && payment.admin_notes && (
                      <div className="rejection-reason">
                        <strong>Alasan Ditolak:</strong> {payment.admin_notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Pilih Metode Pembayaran */}
      {showMethodModal && (
        <div className="modal-overlay" onClick={() => setShowMethodModal(false)}>
          <div className="modal-payment-method" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowMethodModal(false)}><FaTimes /></button>
            <h2>Pilih Metode Pembayaran</h2>
            <p className="modal-subtitle">Total: <strong>Rp {totalFine.toLocaleString('id-ID')}</strong></p>
            
            <div className="payment-methods">
              <button className="method-btn" onClick={() => handlePaymentMethod('qris')}>
                <FaQrcode size={32} />
                <span>QRIS</span>
                <small>Scan & bayar instant</small>
              </button>
              
              <button className="method-btn" onClick={() => handlePaymentMethod('bank')}>
                <FaUniversity size={32} />
                <span>Transfer Bank</span>
                <small>BCA, BNI, Mandiri, dll</small>
              </button>
              
              <button className="method-btn" onClick={() => handlePaymentMethod('cash')}>
                <FaStore size={32} />
                <span>Bayar di Tempat</span>
                <small>Bayar tunai ke admin</small>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QRIS */}
      {showQrisModal && (
        <div className="modal-overlay" onClick={() => setShowQrisModal(false)}>
          <div className="modal-qris" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowQrisModal(false)}><FaTimes /></button>
            <h2>Pembayaran QRIS</h2>
            <p className="amount-display">Rp {totalFine.toLocaleString('id-ID')}</p>
            
            <div className="qr-container">
              <QRCodeCanvas 
                value={`QRIS_PERPUS_${Date.now()}_${totalFine}`} 
                size={280}
                style={{background: '#fff', padding: 16, borderRadius: 12}}
              />
            </div>
            
            <div className="qris-instructions">
              <p>📱 Scan QR code dengan aplikasi:</p>
              <p>GoPay • OVO • Dana • ShopeePay • LinkAja</p>
            </div>

            {uploadSuccess ? (
              <div className="success-message">
                <FaCheckCircle /> Pembayaran berhasil dikonfirmasi!
              </div>
            ) : (
              <button 
                className="btn-confirm-payment"
                onClick={submitQrisPayment}
                disabled={uploading}
              >
                {uploading ? 'Memproses...' : 'Sudah Bayar'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal Bank Transfer */}
      {showBankModal && (
        <div className="modal-overlay" onClick={() => !uploading && setShowBankModal(false)}>
          <div className="modal-bank" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => !uploading && setShowBankModal(false)}><FaTimes /></button>
            <h2>Transfer Bank</h2>
            <p className="amount-display">Rp {totalFine.toLocaleString('id-ID')}</p>
            
            <div className="bank-info">
              <h3>Rekening Perpustakaan:</h3>
              <div className="bank-detail">
                <strong>Bank BCA</strong>
                <p>No. Rekening: <strong>1234567890</strong></p>
                <p>Atas Nama: <strong>PERPUSTAKAAN KAMPUS</strong></p>
              </div>
              <div className="bank-note">
                <FaExclamationTriangle /> Pastikan nominal transfer sesuai
              </div>
            </div>

            {!uploadSuccess ? (
              <div className="bank-form">
                <div className="form-group">
                  <label>Nama Rekening Pengirim *</label>
                  <input 
                    type="text"
                    placeholder="Masukkan nama lengkap sesuai rekening"
                    value={bankForm.accountName}
                    onChange={(e) => setBankForm({...bankForm, accountName: e.target.value})}
                    disabled={uploading}
                  />
                </div>

                <div className="form-group">
                  <label>Nama Bank Pengirim</label>
                  <input 
                    type="text"
                    placeholder="Contoh: BCA, BNI, Mandiri"
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({...bankForm, bankName: e.target.value})}
                    disabled={uploading}
                  />
                </div>

                <div className="form-group">
                  <label>Bukti Transfer *</label>
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleBankFileChange}
                    disabled={uploading}
                  />
                  {bankForm.proofPreview && (
                    <img src={bankForm.proofPreview} alt="Preview" className="proof-preview" />
                  )}
                </div>

                <button 
                  className="btn-submit-payment"
                  onClick={submitBankPayment}
                  disabled={uploading}
                >
                  {uploading ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
                </button>
              </div>
            ) : (
              <div className="success-message">
                <FaCheckCircle /> Bukti pembayaran berhasil dikirim!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Bayar di Tempat */}
      {showCashModal && (
        <div className="modal-overlay" onClick={() => setShowCashModal(false)}>
          <div className="modal-cash" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowCashModal(false)}><FaTimes /></button>
            <h2>Bayar di Tempat</h2>
            <p className="amount-display">Rp {totalFine.toLocaleString('id-ID')}</p>
            
            <div className="cash-instructions">
              <FaStore size={48} color="#1890ff" />
              <h3>Cara Pembayaran:</h3>
              <ol>
                <li>Datang ke Perpustakaan</li>
                <li>Tunjukkan halaman ini kepada Admin</li>
                <li>Admin akan memverifikasi dan memfoto bukti pembayaran</li>
                <li>Selesai! Denda Anda akan terhapus</li>
              </ol>
            </div>

            {uploadSuccess ? (
              <div className="success-message">
                <FaCheckCircle /> Permintaan berhasil dibuat!
              </div>
            ) : (
              <button 
                className="btn-confirm-cash"
                onClick={submitCashPayment}
                disabled={uploading}
              >
                {uploading ? 'Memproses...' : 'Konfirmasi Bayar di Tempat'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal Lihat Bukti Pengembalian */}
      {showProofModal && (
        <div className="modal-overlay" onClick={() => setShowProofModal(null)}>
          <div className="modal-proof-image" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowProofModal(null)}><FaTimes /></button>
            <img 
              src={showProofModal} 
              alt="Bukti Pembayaran" 
              onError={(e) => {
                console.error('Image load error:', showProofModal);
                // Fallback to backend URL if Cloudinary fails
                const backendUrl = process.env.REACT_APP_API_URL || 'https://pinjam-kuy-backend-production.up.railway.app';
                const target = e.target as HTMLImageElement;
                if (!target.src.includes(backendUrl)) {
                  // Try with backend URL as fallback
                  const originalUrl = paymentHistory.find(p => getProofUrl(p.proof_url) === showProofModal)?.proof_url;
                  if (originalUrl) {
                    target.src = `${backendUrl}${originalUrl}`;
                  }
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FinePaymentPage;
