// Push Notification Prompt Component
import React, { useEffect, useState } from 'react';
import { 
  isPushNotificationSupported, 
  subscribeToPushNotifications, 
  isSubscribed,
  requestNotificationPermission 
} from '../../utils/pushNotifications';
import './PushNotificationPrompt.css';

interface PushNotificationPromptProps {
  userId: number;
  role: 'user' | 'admin';
}

const PushNotificationPrompt: React.FC<PushNotificationPromptProps> = ({ userId, role }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    if (!isPushNotificationSupported()) {
      return; // Don't show prompt if not supported
    }

    const permission = Notification.permission;
    const alreadySubscribed = await isSubscribed();
    
    setSubscribed(alreadySubscribed);

    // Show prompt if:
    // - Permission is default (not asked yet)
    // - Not already subscribed
    // - Not dismissed in this session
    const dismissed = sessionStorage.getItem('push-prompt-dismissed');
    if (permission === 'default' && !alreadySubscribed && !dismissed) {
      // Show after 5 seconds
      setTimeout(() => setShowPrompt(true), 5000);
    }
  };

  const handleEnable = async () => {
    setIsLoading(true);
    const result = await subscribeToPushNotifications(userId, role);
    setIsLoading(false);

    if (result.success) {
      setSubscribed(true);
      setShowPrompt(false);
      alert('✅ Notifikasi push berhasil diaktifkan!');
    } else {
      alert(`❌ ${result.message}`);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('push-prompt-dismissed', 'true');
  };

  if (!showPrompt || subscribed) {
    return null;
  }

  return (
    <div className="push-prompt-overlay">
      <div className="push-prompt-card">
        <div className="push-prompt-icon">🔔</div>
        <h3>Aktifkan Notifikasi Push?</h3>
        <p>
          Dapatkan notifikasi penting langsung di perangkat Anda, bahkan saat aplikasi tidak dibuka.
        </p>
        <div className="push-prompt-features">
          <div className="feature-item">
            <span className="feature-icon">📚</span>
            <span>Update peminjaman buku</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⏰</span>
            <span>Pengingat tenggat pengembalian</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">💰</span>
            <span>Notifikasi denda & pembayaran</span>
          </div>
          {role === 'admin' && (
            <div className="feature-item">
              <span className="feature-icon">👥</span>
              <span>Alert peminjaman baru</span>
            </div>
          )}
        </div>
        <div className="push-prompt-actions">
          <button 
            className="btn-enable-push" 
            onClick={handleEnable}
            disabled={isLoading}
          >
            {isLoading ? 'Mengaktifkan...' : '✓ Aktifkan Sekarang'}
          </button>
          <button 
            className="btn-dismiss-push" 
            onClick={handleDismiss}
            disabled={isLoading}
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationPrompt;
