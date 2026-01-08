import React, { useEffect, useState } from 'react';
import './LandingPage.css';
import { FaBook, FaFileAlt, FaChalkboardTeacher, FaLaptop, FaMapMarkerAlt, FaPhone, FaEnvelope, FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaQrcode, FaMobileAlt, FaBookReader, FaUserFriends, FaClock, FaCheckCircle, FaSearch } from 'react-icons/fa';
import { bookApi } from '../../services/api';
import logoImg from '../../assets/Logo-nobg.png';
import depanPerpusImg from '../../assets/depan-perpus.png';
import dalamPerpusImg from '../../assets/dalam-perpus.png';
import kasirPerpusImg from '../../assets/kasir-perpus.png';
import lt2PerpusImg from '../../assets/lt2-perpus.png';
import phoneQrImg from '../../assets/iklan.png';
import dafatarImg from '../../assets/menyapa.png';
import cariBukuImg from '../../assets/bingung.png';
import pinjamBukuImg from '../../assets/ceria.png';
import nikmatiImg from '../../assets/sip.png';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Navbar from './Navbar';

interface LandingPageProps {
  isLoggedIn?: boolean;
  userData?: any;
  onNavigateToLogin: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateToCollection?: () => void;
  onNavigateToInformation?: () => void;
}

interface Book {
  id: number;
  judul?: string;
  title?: string;
  penulis?: string;
  author?: string;
  tahunTerbit?: number;
  year?: number;
  kategori?: string;
  category?: string;
  lokasi?: string;
  location?: string;
  description?: string;
  image_url?: string;
  imageUrl?: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ isLoggedIn, userData, onNavigateToLogin, onNavigateToDashboard, onNavigateToCollection, onNavigateToInformation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [footerSearch, setFooterSearch] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [isLoading, setIsLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showInfoDropdown, setShowInfoDropdown] = useState(false);

  // Array gambar untuk slideshow - Gambar perpustakaan modern (5 gambar)
  const backgroundImages = [depanPerpusImg, dalamPerpusImg, kasirPerpusImg, lt2PerpusImg, phoneQrImg];

  useEffect(() => {
    window.history.replaceState(null, '', '/');
    fetchBooks();
    const intervalId = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 5000);

    // Sticky hide/reveal navbar (mobile) dengan debounce
    let lastScroll = window.scrollY;
    let timeoutId: any = null;
    const handleScroll = () => {
      const currentY = window.scrollY;
      setIsScrolled(currentY > 50);
      if (window.innerWidth <= 768) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (currentY > lastScroll && currentY > 60) {
            setShowNavbar(false); // scroll down, hide
          } else {
            setShowNavbar(true); // scroll up, show
          }
          lastScroll = currentY;
        }, 60);
      } else {
        setShowNavbar(true); // always show on desktop
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line
  }, []);

  // Handler untuk hover dropdown
  const handleMouseEnterDropdown = () => {
    console.log('Mouse entered dropdown area');
    setShowInfoDropdown(true);
  };

  const handleMouseLeaveDropdown = () => {
    console.log('Mouse left dropdown area');
    setShowInfoDropdown(false);
  };

  const fetchBooks = async () => {
    setIsLoading(true);
    try {
      const response = await bookApi.listPublic();
      console.log('Books fetched:', response); // Debug log
      console.log('Response type:', typeof response, 'Is array:', Array.isArray(response));
      console.log('Response length:', response?.length);
      setBooks(response as any);
      setFilteredBooks(response.slice(0, 4) as any); // Show first 4 books
    } catch (error) {
      console.error('Error fetching books:', error);
      alert(`Error fetching books: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi pencarian: tampilkan semua hasil yang cocok (bukan hanya 4)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Simpan kata kunci ke sessionStorage, redirect ke koleksi
      sessionStorage.setItem('collection_search', searchQuery);
      window.location.href = '/collection';
    }
  };

  function handleFooterSearch() {
    if (footerSearch.trim()) {
      sessionStorage.setItem('collection_search', footerSearch);
      window.location.href = '/collection';
    }
  }

  const handleCategoryFilter = (category: string) => {
    console.log('Filter clicked:', category);
    console.log('Total books:', books.length);
    setSelectedCategory(category);
    if (category === 'Semua') {
      const filtered = books.slice(0, 4);
      console.log('Showing all books:', filtered.length);
      setFilteredBooks(filtered);
    } else {
      const filtered = books.filter(book => {
        const categoryName = book.kategori || book.category || '';
        return categoryName === category;
      });
      setFilteredBooks(filtered.slice(0, 4));
    }
  };

  // --- RENDER ---
  return (
    <div className="landing-page">
      <Navbar
        isLoggedIn={isLoggedIn}
        userData={userData}
        onNavigateToLogin={onNavigateToLogin}
        onNavigateToDashboard={onNavigateToDashboard}
        onNavigateToInformation={onNavigateToInformation}
        onNavigateToLanding={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onNavigateToCollection={onNavigateToCollection}
        showNavbar={showNavbar}
      />
      <nav className="nav-menu">
        {/* Navbar is now handled by Navbar.tsx for all navigation */}
      </nav>
      {/* Hero Section with Slideshow Background */}
      <section className="hero-section" id="beranda">
        {/* Background Slideshow */}
        <div className="hero-background-slider">
          {backgroundImages.map((img, index) => (
            <div
              key={index}
              className={`hero-bg-image ${index === currentImageIndex ? 'active' : ''}`}
              style={{ backgroundImage: `url(${img})` }}
            />
          ))}
          <div className="hero-overlay-gradient"></div>
        </div>
        {/* Hero Content */}
        <div className="hero-content-wrapper">
          <div className="hero-content">
            <div className="hero-text-section">
              <h1 className="hero-title">Perpustakaan Digital</h1>
              <h2 className="hero-subtitle">Universitas Widyatama</h2>
              <p className="hero-description">
                Akses ribuan koleksi buku akademik, jurnal, dan referensi dengan mudah dan cepat
              </p>
            </div>
            {/* Search Box */}
            <form onSubmit={handleSearch} className="search-container-hero">
              <div className="search-wrapper">
                <input 
                  type="text" 
                  placeholder="Cari judul buku, penulis, atau kategori..." 
                  className="hero-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="search-btn-hero">
                  Cari
                </button>
              </div>
            </form>
            {/* Slider Indicators */}
            <div className="slider-indicators">
              {backgroundImages.map((_, index) => (
                <span
                  key={index}
                  className={`indicator ${index === currentImageIndex ? 'active' : ''}`}
                  onClick={() => setCurrentImageIndex(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* ...existing code for the rest of the sections and footer... */}

    {/* Popular Collections */}
    <section className="collections-section" id="koleksi">
      <div className="container">
        <h2>Yang populer di antara koleksi kami</h2>
        <p className="section-subtitle">
          Koleksi terbaru yang paling diminati oleh komunitas perpustakaan kami
        </p>
        <div className="filter-tags">
          <button className={`filter-tag ${selectedCategory === 'Semua' ? 'active' : ''}`} onClick={() => handleCategoryFilter('Semua')}>Terpopuler</button>
          <button className={`filter-tag ${selectedCategory === 'Fiksi' ? 'active' : ''}`} onClick={() => handleCategoryFilter('Fiksi')}>Fiksi</button>
          <button className={`filter-tag ${selectedCategory === 'Non-Fiksi' ? 'active' : ''}`} onClick={() => handleCategoryFilter('Non-Fiksi')}>Non-Fiksi</button>
          <button className={`filter-tag ${selectedCategory === 'Sains' ? 'active' : ''}`} onClick={() => handleCategoryFilter('Sains')}>Sains</button>
          <button className={`filter-tag ${selectedCategory === 'Sejarah' ? 'active' : ''}`} onClick={() => handleCategoryFilter('Sejarah')}>Sejarah</button>
          <button className={`filter-tag ${selectedCategory === 'Komputer' ? 'active' : ''}`} onClick={() => handleCategoryFilter('Komputer')}>Komputer</button>
        </div>
        <div className="books-grid-responsive">
          {isLoading ? (
            <div className="loading-message">Memuat koleksi buku...</div>
          ) : filteredBooks.length > 0 ? (
            filteredBooks.map((book, idx) => (
              <div className="book-grid-item" key={book.id || idx}>
                <Card variant="outlined" sx={{ p: 0, height: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', height: 180, gap: 2, p: 2 }}>
                    <div style={{ minWidth: 80, maxWidth: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <img
                        src={book.image_url || book.imageUrl || 'https://via.placeholder.com/80x120?text=No+Cover'}
                        alt={book.judul || book.title}
                        style={{ width: 80, height: 120, objectFit: 'cover', borderRadius: 8, boxShadow: '0 2px 8px #0001', background: '#f8f8f8' }}
                        loading="lazy"
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{book.judul || book.title}</h3>
                      <p style={{ margin: 0, color: '#555', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Penulis: {book.penulis || book.author}</p>
                      <p style={{ margin: 0, color: '#888', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Kategori: {book.kategori || book.category}</p>
                      {book.description && <p style={{ margin: 0, fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{book.description}</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))
          ) : (
            <div className="no-books-message">Tidak ada buku ditemukan</div>
          )}
        </div>
        <div className="view-more-container">
          <button className="btn-view-more" onClick={isLoggedIn ? onNavigateToCollection : onNavigateToLogin}>
            Lihat Semua Koleksi →
          </button>
        </div>
      </div>
    </section>

     {/* Subject Categories */}
    <section className="categories-section">
      <div className="container">
        <h2>Kategori Koleksi Buku</h2>
        <p className="section-subtitle">Temukan buku sesuai dengan bidang studi Anda</p>
        <div className="category-grid">
          <div className="category-card"><FaBook className="category-icon" /><h3>Ekonomi & Bisnis</h3><p>Akuntansi, Manajemen, Marketing</p></div>
          <div className="category-card"><FaLaptop className="category-icon" /><h3>Teknologi</h3><p>IT, Programming, Data Science</p></div>
          <div className="category-card"><FaFileAlt className="category-icon" /><h3>Karya Ilmiah</h3><p>Jurnal, Penelitian, Skripsi</p></div>
          <div className="category-card"><FaChalkboardTeacher className="category-icon" /><h3>Modul Pembelajaran</h3><p>Bahan Ajar, Diktat, Panduan</p></div>
        </div>
      </div>
    </section>

    {/* Features Section */}
    <section className="features-section">
      <div className="container">
        <h2>Fitur Unggulan PinjamKuy</h2>
        <p className="section-subtitle">Kemudahan akses perpustakaan digital di ujung jari Anda</p>
        <div className="features-grid">
          <div className="feature-item"><div className="feature-icon"><FaQrcode /></div><h3>Scan QR Code</h3><p>Pinjam buku dengan mudah menggunakan QR Code. Cukup scan dan buku siap dipinjam!</p></div>
          <div className="feature-item"><div className="feature-icon"><FaMobileAlt /></div><h3>Akses Mobile</h3><p>Kelola peminjaman dari smartphone Anda. Tersedia di web dan mobile responsive.</p></div>
          <div className="feature-item"><div className="feature-icon"><FaBookReader /></div><h3>Koleksi Lengkap</h3><p>Ribuan buku dari berbagai kategori: Akuntansi, Manajemen, Teknologi, dan lainnya.</p></div>
          <div className="feature-item"><div className="feature-icon"><FaClock /></div><h3>Riwayat Peminjaman</h3><p>Pantau status peminjaman, perpanjangan, dan riwayat lengkap aktivitas Anda.</p></div>
          <div className="feature-item"><div className="feature-icon"><FaCheckCircle /></div><h3>Proses Cepat</h3><p>Approval dan notifikasi real-time untuk setiap transaksi peminjaman.</p></div>
          <div className="feature-item"><div className="feature-icon"><FaUserFriends /></div><h3>User Friendly</h3><p>Interface yang mudah digunakan dengan panduan lengkap untuk mahasiswa dan dosen.</p></div>
        </div>
      </div>
    </section>

    {/* How It Works Section */}
    <section className="how-it-works-section">
      <div className="container">
        <h2>Cara Menggunakan PinjamKuy</h2>
        <p className="section-subtitle">Empat langkah mudah untuk meminjam buku favorit Anda</p>
        <div className="steps-grid">
          <div className="step-item"><div className="step-number">1</div><img src={dafatarImg} alt="Step 1" className="step-image" /><h3>Daftar & Login</h3><p>Gunakan NPM Anda untuk mendaftar atau login ke sistem PinjamKuy</p></div>
          <div className="step-item"><div className="step-number">2</div><img src={cariBukuImg} alt="Step 2" className="step-image" /><h3>Cari Buku</h3><p>Browse koleksi atau gunakan fitur pencarian untuk menemukan buku yang Anda inginkan</p></div>
          <div className="step-item"><div className="step-number">3</div><img src={pinjamBukuImg} alt="Step 3" className="step-image" /><h3>Pinjam Buku</h3><p>Scan QR Code buku atau ajukan peminjaman melalui aplikasi</p></div>
          <div className="step-item"><div className="step-number">4</div><img src={nikmatiImg} alt="Step 4" className="step-image" /><h3>Nikmati & Kembalikan</h3><p>Baca buku Anda dan kembalikan tepat waktu. Proses pengembalian juga mudah dengan scan QR</p></div>
        </div>
      </div>
    </section>


    {/* Location & About Section */}
    <section className="info-section" id="tentang">
      <div className="container">
        <div className="info-grid">
          {/* Map */}
          <div className="map-container">
            <h3>Universitas Widyatama</h3>
            <div className="map-embed-responsive" style={{ width: '100%', maxWidth: 600, height: 300, margin: '0 auto 1rem auto', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px #0002' }}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!4v1766995318163!6m8!1m7!1sCAoSFkNJSE0wb2dLRUlDQWdJRGNyTmlFQWc.!2m2!1d-6.898304807106765!2d107.6457916686441!3f152.40859004799623!4f0!5f0.7820865974627469"
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Google Maps Perpustakaan Widyatama"
              ></iframe>
            </div>
          </div>
          {/* About */}
          <div className="about-container">
            <h3>PERPUSTAKAAN PINJAM-KUY</h3>
            <p>Perpustakaan Pinjam-Kuy merupakan tugas arsitektur komputer yang dikembangkan oleh Kelompok 4 untuk memenuhi kebutuhan peminjaman buku digital di lingkungan Universitas Widyatama. Dengan sistem ini, mahasiswa dan dosen dapat dengan mudah mengakses koleksi perpustakaan kapan saja dan di mana saja.</p>
            <div className="contact-info">
              <p><FaPhone /> Telp : 022 727 3855 Ext. 390, 391, 392 dan 393</p>
            </div>
            <div className="social-media">
              <a href="#" className="social-icon facebook"><FaFacebook /></a>
              <a href="#" className="social-icon twitter"><FaTwitter /></a>
              <a href="#" className="social-icon instagram"><FaInstagram /></a>
              <a href="#" className="social-icon youtube"><FaYoutube /></a>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Footer */}
    <footer className="landing-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="footer-logo">
              <img src={logoImg} alt="PinjamKuy Logo" />
              <div>
                <h4>PinjamKuy</h4>
                <p className="footer-tagline">Bantuan Belajar Mudah</p>
              </div>
            </div>
            <p className="footer-description">Platform peminjaman buku digital Perpustakaan Universitas Widyatama. Memudahkan mahasiswa dan dosen dalam mengakses koleksi perpustakaan.</p>
          </div>
          <div className="footer-col">
            <h4>Tentang Kami</h4>
            <ul>
                <li><a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo(0,0); window.location.href = '/information'; }}>Informasi</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo(0,0); window.location.href = '/information'; }}>Layanan</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo(0,0); window.location.href = '/information'; }}>Peraturan</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Cari</h4>
            <p>masukkan satu atau lebih kata kunci atau kombinasi dari berbagai jenis penyisiran, atau subjek</p>
            <div className="footer-search">
              <input
                type="text"
                placeholder="Masukan kata kunci"
                value={footerSearch}
                onChange={e => setFooterSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleFooterSearch(); } }}
              />
              <button onClick={handleFooterSearch}>Cari Koleksi</button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
  );

}
export default LandingPage;
