import React, { useEffect, useState } from 'react';
import './BookCollectionPage.css';
import { FaSearch, FaBook, FaFilter, FaArrowLeft, FaLock } from 'react-icons/fa';
import { bookApi } from '../../services/api';
import logoImg from '../../assets/Logo.png';
import { Link } from 'react-router-dom';

interface BookCollectionPageProps {
  onNavigateToLogin: () => void;
  onNavigateToLanding: () => void;
}

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

const CATEGORIES = ['Semua', 'Fiksi', 'Non-Fiksi', 'Sains', 'Sejarah', 'Komputer', 'Jurnal', 'Lainnya'];

const BookCollectionPage: React.FC<BookCollectionPageProps> = ({ onNavigateToLogin, onNavigateToLanding }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    setIsLoading(true);
    try {
      const response = await bookApi.listPublic();
      setBooks(response as any);
      setFilteredBooks(response as any);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(searchQuery, selectedCategory);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    applyFilters(searchQuery, category);
  };

  const applyFilters = (search: string, category: string) => {
    let filtered = [...books];

    // Filter by search
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(book => {
        const title = book.title || book.judul || '';
        const author = book.author || book.penulis || '';
        return title.toLowerCase().includes(query) || author.toLowerCase().includes(query);
      });
    }

    // Filter by category
    if (category !== 'Semua') {
      filtered = filtered.filter(book => {
        const bookCategory = book.category || book.kategori || '';
        return bookCategory.toLowerCase() === category.toLowerCase();
      });
    }

    setFilteredBooks(filtered);
  };

  const getBookTitle = (book: Book) => book.title || book.judul || 'Judul Tidak Tersedia';
  const getBookAuthor = (book: Book) => book.author || book.penulis || 'Penulis Tidak Diketahui';
  const getBookCategory = (book: Book) => book.category || book.kategori || 'Lainnya';
  const getBookStock = (book: Book) => book.availableStock ?? book.stokTersedia ?? 0;
  const getBookDescription = (book: Book) => book.description || book.deskripsi || 'Tidak ada deskripsi';
  const getBookLocation = (book: Book) => book.location || book.lokasi || 'Tidak diketahui';

  return (
    <div className="book-collection-page">
      {/* Header */}
      <header className="collection-header">
        <div className="header-container">
          <div className="logo-section" onClick={onNavigateToLanding}>
            <img src={logoImg} alt="PinjamKuy Logo" className="header-logo" />
            <div className="logo-text">
              <h1>PinjamKuy</h1>
              <span>Koleksi Buku</span>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-back" onClick={onNavigateToLanding}>
              <FaArrowLeft /> Kembali
            </button>
            <button className="btn-login" onClick={onNavigateToLogin}>
              Masuk untuk Pinjam
            </button>
          </div>
        </div>
      </header>
      <section className="search-filter-section">
        <div className="container">
          <h1 className="page-title">Koleksi Buku Perpustakaan</h1>
          <p className="page-subtitle">
            Jelajahi {books.length} koleksi buku kami. Masuk untuk meminjam buku.
          </p>
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="search-container">
            <div className="search-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Cari judul buku atau penulis..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="search-btn">
                Cari
              </button>
            </div>
          </form>
          {/* Category Filter */}
          <div className="category-filter">
            <FaFilter className="filter-icon" />
            <span className="filter-label">Kategori:</span>
            <div className="category-buttons">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* Books Grid */}
      <section className="books-grid-section">
        <div className="container">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Memuat koleksi buku...</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="empty-state">
              <FaBook className="empty-icon" />
              <h3>Tidak ada buku ditemukan</h3>
              <p>Coba ubah filter atau kata kunci pencarian Anda</p>
            </div>
          ) : (
            <>
              <div className="results-info">
                Menampilkan {filteredBooks.length} dari {books.length} buku
              </div>
              <div className="books-grid">
                {filteredBooks.map((book) => (
                  <Link key={book.id} to={`/book/${book.id}`} className="book-card">
                    <div className="book-cover">
                      {book.image_url ? (
                        <img src={book.image_url} alt={getBookTitle(book)} />
                      ) : (
                        <div className="no-cover">
                          <FaBook />
                        </div>
                      )}
                      <div className="stock-badge" data-available={getBookStock(book) > 0}>
                        {getBookStock(book) > 0 ? `${getBookStock(book)} Tersedia` : 'Habis'}
                      </div>
                    </div>
                    <div className="book-info">
                      <h3 className="book-title">{getBookTitle(book)}</h3>
                      <p className="book-author">{getBookAuthor(book)}</p>
                      <span className="book-category">{getBookCategory(book)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default BookCollectionPage;
