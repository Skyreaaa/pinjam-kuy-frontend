import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import './Login.css';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import depanPerpusImg from '../../assets/depan-perpus.png';
import dalamPerpusImg from '../../assets/dalam-perpus.png';
import kasirPerpusImg from '../../assets/kasir-perpus.png';
import lt2PerpusImg from '../../assets/lt2-perpus.png';
import logoImg from '../../assets/Logo-nobg.png';

interface UserData {
  id: string;
  npm: string;
  role: 'admin' | 'user';
  [key: string]: any;
}

interface LoginSuccessData {
  token: string;
  userData: UserData;
  redirectPath: string;
}

interface LoginProps {
  onLogin: (data: LoginSuccessData) => void;
}

const slideshowImages = [depanPerpusImg, dalamPerpusImg, kasirPerpusImg, lt2PerpusImg];

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [npm, setNpm] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    window.history.replaceState(null, '', '/login');
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % slideshowImages.length);
    }, 5000); // Ganti gambar setiap 5 detik
    return () => clearInterval(interval);
  }, []);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, userData } = await authApi.login(npm, password);
      const redirectPath = userData && userData.role === 'admin' ? '/admin-dashboard' : '/home';
      onLogin({ token, userData, redirectPath });
      navigate(redirectPath);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Gagal masuk. Periksa NPM dan kata sandi Anda atau koneksi server.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ height: '100vh', width: '100%' }}>
      <div className="login-bg-slideshow-wrapper">
        {slideshowImages.map((img, idx) => (
          <div
            key={idx}
            className={`login-bg-slideshow${idx === currentImageIndex ? ' active' : ''}`}
            style={{
              backgroundImage: `url(${img})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100vh',
              zIndex: 0
            }}
          />
        ))}
        <div className="login-bg-blur" />
      </div>
      <div className="login-card" style={{ position: 'relative', zIndex: 1 }}>
        <div className="login-header">
          <img src={logoImg} alt="PinjamKuy Logo" className="logo" />
          <h1>Halo, Selamat Datang!</h1>
          <p>Silakan masuk untuk melanjutkan</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <input 
              type="text" 
              id="npm" 
              placeholder="NPM" 
              value={npm} 
              onChange={(e) => setNpm(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <div className="password-input-wrapper">
              <input 
                type={showPassword ? 'text' : 'password'} 
                id="password" 
                placeholder="Kata Sandi" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              <span className="password-toggle" onClick={togglePasswordVisibility}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>
          <div className="form-options">
            <div className="remember-me">
              <input type="checkbox" id="rememberMe" />
              <label htmlFor="rememberMe">Ingat Saya</label>
            </div>
          </div>
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Memproses...' : 'MASUK'}
          </button>
          {error && <p className="error-message">{error}</p>}
        </form>
      </div>
    </div>
  );
};

export default Login;
