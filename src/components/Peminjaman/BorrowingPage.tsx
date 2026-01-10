import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookList } from './BookList';
import { FaList } from 'react-icons/fa';
import { userApi } from '../../services/api';
import { Book } from '../../types';

// Modal khusus jika user sudah pernah pinjam buku ini
const AlreadyBorrowedModal = ({ onClose }: { onClose: () => void }) => (
  <div className="modal-overlay" style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.18)',zIndex:1200,display:'flex',alignItems:'center',justifyContent:'center'}}>
    <div className="modal-content" style={{background:'#fff',borderRadius:16,maxWidth:340,width:'90vw',padding:24,boxShadow:'0 4px 32px #0003',position:'relative',textAlign:'center'}}>
      <button onClick={onClose} style={{position:'absolute',top:12,right:16,fontSize:22,background:'none',border:'none',cursor:'pointer'}}>&times;</button>
      <div style={{fontWeight:700,fontSize:18,marginBottom:12}}>Peminjaman Gagal</div>
      <div style={{color:'#e67e22',fontSize:15,marginBottom:16}}>Kamu sudah pernah pinjam buku ini dan belum dikembalikan.<br/>Silakan kembalikan buku tersebut sebelum meminjam lagi.</div>
      <button onClick={onClose} style={{marginTop:8,padding:'10px 0',width:'100%',background:'#4fc3f7',color:'#fff',border:'none',borderRadius:8,fontWeight:700,fontSize:16,cursor:'pointer'}}>Tutup</button>
    </div>
  </div>
);

// Modal detail buku
type BookDetailModalProps = { book: any, onClose: () => void, onPinjam: () => void };
function BookDetailModal({ book, onClose, onPinjam }: BookDetailModalProps) {
  if (!book) return null;
  
  // Normalize book data - SAMA SEPERTI DI BookCardV5
  const coverUrl = book.imageUrl || book.image_url || book.cover_url || '';
  const title = book.judul || book.title || 'Judul Tidak Tersedia';
  const author = book.penulis || book.author || 'Penulis Tidak Tersedia';
  const year = book.publicationYear || book.year || book.tahun || '-';
  const code = book.kodeBuku || book.kode_buku || book.code || '-';
  const availStock = book.availableStock ?? book.available_stock ?? book.stock ?? 0;
  const totStock = book.totalStock ?? book.total_stock ?? book.stock ?? 0;
  const location = book.location || book.lokasi || '-';
  const description = book.description || book.deskripsi || '';
  const publisher = book.publisher || book.penerbit || '-';
  const category = book.category || book.kategori || '-';
  const pages = book.pages || book.jumlah_halaman || '-';
  
  const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="160"%3E%3Crect fill="%23e3e8ef" width="120" height="160"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="12"%3ETidak Ada%0AGambar%3C/text%3E%3C/svg%3E';
  
  console.log('Modal Book:', title, '| coverUrl:', coverUrl);
  
  return (
    <div className="modal-overlay" style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.4)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div className="modal-content" style={{background:'#fff',borderRadius:16,maxWidth:420,width:'100%',maxHeight:'90vh',overflow:'auto',padding:24,boxShadow:'0 8px 32px rgba(0,0,0,0.2)',position:'relative'}} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{position:'absolute',top:16,right:20,fontSize:28,background:'none',border:'none',cursor:'pointer',color:'#999',lineHeight:1}}>&times;</button>
        
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16}}>
          {/* Cover buku */}
          <div style={{width:120,height:160,background:'#f5f5f5',borderRadius:12,overflow:'hidden',boxShadow:'0 4px 12px rgba(0,0,0,0.15)',marginTop:8}}>
            <img 
              src={coverUrl || placeholderImage} 
              alt={title} 
              style={{width:'100%',height:'100%',objectFit:'cover'}}
              onError={(e) => { (e.target as HTMLImageElement).src = placeholderImage; }}
            />
          </div>
          
          {/* Info buku */}
          <div style={{width:'100%',textAlign:'center'}}>
            <h3 style={{fontWeight:700,fontSize:'1.3rem',margin:'0 0 8px 0',color:'#2c3e50'}}>{title}</h3>
            <p style={{fontSize:'0.95rem',color:'#7f8c8d',margin:'0 0 16px 0',fontWeight:500}}>{author}</p>
          </div>
          
          {/* Detail info */}
          <div style={{width:'100%',display:'flex',flexDirection:'column',gap:10,background:'#f8f9fa',padding:16,borderRadius:10}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.9rem'}}>
              <span style={{color:'#7f8c8d',fontWeight:500}}>Kode Buku:</span>
              <span style={{color:'#2c3e50',fontWeight:600}}>{code}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.9rem'}}>
              <span style={{color:'#7f8c8d',fontWeight:500}}>Penerbit:</span>
              <span style={{color:'#2c3e50',fontWeight:600}}>{publisher}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.9rem'}}>
              <span style={{color:'#7f8c8d',fontWeight:500}}>Tahun Terbit:</span>
              <span style={{color:'#2c3e50',fontWeight:600}}>{year}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.9rem'}}>
              <span style={{color:'#7f8c8d',fontWeight:500}}>Kategori:</span>
              <span style={{color:'#2c3e50',fontWeight:600}}>{category}</span>
            </div>
            {pages !== '-' && (
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.9rem'}}>
                <span style={{color:'#7f8c8d',fontWeight:500}}>Jumlah Halaman:</span>
                <span style={{color:'#2c3e50',fontWeight:600}}>{pages}</span>
              </div>
            )}
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.9rem'}}>
              <span style={{color:'#7f8c8d',fontWeight:500}}>Stok Tersedia:</span>
              <span style={{color: availStock > 0 ? '#27ae60' : '#e74c3c',fontWeight:700}}>{availStock} / {totStock}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.9rem'}}>
              <span style={{color:'#7f8c8d',fontWeight:500}}>Lokasi Rak:</span>
              <span style={{color:'#3498db',fontWeight:600}}>{location}</span>
            </div>
          </div>
          
          {/* Deskripsi jika ada */}
          {description && (
            <div style={{width:'100%',textAlign:'left'}}>
              <h4 style={{fontSize:'0.95rem',color:'#7f8c8d',marginBottom:8,fontWeight:600}}>Deskripsi:</h4>
              <p style={{fontSize:'0.88rem',color:'#555',lineHeight:1.6,margin:0}}>{description}</p>
            </div>
          )}
          
          {/* Button pinjam */}
          <button 
            onClick={onPinjam} 
            disabled={availStock <= 0}
            style={{
              marginTop:8,
              padding:'12px 0',
              width:'100%',
              background: availStock > 0 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#bdc3c7',
              color:'#fff',
              border:'none',
              borderRadius:10,
              fontWeight:700,
              fontSize:'1rem',
              cursor: availStock > 0 ? 'pointer' : 'not-allowed',
              boxShadow: availStock > 0 ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none',
              transition:'all 0.3s'
            }}
            onMouseEnter={e => { if(availStock > 0) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {availStock > 0 ? 'Pinjam Buku Ini' : 'Stok Tidak Tersedia'}
          </button>
        </div>
      </div>
    </div>
  );
}

export type BorrowingPageProps = {
  userData: any;
  onBack: () => void;
};

export default function BorrowingPage({ userData, onBack }: BorrowingPageProps) {
  const [showAlreadyBorrowedModal, setShowAlreadyBorrowedModal] = React.useState(false);
  const [books, setBooks] = React.useState<Book[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedBook, setSelectedBook] = React.useState<Book | null>(null);
  const [showFormPinjam, setShowFormPinjam] = React.useState(false);
  const navigate = useNavigate();

  // Fetch books from backend
  const fetchBooks = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Endpoint: /api/books/public (tanpa auth)
      const resp = await userApi.get('/books/public');
      let data = resp.data;
      // Pastikan data array dan normalisasi field
      if (Array.isArray(data)) {
        setBooks(data.map((b: any) => {
          return {
            ...b,
            judul: b.judul || b.title || '-',
            penulis: b.penulis || b.author || '-',
            publicationYear: b.publicationYear || b.year || b.tahun || null,
            kodeBuku: b.kodeBuku || b.kode_buku || '-',
            availableStock: b.availableStock ?? b.stock ?? 0,
            totalStock: b.totalStock ?? b.total_stock ?? b.stock ?? 0,
            imageUrl: b.imageUrl || b.image_url || b.cover_url || '',
            location: b.location || '-',
          };
        }));
      } else {
        setBooks([]);
      }
    } catch (e: any) {
      setError('Gagal memuat daftar buku.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchBooks();
    // eslint-disable-next-line
  }, []);

  React.useEffect(() => {
    if (books && books.length > 0) {
      console.log('Books fetched:', books.map(b => ({judul: b.judul, imageUrl: b.imageUrl})));
    }
  }, [books]);

  // CSS classes are now used for layout and appearance

  // --- HANDLERS (dummy implementations, replace as needed) ---
  const handleGoToLoans = () => {
    navigate('/loans');
  };

  const handleBookClick = (book: any) => {
    setSelectedBook(book);
    setShowFormPinjam(false);
  };

  const handlePinjamClick = () => {
    setShowFormPinjam(true);
  };

  // Form Pinjam Modal - LENGKAP SEPERTI ASLINYA
  const FormPinjamModal = ({ book, onClose, userData }: any) => {
    const [returnDate, setReturnDate] = React.useState('');
    const [purpose, setPurpose] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const purposeRef = React.useRef<HTMLTextAreaElement>(null);
    
    // Cek apakah buku digital (ada attachment)
    const isDigitalBook = book?.lampiran && book.lampiran !== 'Tidak Ada' && book.attachment_url;
    
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 1); // Minimal besok
    
    // Auto focus textarea
    React.useEffect(() => {
      if (purposeRef.current) {
        purposeRef.current.focus();
      }
    }, []);
    
    const handleSubmit = async () => {
      if (!purpose.trim()) {
        alert('Harap isi tujuan peminjaman!');
        return;
      }
      
      // Untuk buku fisik, wajib isi tanggal pengembalian
      if (!isDigitalBook && !returnDate) {
        alert('Harap pilih tanggal pengembalian!');
        return;
      }
      
      setIsSubmitting(true);
      try {
        const token = sessionStorage.getItem('token');
        const loanData: any = {
          bookId: book.id,
          purpose: purpose.trim(),
          loanDate: new Date().toISOString().split('T')[0]
        };
        
        // Hanya kirim returnDate untuk buku fisik
        if (!isDigitalBook && returnDate) {
          loanData.returnDate = returnDate;
        }
        
        const response = await userApi.post('/loans/request', loanData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        alert(response.data.message || 'Pengajuan peminjaman berhasil!');
        onClose();
        fetchBooks(); // Refresh book list
      } catch (error: any) {
        const errMsg = error.response?.data?.message || 'Gagal mengajukan peminjaman.';
        alert(errMsg);
        
        // Jika sudah pernah pinjam, tutup form dan tampilkan modal khusus
        if (errMsg.includes('sudah pernah') || errMsg.includes('belum dikembalikan')) {
          onClose();
          setShowAlreadyBorrowedModal(true);
        }
      } finally {
        setIsSubmitting(false);
      }
    };
    
    return (
      <div className="modal-overlay" style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.5)',zIndex:1200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
        <div className="modal-content" style={{background:'#fff',borderRadius:16,maxWidth:480,width:'100%',padding:28,boxShadow:'0 8px 32px rgba(0,0,0,0.25)',position:'relative'}} onClick={e => e.stopPropagation()}>
          <button onClick={onClose} style={{position:'absolute',top:16,right:20,fontSize:28,background:'none',border:'none',cursor:'pointer',color:'#999',lineHeight:1}}>&times;</button>
          
          <h3 style={{fontWeight:700,fontSize:'1.4rem',marginBottom:8,color:'#2c3e50',textAlign:'center'}}>Formulir Peminjaman</h3>
          <p style={{fontSize:'0.9rem',color:'#7f8c8d',marginBottom:24,textAlign:'center'}}>
            {isDigitalBook ? 'Buku digital dapat diakses kapan saja' : 'Isi formulir untuk meminjam buku fisik'}
          </p>
          
          {/* Info buku */}
          <div style={{background:'#f8f9fa',padding:16,borderRadius:10,marginBottom:20,border:'1px solid #e9ecef'}}>
            <div style={{fontWeight:600,fontSize:'1rem',color:'#2c3e50',marginBottom:4}}>Judul Buku</div>
            <div style={{fontSize:'0.95rem',color:'#495057',marginBottom:8}}>{book?.judul || book?.title || '-'}</div>
            <div style={{fontWeight:600,fontSize:'1rem',color:'#2c3e50',marginBottom:4}}>Peminjam</div>
            <div style={{fontSize:'0.95rem',color:'#495057'}}>{userData?.username || '-'} ({userData?.npm || '-'})</div>
          </div>
          
          {/* Form fields */}
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:'0.95rem',fontWeight:600,color:'#555',marginBottom:8}}>
              Tujuan Peminjaman <span style={{color:'#e74c3c'}}>*</span>
            </label>
            <textarea
              ref={purposeRef}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Contoh: Untuk referensi Tugas Akhir, penelitian, atau belajar mandiri"
              rows={4}
              maxLength={300}
              style={{width:'100%',padding:'12px',fontSize:'0.95rem',border:'1px solid #ddd',borderRadius:8,outline:'none',resize:'vertical',fontFamily:'inherit',transition:'border 0.2s'}}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
            <small style={{display:'block',marginTop:6,fontSize:'0.8rem',color:'#7f8c8d'}}>
              {purpose.length}/300 karakter (minimal 5 karakter)
            </small>
          </div>
          
          {/* Tanggal pengembalian HANYA untuk buku fisik */}
          {!isDigitalBook && (
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:'0.95rem',fontWeight:600,color:'#555',marginBottom:8}}>
                Perkiraan Tanggal Kembali <span style={{color:'#e74c3c'}}>*</span>
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                min={minDate.toISOString().split('T')[0]}
                style={{width:'100%',padding:'12px',fontSize:'0.95rem',border:'1px solid #ddd',borderRadius:8,outline:'none',transition:'border 0.2s'}}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
              <small style={{display:'block',marginTop:6,fontSize:'0.8rem',color:'#7f8c8d'}}>
                Pilih tanggal yang sesuai dengan kebutuhan Anda
              </small>
            </div>
          )}
          
          {/* Note */}
          <div style={{background:'#e3f2fd',padding:12,borderRadius:8,marginBottom:20,border:'1px solid #90caf9'}}>
            <p style={{fontSize:'0.85rem',color:'#1976d2',margin:0,lineHeight:1.5}}>
              <strong>Catatan:</strong> {isDigitalBook ? 'Buku digital akan langsung tersedia setelah pengajuan disetujui. Tidak perlu pengembalian fisik.' : 'Dengan menekan "Ajukan Pinjaman", Anda menyetujui untuk mengembalikan buku sesuai tanggal yang dipilih. Pengambilan buku akan dikoordinasikan setelah disetujui Admin.'}
            </p>
          </div>
          
          {/* Buttons */}
          <div style={{display:'flex',gap:12}}>
            <button 
              onClick={onClose}
              disabled={isSubmitting}
              style={{flex:1,padding:'14px',background:'#fff',color:'#555',border:'1px solid #ddd',borderRadius:8,fontWeight:600,fontSize:'0.95rem',cursor:'pointer',transition:'all 0.2s'}}
              onMouseEnter={(e) => { if(!isSubmitting) e.currentTarget.style.background = '#f5f5f5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
            >
              Batal
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || purpose.trim().length < 5 || (!isDigitalBook && !returnDate)}
              style={{
                flex:1,
                padding:'14px',
                background: (!isSubmitting && purpose.trim().length >= 5 && (isDigitalBook || returnDate)) ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#bdc3c7',
                color:'#fff',
                border:'none',
                borderRadius:8,
                fontWeight:700,
                fontSize:'0.95rem',
                cursor: (!isSubmitting && purpose.trim().length >= 5 && (isDigitalBook || returnDate)) ? 'pointer' : 'not-allowed',
                boxShadow: (!isSubmitting && purpose.trim().length >= 5 && (isDigitalBook || returnDate)) ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none',
                transition:'all 0.3s'
              }}
              onMouseEnter={(e) => { if(!isSubmitting && purpose.trim().length >= 5 && (isDigitalBook || returnDate)) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {isSubmitting ? 'Mengirim...' : 'Ajukan Pinjaman'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Hapus useEffect dummy kedua
  
  return (
    <div className="borrowing-page-wrapper-v5">
      <div className="borrowing-page-container-v5">
        {/* Header dengan tombol back ke home dan FaList ke loans */}
        <div className="borrowing-header-v5">
          <div className="header-top-v5" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            padding: '0 16px',
            boxSizing: 'border-box'
          }}>
            <button
              className="back-button-v5"
              onClick={() => navigate('/home')}
              title="Kembali ke Home"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button
              className="loans-button-v5"
              onClick={() => navigate('/loans')}
              title="Lihat Pinjaman Saya"
            >
              <FaList />
            </button>
          </div>
        </div>
        <main className="main-content-area-v5">
          <div className="book-list-container-v5">
            <BookList
              books={books}
              isLoading={isLoading}
              error={error}
              currentPath={"/borrowing-page"}
              onBack={onBack}
              fetchBooks={fetchBooks}
              onBookClick={handleBookClick}
            />
          </div>
        </main>
        {/* Modal detail buku */}
        {selectedBook && !showFormPinjam && (
          <BookDetailModal book={selectedBook} onClose={() => setSelectedBook(null)} onPinjam={handlePinjamClick} />
        )}
        {/* Modal form pinjam */}
        {selectedBook && showFormPinjam && (
          <FormPinjamModal book={selectedBook} onClose={() => setShowFormPinjam(false)} userData={userData} />
        )}
        {/* Modal sudah pernah pinjam buku ini */}
        {showAlreadyBorrowedModal && <AlreadyBorrowedModal onClose={() => setShowAlreadyBorrowedModal(false)} />}
      </div>
      <div className="footer-v5" style={{textAlign:'center',color:'#888',fontSize:13,marginTop:24,marginBottom:8,letterSpacing:0.1}}>
        &copy; {new Date().getFullYear()} Pinjam Kuy &mdash; Perpustakaan Digital
      </div>
    </div>
  );
}


