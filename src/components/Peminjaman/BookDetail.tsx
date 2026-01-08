import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import { FaTimesCircle, FaBook, FaCalendarCheck, FaExclamationCircle, FaMapMarkerAlt } from 'react-icons/fa';
import LazyImage from '../common/LazyImage';
import { Book, UserData } from './BookList';
import { bookApi, loanApi, normalizeBook } from '../../services/api';

interface BookDetailProps { userData: UserData; allBooks: Book[]; }

const BookDetail: React.FC<BookDetailProps> = ({ userData, allBooks }) => {
    const { bookId } = useParams<{ bookId: string }>();
    const navigate = useNavigate();
    const [book, setBook] = useState<Book | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [loanPurpose, setLoanPurpose] = useState('');
    const loanPurposeRef = useRef<HTMLTextAreaElement | null>(null);
    useEffect(() => {
        if (isFormOpen && loanPurposeRef.current) {
            loanPurposeRef.current.focus();
            const el = loanPurposeRef.current;
            const len = el.value.length;
            try { el.setSelectionRange(len, len); } catch {}
        }
    }, [isFormOpen, loanPurpose]);
    const [returnDateEstimate, setReturnDateEstimate] = useState<Date | null>(addDays(new Date(), 7));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fetchBookDetail = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const raw = await bookApi.detail(bookId!);
            setBook(normalizeBook(raw as any));
            setReturnDateEstimate(addDays(new Date(), 7));
        } catch (err) {
            setError('Gagal memuat detail buku. Buku mungkin tidak ditemukan.');
        } finally {
            setIsLoading(false);
        }
    }, [bookId]);
    useEffect(() => { fetchBookDetail(); }, [fetchBookDetail]);
    const handleSubmitLoan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!book || isSubmitting || !returnDateEstimate) return;
        if (book.availableStock <= 0) {
            setMessage('Stok buku tidak tersedia.');
            return;
        }
        setIsSubmitting(true);
        setMessage(null);
        try {
            const loanData = {
                bookId: typeof book.id === 'string' ? parseInt(book.id, 10) : book.id,
                loanDate: format(new Date(), 'yyyy-MM-dd'),
                returnDate: format(returnDateEstimate, 'yyyy-MM-dd'),
                purpose: loanPurpose,
            };
            const response = await loanApi.request(loanData);
            setMessage('Permintaan pinjaman berhasil diajukan! Menunggu persetujuan Admin.');
            if (response?.loan) {
                setIsFormOpen(false);
                navigate('/loans');
                setTimeout(() => {
                    try {
                        localStorage.setItem('recentLoan', JSON.stringify(response.loan));
                        const event = new CustomEvent('recent-loan-created');
                        window.dispatchEvent(event);
                    } catch {}
                }, 250);
            } else {
                setIsFormOpen(false);
                fetchBookDetail();
                setTimeout(() => navigate('/loans'), 1500);
            }
        } catch (err: any) {
            setMessage(`Gagal mengajukan pinjaman: ${err?.response?.data?.message || 'Terjadi kesalahan jaringan.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    const BorrowingForm: React.FC = () => (
        <div className="modal-overlay-v5">
            <div className="form-modal-v5">
                <div className="form-header-v5">
                    <h3>Formulir Peminjaman</h3>
                    <button className="close-button-v5" onClick={() => setIsFormOpen(false)} aria-label="Tutup" title="Tutup"><FaTimesCircle /></button>
                </div>
                <form onSubmit={handleSubmitLoan}>
                    <div className="form-group-v5">
                        <label>Judul Buku</label>
                        <p className="form-value-v5">{book?.judul || 'N/A'}</p>
                    </div>
                    <div className="form-group-v5">
                        <label>Peminjam</label>
                        <p className="form-value-v5">{userData.username} ({userData.npm})</p>
                    </div>
                    <div className="form-group-v5">
                        <label htmlFor="loanPurpose">Tujuan Peminjaman <span className='required'>*</span></label>
                        <textarea
                            id="loanPurpose"
                            value={loanPurpose}
                            onChange={(e) => setLoanPurpose(e.target.value)}
                            placeholder="Contoh: Untuk referensi Tugas Akhir"
                            required
                            maxLength={300}
                            ref={loanPurposeRef}
                            autoFocus
                        />
                    </div>
                    <div className="form-group-v5">
                        <label htmlFor="returnDateEstimate">Perkiraan Tanggal Kembali <span className='required'>*</span></label>
                        <input
                            type="date"
                            id="returnDateEstimate"
                            value={returnDateEstimate ? format(returnDateEstimate, 'yyyy-MM-dd') : ''}
                            onChange={(e) => setReturnDateEstimate(new Date(e.target.value))}
                            min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                            required
                        />
                    </div>
                    <div className="form-group-v5">
                        <p className='note-v5 important'>Dengan menekan "Ajukan Pinjaman", Anda menyetujui meminjam buku ini. Pengambilan buku akan dikoordinasikan setelah disetujui Admin.</p>
                    </div>
                    <button type="submit" className="submit-button-v5" disabled={isSubmitting || loanPurpose.length < 5}>
                        {isSubmitting ? 'Mengajukan...' : <><FaCalendarCheck /> Ajukan Pinjaman</>}
                    </button>
                    {message && <p className={`status-message-form ${message.includes('Gagal') ? 'error' : 'success'}`}>{message}</p>}
                </form>
            </div>
        </div>
    );
    if (isLoading) return (
        <div className="book-detail-container-v5">
            <p className="loading-bar">Memuat detail buku...</p>
        </div>
    );
    if (error || !book) return (
        <div className="book-detail-container-v5">
            <div className="main-content-area-v5">
                <p className="status-message error"><FaExclamationCircle /> {error || 'Buku tidak ditemukan.'}</p>
            </div>
        </div>
    );
    const detailTitle = book.judul || 'Judul Tidak Tersedia';
    const detailAuthor = book.penulis || 'Penulis Tidak Tersedia';
    return (
        <div className="book-detail-container-v5">
            <div className="main-content-area-v5 detail-view">
                {message && <p className={`status-message ${message.includes('Gagal') ? 'error' : 'success'}`}>{message}</p>}
                <div className="book-card-detail-v5">
                    <div className="detail-cover-v5">
                        <LazyImage 
                            src={book.imageUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="200"%3E%3Crect fill="%23ddd" width="150" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="14"%3ETidak Ada Gambar%3C/text%3E%3C/svg%3E'} 
                            alt={`Sampul buku ${detailTitle}`}
                            onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="200"%3E%3Crect fill="%23ddd" width="150" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="14"%3ETidak Ada Gambar%3C/text%3E%3C/svg%3E'; }} 
                        />
                    </div>
                    <div className="detail-info-v5">
                        <h3>{detailTitle}</h3>
                        <p className="book-author-v5">{detailAuthor}</p>
                        <div className="book-meta-v5">
                            <span className="book-kode-v5">Kode: {book.kodeBuku}</span>
                            <span className="book-year-v5">Tahun: {book.year}</span>
                        </div>
                        <div className="book-stock-v5">
                            <FaBook /> Stok: {book.availableStock} dari {book.totalStock}
                        </div>
                        <div className="book-location-v5">
                            <FaMapMarkerAlt /> Lokasi Rak: <span className='location-tag-v5'>{book.location || 'Tidak Diketahui'}</span>
                        </div>
                    </div>
                </div>
                <div className="description-box-v5">
                    <h3>Deskripsi</h3>
                    <p>{book.description || "Deskripsi tidak tersedia."}</p>
                </div>
                <button 
                    className={`borrow-button-v5 ${book.availableStock <= 0 ? 'disabled' : ''}`}
                    onClick={() => setIsFormOpen(true)}
                    disabled={book.availableStock <= 0}
                >
                    <FaBook /> {book.availableStock <= 0 ? 'Stok Habis' : 'Pinjam Sekarang'}
                </button>
            </div>
            {isFormOpen && <BorrowingForm />}
        </div>
    );
};

export default BookDetail;
