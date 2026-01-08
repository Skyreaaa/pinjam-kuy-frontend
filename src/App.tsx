// File: App.tsx (SUDAH DIPERBAIKI)
import React, { useState, useEffect, useCallback } from 'react';
import GlobalNotificationListener from './components/common/GlobalNotificationListener';
import { profileApi } from './services/api';
import SplashScreen from './components/SplashScreen';
import Login from './components/Login/Login';
import LandingPage from './components/LandingPage/LandingPage';
import Information from './components/LandingPage/Information';
import BookCollectionPage from './components/BookCollection/BookCollectionPage';
import Home from './components/Home/Home';
import { useNavigate } from 'react-router-dom';
import Profile from './components/Profile/Profile';
// Asumsi komponen-komponen ini ada:

import AdminDashboard from './components/DashboardAdmin/AdminDashboard'; 
import BorrowingPage from './components/Peminjaman/BorrowingPage';
import LoansPage from './components/Peminjaman/LoansPage';
import NotificationHistory from './components/Peminjaman/NotificationHistory';
import FinePaymentPage from './components/Peminjaman/FinePaymentPage';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import BookDetailPage from './components/BookCollection/BookDetailPage';

import { Loan } from './types';
import defaultAvatar from './assets/Avatar.jpg'; 
import { API_BASE_URL } from './config/api';

// Data pinjaman masih dummy/simulasi untuk bagian selain Profile
const INITIAL_DUMMY_LOANS: Loan[] = [
  { id: 0, bookTitle: 'Homo Deus', kodeBuku: 'SCI-2015-C', loanDate: '2025-10-01', returnDate: '2025-10-08', status: 'Menunggu Persetujuan', kodePinjam: 'KUY-1A2B3C', penaltyAmount: 0, actualReturnDate: null, location: 'Rak A' },
];


function RequireAuth({ children, role }: { children: JSX.Element, role?: 'admin' | 'user' }) {
  const location = useLocation();
  // Ambil token user/admin dari sessionStorage
  const token = sessionStorage.getItem('token') || sessionStorage.getItem('admin_token');
  const userDataStr = sessionStorage.getItem('userData');
  let userRole: string | undefined = undefined;
  if (userDataStr) {
    try {
      userRole = JSON.parse(userDataStr).role;
    } catch {}
  }
  if (!token || !userDataStr) {
    // Jika tidak ada token/userData, redirect paksa ke login
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('userData');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (role === 'admin' && userRole !== 'admin') {
    return <Navigate to="/home" replace />;
  }
  if (role === 'user' && userRole !== 'user') {
    return <Navigate to="/admin-user" replace />;
  }
  return children;
}

function App() {
  // Custom navigation hook for Home's onMenuClick
  const navigate = (window as any).navigate || (() => {});
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(defaultAvatar);
  const [loans, setLoans] = useState<Loan[]>(INITIAL_DUMMY_LOANS);

  // Untuk akses file statis (uploads) derive dari API_BASE_URL terpusat
  const API_URL = API_BASE_URL.replace(/\/api\/?$/, '');
  const getUserDataFromStorage = () => {
    const userDataStr = sessionStorage.getItem('userData');
    return userDataStr ? JSON.parse(userDataStr) : null;
  };

  // Handler login
  const handleLogin = (data: { token: string; userData: any; redirectPath: string }) => {
    if (!data.token || !data.userData) {
      alert('Login gagal: token atau data user tidak valid.');
      return;
    }
    try {
      // Simpan token sesuai role
      if (data.userData.role === 'admin') {
        sessionStorage.setItem('admin_token', data.token);
        sessionStorage.removeItem('token');
      } else {
        sessionStorage.setItem('token', data.token);
        sessionStorage.removeItem('admin_token');
      }
      sessionStorage.setItem('userData', JSON.stringify(data.userData));
      setUserData(data.userData);
      setIsLoggedIn(true);
      let photoUrl = defaultAvatar;
      if (data.userData.profile_photo_url) {
        if (/^https?:\/\//.test(data.userData.profile_photo_url)) {
          photoUrl = data.userData.profile_photo_url;
        } else {
          photoUrl = `${API_URL}${data.userData.profile_photo_url}`;
        }
      }
      setProfilePhoto(photoUrl);
      // Debug log
      console.log('[LOGIN] Token:', data.token);
      console.log('[LOGIN] userData:', data.userData);
    } catch (e) {
      alert('Login gagal: error menyimpan data user.');
      setIsLoggedIn(false);
      setUserData(null);
      setProfilePhoto(defaultAvatar);
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('userData');
    }
  };

  // Handler logout
  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('userData');
    setIsLoggedIn(false);
    setUserData(null);
    setProfilePhoto(defaultAvatar);
    // Paksa redirect ke landing page, tidak ke login
    window.location.replace('/');
  }, []);

  // Inisialisasi user dari localStorage
  useEffect(() => {
    // Cek token user/admin dari sessionStorage
    const token = sessionStorage.getItem('token') || sessionStorage.getItem('admin_token');
    const userDataStr = sessionStorage.getItem('userData');
    if (token && userDataStr) {
      try {
        const data = JSON.parse(userDataStr);
        setUserData(data);
        setIsLoggedIn(true);
        let photoUrl = defaultAvatar;
        if (data.profile_photo_url) {
          if (/^https?:\/\//.test(data.profile_photo_url)) {
            photoUrl = data.profile_photo_url;
          } else {
            photoUrl = `${API_URL}${data.profile_photo_url}`;
          }
        }
        setProfilePhoto(photoUrl);
      } catch (e) {
        handleLogout();
      }
    } else {
      setProfilePhoto(defaultAvatar);
      setIsLoggedIn(false);
      setUserData(null);
    }
    setTimeout(() => setShowSplash(false), 1000);
  }, [handleLogout, API_URL]);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage 
          isLoggedIn={isLoggedIn}
          userData={userData}
          onNavigateToLogin={() => window.location.href = '/login'}
          onNavigateToDashboard={() => {
            if (userData?.role === 'admin') window.location.href = '/admin-user';
            else window.location.href = '/home';
          }}
          onNavigateToCollection={() => window.location.href = '/collection'}
          onNavigateToInformation={() => window.location.href = '/information'}
        />} />
        <Route path="/landing" element={<LandingPage 
          onNavigateToLogin={() => window.location.href = '/login'}
          onNavigateToCollection={() => window.location.href = '/collection'}
          onNavigateToInformation={() => window.location.href = '/information'}
        />} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/collection" element={<BookCollectionPage 
          onNavigateToLogin={() => window.location.href = '/login'}
          onNavigateToLanding={() => window.location.href = '/'}
        />} />
        <Route path="/information" element={<Information 
          onBack={() => window.location.href = '/'}
          onNavigateToLogin={() => window.location.href = '/login'}
          onNavigateToCollection={() => window.location.href = '/collection'}
          onNavigateToInformation={() => window.location.href = '/information'}
        />} />
        <Route path="/book/:id" element={<BookDetailPage />} />
        <Route path="/home" element={
          <RequireAuth role="user">
            <Home
              userData={userData}
              profilePhoto={profilePhoto}
              onMenuClick={(page) => {
                if (page === 'profile') {
                  window.location.href = '/profile';
                } else if (page === 'borrowing-page') {
                  window.location.href = '/borrowing-page';
                } else if (page === 'notification-history') {
                  window.location.href = '/notification-history';
                }
              }}
              onLogout={handleLogout}
            />
          </RequireAuth>
        } />
        <Route path="/notification-history" element={<NotificationHistory onBack={() => window.location.href = '/home'} />} />
        <Route path="/profile" element={<Profile
          userData={userData}
          profilePhoto={profilePhoto}
          setProfilePhoto={setProfilePhoto}
          onPhotoUpdate={async (file, npm, cb) => {
            try {
              const resp = await profileApi.uploadPhoto(file);
              if (resp && resp.profile_photo_url) {
                const photoUrl = `${API_URL}${resp.profile_photo_url}`;
                setProfilePhoto(photoUrl);
                // update userData in localStorage and state
                const newUserData = { ...userData, profile_photo_url: resp.profile_photo_url };
                setUserData(newUserData);
                sessionStorage.setItem('userData', JSON.stringify(newUserData));
                cb(true, 'Foto berhasil diunggah!');
              } else {
                cb(false, resp?.message || 'Gagal upload foto.');
              }
            } catch (e) {
              cb(false, 'Gagal upload foto.');
            }
          }}
          onProfileSave={async (updatedData) => {
            try {
              const resp = await profileApi.updateBiodata(updatedData);
              if (resp && resp.success && resp.user) {
                setUserData(resp.user);
                sessionStorage.setItem('userData', JSON.stringify(resp.user));
                return { success: true, message: resp.message || 'Biodata berhasil diperbarui.' };
              } else {
                return { success: false, message: resp?.message || 'Gagal memperbarui biodata.' };
              }
            } catch (e) {
              return { success: false, message: 'Gagal memperbarui biodata.' };
            }
          }}
          onBack={() => window.location.href = '/home'}
          onDeletePhoto={async (npm, cb) => {
            try {
              const resp = await profileApi.deletePhoto();
              setProfilePhoto(defaultAvatar);
              const newUserData = { ...userData, profile_photo_url: null };
              setUserData(newUserData);
              sessionStorage.setItem('userData', JSON.stringify(newUserData));
              cb(true, 'Foto profil berhasil dihapus.');
            } catch (e) {
              cb(false, 'Gagal menghapus foto profil.');
            }
          }}
        />} />
        <Route path="/admin-dashboard" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
        <Route path="/admin-user" element={<RequireAuth role="admin"><AdminDashboard initialView="users" /></RequireAuth>} />
        <Route path="/admin-buku" element={<RequireAuth role="admin"><AdminDashboard initialView="books" /></RequireAuth>} />
        <Route path="/admin-peminjaman-aktif" element={<RequireAuth role="admin"><AdminDashboard initialView="active_loans" /></RequireAuth>} />
        <Route path="/admin-pengembalian" element={<RequireAuth role="admin"><AdminDashboard initialView="returns_review" /></RequireAuth>} />
        <Route path="/admin-denda" element={<RequireAuth role="admin"><AdminDashboard initialView="fine_payments" /></RequireAuth>} />
        <Route path="/admin-riwayat" element={<RequireAuth role="admin"><AdminDashboard initialView="history" /></RequireAuth>} />
        <Route path="/admin-broadcast" element={<RequireAuth role="admin"><AdminDashboard initialView="broadcast" /></RequireAuth>} />
        <Route path="/borrowing-page" element={<BorrowingPage userData={userData} onBack={() => window.history.back()} />} />
        <Route path="/borrowing-page/book/:bookId" element={<BorrowingPage userData={userData} onBack={() => window.history.back()} />} />
        <Route path="/loans" element={<LoansPage />} />
        <Route path="/fines" element={<FinePaymentPage />} />
        {/* Tambahkan route lain sesuai kebutuhan */}
      </Routes>
      <GlobalNotificationListener />
    </BrowserRouter>
  );
}

export default App;