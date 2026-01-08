import React, { useEffect, useState } from 'react';
import QRCodeDisplay from '../common/QRCodeDisplay';
import { useParams, useNavigate } from 'react-router-dom';
import { bookApi } from '../../services/api';
import { FaBook, FaArrowLeft } from 'react-icons/fa';
import './BookCollectionPage.css';

interface Book {
  id: number;
  title?: string;
  judul?: string;
  author?: string;
  penulis?: string;
  category?: string;
  kategori?: string;
  publicationYear?: number;
  tahunTerbit?: number;
  publisher?: string;
  penerbit?: string;
  totalStock?: number;
  availableStock?: number;
  stokTersedia?: number;
  image_url?: string;
  description?: string;
  deskripsi?: string;
  location?: string;
  lokasi?: string;
}

const BookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBookDetail(id);
    }
  }, [id]);

  const fetchBookDetail = async (bookId: string) => {
    setIsLoading(true);
    try {
      // Gunakan detailPublic agar bisa diakses tanpa login
      const response = await bookApi.detailPublic(bookId);
      setBook(response as any);
    } catch (error) {
      setBook(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getBookTitle = (b: Book) => b.title || b.judul || 'Judul Tidak Tersedia';
  const getBookAuthor = (b: Book) => b.author || b.penulis || 'Penulis Tidak Diketahui';
  const getBookCategory = (b: Book) => b.category || b.kategori || 'Lainnya';
  const getBookStock = (b: Book) => b.availableStock ?? b.stokTersedia ?? 0;
  const getBookDescription = (b: Book) => b.description || b.deskripsi || 'Tidak ada deskripsi';
  const getBookLocation = (b: Book) => b.location || b.lokasi || 'Tidak diketahui';

  return (
    <div className="book-detail-page" style={{minHeight:'100vh', background:'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', position:'relative'}}>
      <div style={{position:'absolute', top:'32px', left:'32px', zIndex:10}}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width:'48px', height:'48px', borderRadius:'50%', background:'linear-gradient(135deg, #FFD600 0%, #FFEA70 100%)',
            border:'none', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.10)', cursor:'pointer', transition:'all 0.2s',
          }}
          aria-label="Kembali"
        >
          <FaArrowLeft style={{fontSize:'1.5rem', color:'#2c3e50'}} />
        </button>
      </div>
      <div style={{maxWidth:'600px', margin:'0 auto', padding:'0 1rem'}}>
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Memuat detail buku...</p>
          </div>
        ) : book ? (
          <div style={{background:'white', borderRadius:'18px', boxShadow:'0 4px 24px rgba(0,0,0,0.09)', padding:'2rem', display:'flex', flexDirection:'column', alignItems:'center'}}>
            <div style={{width:'180px', height:'260px', borderRadius:'12px', overflow:'hidden', background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', marginBottom:'1.2rem', display:'flex', alignItems:'center', justifyContent:'center'}}>
              {book.image_url ? (
                <img src={book.image_url} alt={getBookTitle(book)} style={{width:'100%', height:'100%', objectFit:'cover'}} />
              ) : (
                <FaBook style={{fontSize:'4rem', color:'white', opacity:0.5}} />
              )}
            </div>
            <h2 style={{fontSize:'1.5rem', fontWeight:800, color:'#2c3e50', marginBottom:'0.5rem', textAlign:'center'}}>{getBookTitle(book)}</h2>
            <p style={{color:'#7f8c8d', fontSize:'1rem', marginBottom:'1.2rem', fontStyle:'italic', textAlign:'center'}}>oleh {getBookAuthor(book)}</p>
            <div style={{width:'100%', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1.2rem'}}>
              <div style={{background:'#f8f9fa', borderRadius:'8px', padding:'0.7rem'}}>
                <strong style={{color:'#7f8c8d', fontSize:'0.85rem'}}>Kategori:</strong>
                <div style={{color:'#2c3e50', fontWeight:600}}>{getBookCategory(book)}</div>
              </div>
              <div style={{background:'#f8f9fa', borderRadius:'8px', padding:'0.7rem'}}>
                <strong style={{color:'#7f8c8d', fontSize:'0.85rem'}}>Tahun Terbit:</strong>
                <div style={{color:'#2c3e50', fontWeight:600}}>{book.publicationYear || book.tahunTerbit || '-'}</div>
              </div>
              <div style={{background:'#f8f9fa', borderRadius:'8px', padding:'0.7rem'}}>
                <strong style={{color:'#7f8c8d', fontSize:'0.85rem'}}>Penerbit:</strong>
                <div style={{color:'#2c3e50', fontWeight:600}}>{book.publisher || book.penerbit || '-'}</div>
              </div>
              <div style={{background:'#f8f9fa', borderRadius:'8px', padding:'0.7rem'}}>
                <strong style={{color:'#7f8c8d', fontSize:'0.85rem'}}>Lokasi:</strong>
                <div style={{color:'#2c3e50', fontWeight:600}}>{getBookLocation(book)}</div>
              </div>
              <div style={{background:'#f8f9fa', borderRadius:'8px', padding:'0.7rem', gridColumn:'span 2'}}>
                <strong style={{color:'#7f8c8d', fontSize:'0.85rem'}}>Stok Tersedia:</strong>
                <div style={{color: getBookStock(book) > 0 ? '#27ae60' : '#e74c3c', fontWeight:700}}>{getBookStock(book)} / {book.totalStock || 0}</div>
              </div>
            </div>
            <div style={{width:'100%', background:'#f8f9fa', borderRadius:'10px', padding:'1rem', marginBottom:'1rem'}}>
              <strong style={{color:'#2c3e50', fontWeight:700, marginBottom:'0.5rem', display:'block'}}>Deskripsi:</strong>
              <p style={{color:'#555', lineHeight:1.6, margin:0}}>{getBookDescription(book)}</p>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <FaBook className="empty-icon" />
            <h3>Buku tidak ditemukan</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookDetailPage;
