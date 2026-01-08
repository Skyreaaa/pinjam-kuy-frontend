
import React, { useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import logoImg from '../../assets/Logo.png';
import './LandingPage.css';

interface NavbarProps {
  isLoggedIn?: boolean;
  userData?: any;
  onNavigateToLogin?: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateToInformation?: () => void;
  onNavigateToLanding?: () => void;
  onNavigateToCollection?: () => void;
}


const Navbar: React.FC<NavbarProps & { showNavbar?: boolean }> = ({ isLoggedIn, userData, onNavigateToLogin, onNavigateToDashboard, onNavigateToInformation, onNavigateToLanding, onNavigateToCollection, showNavbar }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Cek mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <header className={`landing-header${showNavbar === false ? ' hide-navbar' : ''}`}>
      <div className="header-container">
        <div className="logo-section" onClick={onNavigateToLanding} style={{ cursor: 'pointer' }}>
          <img src={logoImg} alt="PinjamKuy Logo" className="header-logo" />
          <div className="logo-text">
            <h1>PinjamKuy</h1>
            <span>Bantuan Belajar Mudah</span>
          </div>
        </div>
        {/* Hamburger for mobile */}
        {isMobile ? (
          <>
            {!sidebarOpen && (
              <button className="nav-hamburger" style={{position:'absolute',left:12,top:12}} onClick={() => setSidebarOpen(true)} aria-label="Menu">
                <FaBars size={24} />
              </button>
            )}
          </>
        ) : (
          <nav className="nav-menu">
            <button className="nav-link" onClick={onNavigateToLanding} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}>Beranda</button>
            <button className="nav-link" onClick={onNavigateToCollection} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}>Koleksi</button>
            <button className="nav-link" onClick={onNavigateToInformation} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}>Informasi</button>
            <a href="#tentang" className="nav-link">Tentang</a>
            {isLoggedIn ? (
              <button className="btn-login" onClick={() => {
                if (isLoggedIn && onNavigateToDashboard) onNavigateToDashboard();
              }}>
                {userData?.role === 'admin' ? 'Dashboard' : 'Dashboard'}
              </button>
            ) : (
              <button className="btn-login" onClick={() => {
                if (!isLoggedIn && onNavigateToLogin) onNavigateToLogin();
              }}>
                Masuk
              </button>
            )}
          </nav>
        )}
      </div>
      {/* Sidebar Drawer Mobile */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}>
          <div className="sidebar-drawer" onClick={e => e.stopPropagation()}>
            <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Tutup Menu">
              <FaTimes size={22} />
            </button>
            <nav className="sidebar-menu">
              <button className="nav-link" onClick={() => { setSidebarOpen(false); onNavigateToLanding && onNavigateToLanding(); }}>Beranda</button>
              <button className="nav-link" onClick={() => { setSidebarOpen(false); onNavigateToCollection && onNavigateToCollection(); }}>Koleksi</button>
              <button className="nav-link" onClick={() => { setSidebarOpen(false); onNavigateToInformation && onNavigateToInformation(); }}>Informasi</button>
              <a href="#tentang" className="nav-link" onClick={() => setSidebarOpen(false)}>Tentang</a>
              {isLoggedIn ? (
                <button className="btn-login" onClick={() => { setSidebarOpen(false); onNavigateToDashboard && onNavigateToDashboard(); }}>
                  {userData?.role === 'admin' ? 'Dashboard' : 'Dashboard'}
                </button>
              ) : (
                <button className="btn-login" onClick={() => { setSidebarOpen(false); onNavigateToLogin && onNavigateToLogin(); }}>
                  Masuk
                </button>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
