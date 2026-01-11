import React from 'react';
import { FaUsers, FaBook, FaClock, FaUndo, FaAngleLeft, FaMoneyBillWave, FaHistory, FaBullhorn, FaChartBar, FaChartPie, FaBookReader } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export type AdminView = 'dashboard' | 'users' | 'books' | 'active_loans' | 'returns_review' | 'fine_payments' | 'history' | 'broadcast';

interface SidebarProps {
  active: AdminView;
  onChange: (view: AdminView) => void;
}

const viewToPath: Record<AdminView, string> = {
  dashboard: '/admin-dashboard',
  users: '/admin-users',
  books: '/admin-buku',
  active_loans: '/admin-peminjaman-aktif',
  returns_review: '/admin-pengembalian',
  fine_payments: '/admin-denda',
  history: '/admin-riwayat',
  broadcast: '/admin-broadcast',
};
// ...existing code...

const AdminSidebar: React.FC<SidebarProps> = ({ active, onChange }) => {
  const navigate = useNavigate();
  const handleNav = (view: AdminView) => {
    onChange(view);
    navigate(viewToPath[view]);
  };
  return (
    <nav className="admin-sidebar" aria-label="Navigasi Dashboard Admin">
      <button className={`nav-item ${active === 'dashboard' ? 'active' : ''}`} onClick={() => handleNav('dashboard')}>
        <FaChartBar /> <span>Dashboard</span>
      </button>
      <button className={`nav-item ${active === 'users' ? 'active' : ''}`} onClick={() => handleNav('users')}>
        <FaUsers /> <span>Kelola Pengguna</span>
      </button>
      <button className={`nav-item ${active === 'books' ? 'active' : ''}`} onClick={() => handleNav('books')}>
        <FaBook /> <span>Kelola Buku</span>
      </button>
      <div className="nav-divider" role="separator" />
      <p className="nav-title">Peminjaman</p>
      <button className={`nav-item ${active === 'active_loans' ? 'active' : ''}`} onClick={() => handleNav('active_loans')}>
        <FaBookReader /> <span>Peminjaman Aktif</span>
      </button>
      <button className={`nav-item ${active === 'returns_review' ? 'active' : ''}`} onClick={() => handleNav('returns_review')}>
        <FaUndo /> <span>Review Pengembalian</span>
      </button>
      <button className={`nav-item ${active === 'fine_payments' ? 'active' : ''}`} onClick={() => handleNav('fine_payments')}>
        <FaMoneyBillWave /> <span>Verifikasi Denda</span>
      </button>
      <button className={`nav-item ${active === 'history' ? 'active' : ''}`} onClick={() => handleNav('history')}>
        <FaHistory /> <span>Riwayat</span>
      </button>
      <button className={`nav-item ${active === 'broadcast' ? 'active' : ''}`} onClick={() => handleNav('broadcast')}>
        <FaBullhorn /> <span>Broadcast Notif</span>
      </button>
    </nav>
  );
};

// Hapus duplikat, gunakan satu deklarasi saja (lihat bagian atas file)

export default AdminSidebar;