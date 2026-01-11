
import React, { useState } from 'react';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import DashboardState from  './DashboardState';
import AdminUsersPage from './AdminUsersPage';
import AdminBooksPage from './AdminBooksPage';
import AdminActiveLoansPage from './AdminActiveLoansPage';
import BookModal from './BookModal';
import AdminReturnsReviewPage from './AdminReturnsReviewPage';
import AdminFinePaymentsPage from './AdminFinePaymentsPage';
import AdminHistoryPage from './AdminHistoryPage';
import AdminBroadcastPage from './AdminBroadcastPage';
import UserModal from './UserModal';
import ReturnProcessModal from './ReturnProcessModal';
import QRScanModal from './QRScanModal';
import PushNotificationPrompt from '../common/PushNotificationPrompt';

interface AdminDashboardProps {
    initialView?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialView }) => {
    const [view, setView] = useState(initialView || 'dashboard');
    const [showUserModal, setShowUserModal] = useState(false);
    const [editUser, setEditUser] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [userLoading, setUserLoading] = useState(false);
    const [userError, setUserError] = useState<string|null>(null);
    const [showDeleteUser, setShowDeleteUser] = useState<any>(null);

    const [showBookModal, setShowBookModal] = useState(false);
    const [editBook, setEditBook] = useState<any>(null);
    const [books, setBooks] = useState<any[]>([]);
    const [bookLoading, setBookLoading] = useState(false);
    const [bookError, setBookError] = useState<string|null>(null);
    const [showDeleteBook, setShowDeleteBook] = useState<any>(null);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrValue, setQRValue] = useState('');
    const [showQRConfirm, setShowQRConfirm] = useState(false);
    const [lastQR, setLastQR] = useState('');
    const [scanning, setScanning] = useState(true);

    // Fine Payments State
    const [finePayments, setFinePayments] = useState<any[]>([]);
    const [fineLoading, setFineLoading] = useState(false);
    const [fineError, setFineError] = useState<string|null>(null);

    // History State
    const [history, setHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string|null>(null);

    // Listen for QR scan trigger from dashboard
    React.useEffect(() => {
        const handler = () => handleScanQR();
        window.addEventListener('openAdminQRScan', handler);
        return () => window.removeEventListener('openAdminQRScan', handler);
    }, []);

    // CRUD USER
    const fetchUsers = async () => {
        setUserLoading(true);
        setUserError(null);
        try {
            const data = await require('../../services/api').adminApi.users();
            setUsers(data.items || data);
        } catch (e) {
            setUserError('Gagal memuat data user');
        } finally {
            setUserLoading(false);
        }
    };
    React.useEffect(() => { if (view === 'users') fetchUsers(); }, [view]);

    // Fetch Fine Payments
    const fetchFinePayments = async () => {
        setFineLoading(true);
        setFineError(null);
        try {
            console.log('[ADMIN] Fetching fine payments...');
            const data = await require('../../services/api').adminApi.get('/fine-payments');
            console.log('[ADMIN] Fine payments response:', data);
            setFinePayments(data || []);
        } catch (e: any) {
            console.error('[ADMIN] Error fetching fine payments:', e);
            setFineError(e.response?.data?.message || e.message || 'Gagal memuat data pembayaran denda');
        } finally {
            setFineLoading(false);
        }
    };
    React.useEffect(() => { if (view === 'fine_payments') fetchFinePayments(); }, [view]);

    const handleVerifyFinePayment = async (id: number, action: 'approve' | 'reject', proofFile?: File, notes?: string) => {
        setFineLoading(true);
        setFineError(null);
        try {
            // Backend expects: { status: 'approved' | 'rejected', adminNotes: 'optional' }
            const status = action === 'approve' ? 'approved' : 'rejected';
            
            await require('../../services/api').adminApi.post(`/fine-payments/${id}/verify`, {
                status,
                adminNotes: notes || ''
            });
            
            fetchFinePayments();
        } catch (e: any) {
            console.error('[ADMIN] Error verifying payment:', e);
            setFineError(e.response?.data?.message || e.message || 'Gagal verifikasi pembayaran');
        } finally {
            setFineLoading(false);
        }
    };

    // Fetch History
    const fetchHistory = async () => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            console.log('[ADMIN] Fetching history...');
            const data = await require('../../services/api').adminApi.get('/history-all');
            console.log('[ADMIN] History response:', data);
            setHistory(data || []);
        } catch (e: any) {
            console.error('[ADMIN] Error fetching history:', e);
            setHistoryError(e.response?.data?.message || e.message || 'Gagal memuat riwayat aktivitas');
        } finally {
            setHistoryLoading(false);
        }
    };
    React.useEffect(() => { if (view === 'history') fetchHistory(); }, [view]);

    const handleAddUser = () => {
        setEditUser(null);
        setShowUserModal(true);
    };
    const handleEditUser = (user: any) => {
        setEditUser(user);
        setShowUserModal(true);
    };
    const handleDeleteUser = (user: any) => {
        setShowDeleteUser(user);
    };
    const handleSaveUser = async (userId: number | undefined, userData: any) => {
        setUserLoading(true);
        setUserError(null);
        try {
            if (userId) {
                await require('../../services/api').adminApi.updateUser(userId, userData);
            } else {
                await require('../../services/api').adminApi.createUser(userData);
            }
            setShowUserModal(false);
            setEditUser(null);
            fetchUsers();
        } catch (e: any) {
            setUserError(e.message || 'Gagal simpan user');
        } finally {
            setUserLoading(false);
        }
    };
    const handleConfirmDeleteUser = async () => {
        if (!showDeleteUser) return;
        setUserLoading(true);
        setUserError(null);
        try {
            await require('../../services/api').adminApi.deleteUser(showDeleteUser.id);
            setShowDeleteUser(null);
            fetchUsers();
        } catch (e: any) {
            setUserError(e.message || 'Gagal hapus user');
        } finally {
            setUserLoading(false);
        }
    };

    // Handler untuk scan QR (buka modal kamera)
    const handleScanQR = () => {
        setShowQRModal(true);
        setScanning(true);
        setShowQRConfirm(false);
        setLastQR('');
    };

    // Handler ketika QR berhasil discan
    const [qrScanResult, setQRScanResult] = useState<{success:boolean; message:string}|null>(null);
    const handleQRResult = async (value: string) => {
        setQRValue(value);
        setLastQR(value);
        setScanning(false);
        // Validasi ke backend: kodePinjam
        try {
            const res = await require('../../services/api').adminApi.scanLoan(value);
            setQRScanResult({ success: true, message: res.message || 'Scan berhasil!' });
        } catch (e:any) {
            setQRScanResult({ success: false, message: e?.response?.data?.message || 'Scan gagal atau kode tidak valid.' });
        }
        setShowQRConfirm(true);
    };

    const handleQRConfirmClose = () => {
        setShowQRConfirm(false);
        setShowQRModal(false);
        setScanning(true);
        // Jika scan berhasil, redirect ke halaman peminjaman aktif
        if (qrScanResult?.success) {
            setView('active_loans');
            window.history.pushState(null, '', '/admin-peminjaman-aktif');
        }
    };

    const handleQRScanAgain = () => {
        setShowQRConfirm(false);
        setScanning(true);
        setLastQR('');
    };

    // CRUD BUKU
    const fetchBooks = async () => {
        setBookLoading(true);
        setBookError(null);
        try {
            // Admin menggunakan adminApi untuk list books
            const data = await require('../../services/api').adminApi.listBooks();
            setBooks(data.map(require('../../services/api').normalizeBook));
        } catch (e) {
            setBookError('Gagal memuat data buku');
        } finally {
            setBookLoading(false);
        }
    };
    React.useEffect(() => { if (view === 'books') fetchBooks(); }, [view]);

    const handleAddBook = () => {
        setEditBook(null);
        setShowBookModal(true);
    };
    const handleEditBook = (book: any) => {
        console.log('🔧 Edit book clicked:', book);
        setEditBook(book);
        setShowBookModal(true);
    };
    const handleDeleteBook = (book: any) => {
        setShowDeleteBook(book);
    };
    const handleSaveBook = async (bookId: number, formData: FormData) => {
        setBookLoading(true);
        setBookError(null);
        try {
            if (bookId) {
                await require('../../services/api').adminApi.updateBook(bookId, formData);
            } else {
                await require('../../services/api').adminApi.createBook(formData);
            }
            setShowBookModal(false);
            setEditBook(null);
            fetchBooks();
        } catch (e: any) {
            setBookError(e.message || 'Gagal simpan buku');
        } finally {
            setBookLoading(false);
        }
    };
    const handleConfirmDeleteBook = async () => {
        if (!showDeleteBook) return;
        setBookLoading(true);
        setBookError(null);
        try {
            await require('../../services/api').adminApi.deleteBook(showDeleteBook.id);
            setShowDeleteBook(null);
            fetchBooks();
        } catch (e: any) {
            setBookError(e.message || 'Gagal hapus buku');
        } finally {
            setBookLoading(false);
        }
    };

    let page = null;
    switch (view) {
        case 'dashboard':
            page = <DashboardState />;
            break;
        case 'users':
            page = (
                <div>
                    <div className="admin-toolbar">
                        <button className="btn btn-primary" onClick={handleAddUser}>+ Tambah User</button>
                       
                    </div>
                    <AdminUsersPage onEditUser={handleEditUser} onDeleteUser={handleDeleteUser} users={users} loading={userLoading} error={userError} />
                </div>
            );
            break;
        case 'books':
            page = (
                <div>
                    <div className="admin-toolbar">
                        <button className="btn btn-primary" onClick={handleAddBook}>+ Tambah Buku</button>
                    </div>
                    <AdminBooksPage onEditBook={handleEditBook} onDeleteBook={handleDeleteBook} books={books} loading={bookLoading} error={bookError} />
                </div>
            );
            break;
        case 'active_loans':
            page = <AdminActiveLoansPage />;
            break;
        case 'returns_review':
            page = <AdminReturnsReviewPage />;
            break;
        case 'fine_payments':
            page = <AdminFinePaymentsPage finePayments={finePayments} isLoading={fineLoading} error={fineError} onVerify={handleVerifyFinePayment} />;
            break;
        case 'history':
            page = <AdminHistoryPage history={history} isLoading={historyLoading} error={historyError} />;
            break;
        case 'broadcast':
            page = <AdminBroadcastPage />;
            break;
        default:
            page = <div>Pilih menu di sidebar.</div>;
    }

    return (
        <div className="admin-dashboard-container">
            <AdminHeader />
            <div className="admin-main-content">
                <AdminSidebar active={view as any} onChange={setView} />
                <div className="admin-content-area">
                    {page}
                </div>
            </div>

            {/* Modal Tambah/Edit User */}
            <UserModal
                isOpen={showUserModal}
                onClose={() => { setShowUserModal(false); setEditUser(null); }}
                userToEdit={editUser}
                onSave={handleSaveUser}
                error={userError}
                isLoading={userLoading}
            />
            {/* Modal Konfirmasi Hapus User */}
            {showDeleteUser && (
                <div className="modal-overlay open">
                    <div className="modal-content">
                        <h3>Hapus User</h3>
                        <p>Yakin ingin menghapus user <b>{showDeleteUser.username}</b>?</p>
                        <button className="btn btn-danger" onClick={handleConfirmDeleteUser} disabled={userLoading}>Hapus</button>
                        <button className="btn" onClick={() => setShowDeleteUser(null)} disabled={userLoading}>Batal</button>
                    </div>
                </div>
            )}
            {/* Modal Tambah/Edit Buku */}
            <BookModal
                isOpen={showBookModal}
                onClose={() => { setShowBookModal(false); setEditBook(null); }}
                bookToEdit={editBook}
                onSave={handleSaveBook}
                error={bookError}
                isLoading={bookLoading}
            />
            {/* Modal Konfirmasi Hapus Buku */}
            {showDeleteBook && (
                <div className="modal-overlay open">
                    <div className="modal-content">
                        <h3>Hapus Buku</h3>
                        <p>Yakin ingin menghapus buku <b>{showDeleteBook.judul || showDeleteBook.title}</b>?</p>
                        <button className="btn btn-danger" onClick={handleConfirmDeleteBook} disabled={bookLoading}>Hapus</button>
                        <button className="btn" onClick={() => setShowDeleteBook(null)} disabled={bookLoading}>Batal</button>
                    </div>
                </div>
            )}

            {/* Modal Proses Pengembalian */}
            <ReturnProcessModal
                isOpen={showReturnModal}
                onClose={() => setShowReturnModal(false)}
                loanData={selectedLoan}
                onProcess={() => setShowReturnModal(false)}
                showStatus={() => {}}
            />

            {/* Modal Kamera Scan QR */}
                        <QRScanModal
                                isOpen={showQRModal}
                                onClose={() => { setShowQRModal(false); setScanning(true); setShowQRConfirm(false); setLastQR(''); }}
                                onScan={handleQRResult}
                                scanning={scanning}
                        />
                        {/* Modal Konfirmasi QR Scan Sukses */}
                        {showQRModal && showQRConfirm && (
                                <div className="modal-overlay open">
                                    <div className={`modal-content confirm-modal ${qrScanResult?.success ? 'info' : 'danger'}`}>
                                        <div className="modal-header-v5">
                                            <span className={`modal-icon ${qrScanResult?.success ? 'info' : 'danger'}`} role="img" aria-label={qrScanResult?.success ? 'success' : 'error'}>{qrScanResult?.success ? '✅' : '❌'}</span>
                                            <h3>{qrScanResult?.success ? 'Scan QR Berhasil' : 'Scan QR Gagal'}</h3>
                                        </div>
                                        <div className="modal-body-v5">
                                            <p>{qrScanResult?.message}<br />Kode: <b>{lastQR}</b></p>
                                        </div>
                                        <div className="modal-footer-v5">
                                            <button className="btn btn-primary" onClick={handleQRConfirmClose}>Selesai</button>
                                            <button className="btn btn-secondary" onClick={handleQRScanAgain}>Scan QR lagi</button>
                                        </div>
                                    </div>
                                </div>
                        )}
            
            <PushNotificationPrompt 
                userId={parseInt(sessionStorage.getItem('adminId') || '0')} 
                role="admin" 
            />
        </div>
    );
};

export default AdminDashboard;

