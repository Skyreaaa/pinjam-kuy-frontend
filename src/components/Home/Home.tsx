// File: frontend/src/components/Home/Home.tsx (SETELAH PERUBAHAN)

import React, { useState, useEffect } from 'react';
import { profileApi, loanApi } from '../../services/api';
import { API_BASE_URL } from '../../config/api';
import './Home.css';
import characterImage from '../../assets/menyapa.png';
import { FaBars, FaTimes } from 'react-icons/fa';
import logoImg from '../../assets/Logo-nobg.png';
import NotificationToast from '../common/NotificationToast';
import PushNotificationPrompt from '../common/PushNotificationPrompt';
import { useNavigate } from 'react-router-dom';

interface HomeProps {
  userData: {
    username?: string;
    prodi?: string;
    role?: string;
    npm?: string; 
    // TAMBAHKAN TYPE UNTUK DATA BARU:
    active_loans_count?: number; 
    denda?: number; 
    [key: string]: any;
  };
  profilePhoto: string | null;
  onMenuClick: (page: string) => void;
  onLogout: () => void;
}

const formatRupiah = (amount: number) => {
    const num = Number(amount);
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(num);
};


const Home: React.FC<HomeProps> = ({
  userData,
  profilePhoto,
  onMenuClick,
  onLogout
}) => {
  const navigate = useNavigate();
  // Semua hooks di awal
  const [activeFine, setActiveFine] = useState<number>(0);
  const [runningFine, setRunningFine] = useState<number>(0);
  const [unpaidFine, setUnpaidFine] = useState<number>(0);
  const [historicalTotal, setHistoricalTotal] = useState<number>(userData?.denda || 0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeLoansCount, setActiveLoansCount] = useState<number>(userData?.active_loans_count || 0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Hooks untuk navigasi login jika userData null, tapi tunggu inisialisasi selesai
  useEffect(() => {
    // Tunggu 200ms untuk memastikan userData sudah diinisialisasi dari localStorage
    const timer = setTimeout(() => setIsInitializing(false), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isInitializing && !userData) {
      navigate('/login');
    }
  }, [userData, navigate, isInitializing]);

  // Update URL untuk home page
  useEffect(() => {
    window.history.replaceState(null, '', '/home');
  }, []);

  // Ambil denda aktif (kombinasi denda berjalan + belum dibayar) saat mount / saat denda berubah
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const resp: any = await profileApi.activeFine();
        if (resp?.success && isMounted) {
          const rFine = resp.runningFine || 0;
          const uFine = resp.unpaidReturnedFine || 0;
          setRunningFine(rFine);
          setUnpaidFine(uFine);
          setActiveFine(rFine + uFine);
          if (typeof resp.historicalTotal === 'number') {
            setHistoricalTotal(resp.historicalTotal);
          }
        } else if (isMounted) {
          console.warn('[HOME] Gagal memuat activeFine (response unexpected):', resp);
        }
      } catch (e) {
        if (isMounted) console.error('[HOME] Error fetch activeFine:', e);
      }
    })();
    return () => { isMounted = false; };
  }, [userData?.denda]);

  // Ambil jumlah pinjaman aktif realtime (tidak hanya rely pada data login awal)
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try {
        const resp:any = await fetch(`${API_BASE_URL}/profile/active-loans-count`, { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }}).then(r=>r.json());
        if(!cancelled && resp?.success){ setActiveLoansCount(resp.activeLoans); }
      } catch(e){ /* ignore */ }
    })();
    const interval = setInterval(async()=>{
      try {
        const resp:any = await fetch(`${API_BASE_URL}/profile/active-loans-count`, { headers: { Authorization: `Bearer ${sessionStorage.getItem('token')}` }}).then(r=>r.json());
        if(resp?.success) setActiveLoansCount(resp.activeLoans);
      } catch {}
    }, 20000); // refresh setiap 20s
    return ()=>{ cancelled=true; clearInterval(interval); };
  }, []);

  // Polling ringan untuk notifikasi persetujuan pinjaman dan keputusan pengembalian (3s)
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const appr = await loanApi.notifications();
        if (!cancelled && appr?.success && appr.notifications?.length) {
          setToast({ message: 'Pinjaman Anda telah disetujui.', type: 'success' });
          try { await loanApi.ackNotifications(appr.notifications.map((n: any) => n.id)); } catch {}
        }
      } catch {}
      try {
        const ret = await loanApi.returnNotifications();
        if (!cancelled && ret?.success && ret.notifications?.length) {
          const first = ret.notifications[0];
          const msg = first.returnDecision === 'approved'
            ? `Pengembalian buku "${first.bookTitle}" disetujui.`
            : `Bukti pengembalian buku "${first.bookTitle}" ditolak. Mohon unggah ulang.`;
          setToast({ message: msg, type: first.returnDecision === 'approved' ? 'success' : 'error' });
          try { await loanApi.ackReturnNotifications(ret.notifications.map((n: any) => n.id)); } catch {}
        }
      } catch {}
      try {
        const rej = await loanApi.rejectionNotifications();
        if (!cancelled && rej?.success && rej.notifications?.length) {
          const first = rej.notifications[0];
          setToast({ message: `Pengajuan pinjaman untuk "${first.bookTitle}" ditolak.`, type: 'error' });
          try { await loanApi.ackRejectionNotifications(rej.notifications.map((n: any) => n.id)); } catch {}
        }
      } catch {}
    };
    const interval = setInterval(tick, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Setelah semua hooks, baru pengecekan userData
  if (isInitializing) {
    return <div className="home-container"><p>Memuat data pengguna...</p></div>;
  }
  if (!userData) {
    return <div className="home-container"><p>Silakan login untuk melanjutkan.</p></div>;
  }

  // Ambil kedua data langsung dari userData
  const { 
    username = 'Pengguna', 
    prodi = 'Prodi', 
    active_loans_count = 0, 
    denda = 0 
  } = userData;
  // activeFine = denda berjalan (overdue saat ini) + denda belum dibayar (returned belum dilunasi)
  
  return (
    <div className="home-container">
      <header className="home-header">
        <div className="logo-container">
           <img src={logoImg} alt="PinjamKuy Logo" className="logo" />
          <span className="app-name">PinjamKuy</span>
        </div>
        <button
          className="menu-toggle-button"
          onClick={() => setMenuOpen(prev => !prev)}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </header>

      {menuOpen && (
        <nav className="dropdown-menu open">
          <button className="dropdown-item" onClick={() => {
            navigate('/');
            setMenuOpen(false);
          }}>Home</button>
          <button className="dropdown-item" onClick={() => {
            onMenuClick('profile');
            setMenuOpen(false);
          }}>Profile</button>
          <button className="dropdown-item" onClick={() => {
            navigate('/borrowing-page');
            setMenuOpen(false);
          }}>Perpustakaan</button>
          <button className="dropdown-item" onClick={() => {
            navigate('/fines');
            setMenuOpen(false);
          }}>Bayar Denda</button>
          <button className="dropdown-item" onClick={() => {
            onMenuClick('notification-history');
            setMenuOpen(false);
          }}>Notifikasi</button>
  
          {userData.role === 'admin' && (
            <button className="dropdown-item" onClick={() => {
              navigate('/admin-dashboard');
              setMenuOpen(false);
            }}>Admin Dashboard</button>
          )}
          <button className="dropdown-item logout" onClick={() => {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('userData');
            sessionStorage.removeItem('lastActivity');
            window.location.replace('/');
          }}>Logout</button>
        </nav>
      )}

      <main className="dashboard-grid">
        <div className="card welcome-card">
          <div className="character-greeting">
            <img
              src={characterImage}
              alt="Menyapa"
              className="character-img"
            />
          </div>
          <h1 className="welcome-title">Selamat Datang!</h1>
          <p className="user-info">{username}</p>
          <p className="school-info">{prodi}</p>
        </div>
        
        {/* Card: Buku Dipinjam (klik untuk ke halaman pinjaman tab aktif) */} 
  <div className="info-card card borrowed clickable" onClick={() => { localStorage.setItem('initialBorrowTab','active'); localStorage.setItem('openLoansView','1'); onMenuClick('borrowing-page'); }}> 
          <div className="info-icon">📚</div>
          <p className="info-label">Buku Dipinjam</p>
          <h2 className="info-value">
            {activeLoansCount}
          </h2> 
        </div>

        {/* Card: Total Denda (klik untuk ke halaman pinjaman juga - bisa fokus tab aktif/historis) */} 
  <div className="info-card card late-fee clickable" onClick={() => { localStorage.setItem('initialBorrowTab','history'); localStorage.setItem('openLoansView','1'); onMenuClick('borrowing-page'); }}> 
          <div className="info-icon">💸</div>
          <p className="info-label">Denda Aktif</p>
          <h2 className="info-value" title={`Denda yang belum dibayar`}>
            {formatRupiah(unpaidFine)}
          </h2>
          <div className="fine-breakdown">
            <div className="bd-total-hist"><span className="bd-label bd-historical">Total Historis:</span> <span className="bd-val bd-historical-val">{formatRupiah(historicalTotal)}</span></div>
            {(historicalTotal > 0 && unpaidFine === 0) && (
              <div className="bd-note">Semua denda sudah dilunasi.</div>
            )}
          </div>
        </div>
      </main>

      {toast && (
        <NotificationToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {userData?.id && (
        <PushNotificationPrompt userId={userData.id} role="user" />
      )}
    </div>
  );
};

export default Home;
