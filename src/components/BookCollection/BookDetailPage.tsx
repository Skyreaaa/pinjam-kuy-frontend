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
    <div className="book-detail-page">
      <button className="btn-back" onClick={() => navigate(-1)}>
        <FaArrowLeft /> Kembali
      </button>
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Memuat detail buku...</p>
        </div>
      ) : book ? (
        <div className="book-detail-container">
          <div className="modal-image">
            {book.image_url ? (
              <img src={book.image_url} alt={getBookTitle(book)} />
            ) : (
              <div className="no-cover-large">
                <FaBook />
              </div>
            )}
          </div>
          <div className="modal-details">
            <h2 className="modal-title">{getBookTitle(book)}</h2>
            {/* QR Code Buku */}
            <div className="qr-section-book">
              <h4 className="qr-title">QR Buku</h4>
              {book.id && (
                <QRCodeDisplay value={String(book.id)} label={`ID Buku: ${book.id}`} />
              )}
            </div>
            <p className="modal-author">oleh {getBookAuthor(book)}</p>
            <div className="detail-grid">
              <div className="detail-item">
                <strong>Kategori:</strong>
                <span>{getBookCategory(book)}</span>
              </div>
              <div className="detail-item">
                <strong>Tahun Terbit:</strong>
                <span>{book.publicationYear || book.tahunTerbit || '-'}</span>
              </div>
              <div className="detail-item">
                <strong>Penerbit:</strong>
                <span>{book.publisher || book.penerbit || '-'}</span>
              </div>
              <div className="detail-item">
                <strong>Lokasi:</strong>
                <span>{getBookLocation(book)}</span>
              </div>
              <div className="detail-item">
                <strong>Stok Tersedia:</strong>
                <span className={getBookStock(book) > 0 ? 'text-success' : 'text-danger'}>
                  {getBookStock(book)} / {book.totalStock || 0}
                </span>
              </div>
            </div>
            <div className="description-section">
              <strong>Deskripsi:</strong>
              <p>{getBookDescription(book)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <FaBook className="empty-icon" />
          <h3>Buku tidak ditemukan</h3>
        </div>
      )}
    </div>
  );
};

export default BookDetailPage;
