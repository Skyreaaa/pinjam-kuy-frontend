
import React from 'react';
import logoImg from '../../assets/Logo.png';
import './LandingPage.css';

interface NavbarProps {
  onNavigateToLogin?: () => void;
  onNavigateToInformation?: () => void;
  onNavigateToLanding?: () => void;
  onNavigateToCollection?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigateToLogin, onNavigateToInformation, onNavigateToLanding, onNavigateToCollection }) => (
  <header className="landing-header">
    <div className="header-container">
      <div className="logo-section" onClick={onNavigateToLanding} style={{ cursor: 'pointer' }}>
        <img src={logoImg} alt="PinjamKuy Logo" className="header-logo" />
        <div className="logo-text">
          <h1>PinjamKuy</h1>
          <span>Bantuan Belajar Mudah</span>
        </div>
      </div>
      <nav className="nav-menu">
        <button className="nav-link" onClick={onNavigateToLanding} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}>Beranda</button>
        <button className="nav-link" onClick={onNavigateToCollection} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}>Koleksi</button>
        <button className="nav-link" onClick={onNavigateToInformation} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}>Informasi</button>
        <a href="#tentang" className="nav-link">Tentang</a>
        <button className="btn-login" onClick={onNavigateToLogin}>
          Masuk
        </button>
      </nav>
    </div>
  </header>
);

export default Navbar;
