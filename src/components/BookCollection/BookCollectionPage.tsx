import React, { useEffect, useState } from 'react';
import FilterSidebar from './FilterSidebar';
import ActiveFiltersBar from './ActiveFiltersBar';
import './ActiveFiltersBar.css';
import levenshtein from 'fast-levenshtein';
import './BookCollectionPage.css';
import { FaSearch, FaBook, FaFilter, FaArrowLeft, FaLock, FaStar } from 'react-icons/fa';
import { bookApi } from '../../services/api';
import Navbar from '../LandingPage/Navbar';
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
  // State untuk modal filter
  const [showFilterModal, setShowFilterModal] = useState(false);
  // State untuk semua filter
  const [filters, setFilters] = useState({
    tahunFrom: 0,
    tahunTo: 0,
    tersedia: [],
    lampiran: [],
    jenisKoleksi: [],
    pemusatan: [],
    lokasi: [],
    bahasa: [],
    prodi: [],
    minRating: 0,
  });

  // Ambil kata kunci dari sessionStorage jika ada (auto search)
  useEffect(() => {
    const keyword = sessionStorage.getItem('collection_search');
    if (keyword) {
      setSearchQuery(keyword);
      sessionStorage.removeItem('collection_search');
    }
  }, []);

  // Auto search jika searchQuery berubah karena redirect dari landing
  useEffect(() => {
    // Jika searchQuery berubah (dan bukan kosong), langsung filter
    if (searchQuery !== '' && books.length > 0) {
      applyFilters(searchQuery, selectedCategory);
    } else if (searchQuery === '') {
      setFilteredBooks(books);
    }
    // eslint-disable-next-line
  }, [searchQuery, books]);

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

  const [fuzzyInfo, setFuzzyInfo] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const applyFilters = (search: string, category: string, customFilters = filters) => {
    let filtered = [...books];
    setFuzzyInfo(null);
    // Filter by search (case-insensitive, fuzzy)
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(book => {
        const title = (book.title || book.judul || '').toLowerCase();
        const author = (book.author || book.penulis || '').toLowerCase();
        return title.includes(query) || author.includes(query);
      });
      // Jika tidak ada hasil, lakukan fuzzy search (Levenshtein distance <= 2)
      if (filtered.length === 0) {
        const fuzzyBooks = books.filter(book => {
          const title = (book.title || book.judul || '').toLowerCase();
          const author = (book.author || book.penulis || '').toLowerCase();
          return (
            levenshtein.get(title, query) <= 2 ||
            levenshtein.get(author, query) <= 2
          );
        });
        if (fuzzyBooks.length > 0) {
          setFuzzyInfo('Mungkin maksud Anda...');
          filtered = fuzzyBooks;
        }
      }
    }
    // Filter by category
    if (category !== 'Semua') {
      filtered = filtered.filter(book => {
        const bookCategory = book.category || book.kategori || '';
        return bookCategory.toLowerCase() === category.toLowerCase();
      });
    }
    // Filter tahun
    filtered = filtered.filter(book => {
      const year = book.publicationYear || book.tahunTerbit;
      if (!year) return false;
      if (customFilters.tahunFrom > 0 && year < customFilters.tahunFrom) return false;
      if (customFilters.tahunTo > 0 && year > customFilters.tahunTo) return false;
      return true;
    });
    // Filter rating
    if (customFilters.minRating > 0) {
      filtered = filtered.filter(book => getBookRating(book) >= customFilters.minRating);
    }
    // Filter checkbox
    const checkboxKeys = ['tersedia','lampiran','jenisKoleksi','pemusatan','lokasi','bahasa','prodi'];
    checkboxKeys.forEach(key => {
      if (customFilters[key]?.length) {
        filtered = filtered.filter(book => {
          const val = book[key] || book[key + 's'] || book[key + 'List'];
          if (!val) return false;
          if (Array.isArray(val)) return val.some(v => customFilters[key].includes(v));
          return customFilters[key].includes(val);
        });
      }
    });
    setFilteredBooks(filtered);
  };

  const getBookTitle = (book: Book) => book.title || book.judul || 'Judul Tidak Tersedia';
  const getBookAuthor = (book: Book) => book.author || book.penulis || 'Penulis Tidak Diketahui';
  const getBookCategory = (book: Book) => book.category || book.kategori || 'Lainnya';
  const getBookStock = (book: Book) => book.availableStock ?? book.stokTersedia ?? 0;
  const getBookYear = (book: Book) => book.publicationYear || book.tahunTerbit || '-';
  // Dummy rating, bisa diganti jika ada data rating asli
  const getBookRating = (book: Book) => 4.5;
  const getBookDescription = (book: Book) => book.description || book.deskripsi || 'Tidak ada deskripsi';
  const getBookLocation = (book: Book) => book.location || book.lokasi || 'Tidak diketahui';

  // Cek login dari localStorage
  const isLoggedIn = !!sessionStorage.getItem('token');
  return (
    <div className="book-collection-page">
      <Navbar
        isLoggedIn={isLoggedIn}
        onNavigateToLogin={onNavigateToLogin}
        onNavigateToDashboard={() => window.location.href = '/home'}
        onNavigateToInformation={() => window.location.href = '/information'}
        onNavigateToLanding={onNavigateToLanding}
        onNavigateToCollection={() => window.location.href = '/collection'}
      />
      <section className="search-filter-section" style={{marginTop: '40px'}}>
        <div className="container">
          <div style={{marginTop: '60px', marginBottom: '32px', textAlign: 'center'}}>
            <h1 className="page-title" style={{fontSize: '2rem', marginBottom: '0.5rem'}}>Koleksi Buku Perpustakaan</h1>
            <p className="page-subtitle" style={{fontSize: '1rem', marginBottom: '1.5rem'}}>
              Jelajahi {books.length} koleksi buku kami. Masuk untuk meminjam buku.
            </p>
          </div>
          {/* Search Bar & Filter Icon (hanya satu) */}
          {/* Search Bar & Filter Icon */}
          <form onSubmit={handleSearch} className="search-container" style={{marginBottom: '1.5rem', display:'flex', alignItems:'center', gap:'0.5rem'}}>
            <div className="search-wrapper" style={{flex:1}}>
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
            <button
              type="button"
              style={{background:'#fff',border:'1px solid #eee',borderRadius:'50%',padding:'0.7em',cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,0.07)'}}
              onClick={() => setShowFilterModal(true)}
              aria-label="Filter"
            >
              <FaFilter style={{fontSize:'1.3em',color:'#d32f2f'}} />
            </button>
          </form>
          {showFilterModal && (
            <div className="filter-modal-popup-bg" onClick={() => setShowFilterModal(false)}>
              <div className="filter-modal-popup" onClick={e => e.stopPropagation()}>
                <FilterSidebar
                  filters={filters}
                  setFilters={setFilters}
                  onApply={() => { applyFilters(searchQuery, selectedCategory); setShowFilterModal(false); }}
                  onReset={() => {
                    setFilters({
                      tahunFrom: 0,
                      tahunTo: 0,
                      tersedia: [],
                      lampiran: [],
                      jenisKoleksi: [],
                      pemusatan: [],
                      lokasi: [],
                      bahasa: [],
                      prodi: [],
                      minRating: 0,
                    });
                    applyFilters(searchQuery, selectedCategory, {
                      tahunFrom: 0,
                      tahunTo: 0,
                      tersedia: [],
                      lampiran: [],
                      jenisKoleksi: [],
                      pemusatan: [],
                      lokasi: [],
                      bahasa: [],
                      prodi: [],
                      minRating: 0,
                    });
                    setShowFilterModal(false);
                  }}
                />
              </div>
            </div>
          )}
          {/* Category Filter as original vertical button group below search bar */}
          <div className="category-filter-vertical" style={{display:'flex',flexWrap:'wrap',gap:'0.5rem',marginBottom:'1.2rem',justifyContent:'center'}}>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                className={`category-chip${selectedCategory === category ? ' active' : ''}`}
                onClick={() => handleCategoryChange(category)}
                style={{
                  border:'none',
                  background:selectedCategory === category ? '#fbbf24' : '#fff',
                  color:selectedCategory === category ? '#2c3e50' : '#555',
                  borderRadius:'16px',
                  padding:'0.35em 1.1em',
                  fontSize:'0.92em',
                  fontWeight:500,
                  boxShadow:'0 1px 4px rgba(0,0,0,0.07)',
                  cursor:'pointer',
                  transition:'background 0.2s,color 0.2s',
                }}
              >
                {category}
              </button>
            ))}
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
              {fuzzyInfo && (
                <div className="fuzzy-info" style={{color:'#007bff',fontWeight:500,marginBottom:8}}>{fuzzyInfo}</div>
              )}
              <div className="results-info">
                Menampilkan {filteredBooks.length} dari {books.length} buku
              </div>
              <div className="books-grid" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.2rem'}}>
                {filteredBooks.map((book) => (
                  <Link key={book.id} to={`/book/${book.id}`} className="book-card" style={{borderRadius:'12px', boxShadow:'0 2px 10px rgba(0,0,0,0.07)', minHeight:'320px', maxWidth:'210px', margin:'0 auto'}}>
                    <div className="book-cover" style={{height:'180px', borderRadius:'12px 12px 0 0'}}>
                      {book.image_url ? (
                        <img src={book.image_url} alt={getBookTitle(book)} style={{height:'100%', objectFit:'cover'}} />
                      ) : (
                        <div className="no-cover">
                          <FaBook />
                        </div>
                      )}
                      <div className="stock-badge" data-available={getBookStock(book) > 0}>
                        {getBookStock(book) > 0 ? `${getBookStock(book)} Tersedia` : 'Habis'}
                      </div>
                    </div>
                    <div className="book-info" style={{padding:'0.8rem'}}>
                      <h3 className="book-title" style={{fontSize:'1rem', marginBottom:'0.3rem'}}>{getBookTitle(book)}</h3>
                      <p className="book-author" style={{fontSize:'0.85rem', marginBottom:'0.3rem'}}>{getBookAuthor(book)}</p>
                      <div className="book-meta-row" style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.3rem'}}>
                        <span className="book-year" style={{fontSize:'0.75rem',color:'#888'}}>{getBookYear(book)}</span>
                        <span className="book-rating" style={{fontSize:'0.8rem',color:'#fbbf24',display:'flex',alignItems:'center',gap:'0.15rem'}}>
                          {getBookRating(book)} <FaStar style={{color:'#fbbf24',fontSize:'0.85em'}} />
                        </span>
                      </div>
                      <span className="book-category" style={{fontSize:'0.7rem'}}>{getBookCategory(book)}</span>
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
