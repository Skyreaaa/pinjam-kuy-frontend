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
import BorrowingPage, { Loan } from './components/Peminjaman/BorrowingPage'; 
import NotificationHistory from './components/Peminjaman/NotificationHistory';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BookDetailPage from './components/BookCollection/BookDetailPage';

import defaultAvatar from './assets/Avatar.jpg'; 
import { API_BASE_URL } from './config/api';

// Data pinjaman masih dummy/simulasi untuk bagian selain Profile
const INITIAL_DUMMY_LOANS: Loan[] = [
  { id: 0, bookTitle: 'Homo Deus', kodeBuku: 'SCI-2015-C', loanDate: '2025-10-01', returnDate: '2025-10-08', status: 'Menunggu Persetujuan', kodePinjam: 'KUY-1A2B3C', penaltyAmount: 0, actualReturnDate: null, location: 'Rak A' },
];

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
    const userDataStr = localStorage.getItem('userData');
    return userDataStr ? JSON.parse(userDataStr) : null;
  };

  // Handler login
  const handleLogin = (data: { token: string; userData: any; redirectPath: string }) => {
    if (data.token && data.userData) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userData', JSON.stringify(data.userData));
      setUserData(data.userData);
      setIsLoggedIn(true);
      const photoUrl = data.userData.profile_photo_url ? `${API_URL}${data.userData.profile_photo_url}` : defaultAvatar;
      setProfilePhoto(photoUrl);
    }
  };

  // Handler logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setIsLoggedIn(false);
    setUserData(null);
    setProfilePhoto(defaultAvatar);
  }, []);

  // Inisialisasi user dari localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userDataStr = localStorage.getItem('userData');
    if (token && userDataStr) {
      try {
        const data = JSON.parse(userDataStr);
        setUserData(data);
        setIsLoggedIn(true);
        const photoUrl = data.profile_photo_url ? `${API_URL}${data.profile_photo_url}` : defaultAvatar;
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
          onNavigateToLogin={() => window.location.href = '/login'}
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
        <Route path="/home" element={<Home
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
        />} />
        <Route path="/notification-history" element={<NotificationHistory onBack={() => window.location.href = '/home'} />} />
        <Route path="/profile" element={<Profile
          userData={userData}
          profilePhoto={profilePhoto}
          onPhotoUpdate={async (file, npm, cb) => {
            try {
              const resp = await profileApi.uploadPhoto(file);
              if (resp && resp.profile_photo_url) {
                const photoUrl = `${API_URL}${resp.profile_photo_url}`;
                setProfilePhoto(photoUrl);
                // update userData in localStorage and state
                const newUserData = { ...userData, profile_photo_url: resp.profile_photo_url };
                setUserData(newUserData);
                localStorage.setItem('userData', JSON.stringify(newUserData));
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
                localStorage.setItem('userData', JSON.stringify(resp.user));
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
              localStorage.setItem('userData', JSON.stringify(newUserData));
              cb(true, 'Foto profil berhasil dihapus.');
            } catch (e) {
              cb(false, 'Gagal menghapus foto profil.');
            }
          }}
        />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/borrowing-page" element={<BorrowingPage userData={userData} onBack={() => window.history.back()} />} />
        <Route path="/borrowing-page/book/:bookId" element={<BorrowingPage userData={userData} onBack={() => window.history.back()} />} />
        <Route path="/loans" element={<BorrowingPage userData={userData} onBack={() => window.history.back()} />} />
        {/* Tambahkan route lain sesuai kebutuhan */}
      </Routes>
      <GlobalNotificationListener />
    </BrowserRouter>
  );
}

export default App;