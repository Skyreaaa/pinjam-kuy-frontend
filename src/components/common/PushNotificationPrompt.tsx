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
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    autoSubscribe();
  }, []);

  const autoSubscribe = async () => {
    console.log('🚀 [PUSH] Auto-subscribe dipanggil untuk user:', userId, 'role:', role);
    
    if (!isPushNotificationSupported()) {
      console.warn('🔕 Push notifications not supported');
      return;
    }

    const alreadySubscribed = await isSubscribed();
    console.log('🔔 Already subscribed:', alreadySubscribed);
    
    if (alreadySubscribed) {
      console.log('✅ User sudah subscribe push notification');
      setSubscribed(true);
      return;
    }

    const permission = Notification.permission;
    console.log('🔔 Current Notification permission:', permission);

    // Auto-subscribe jika belum denied
    if (permission === 'denied') {
      console.log('🔕 Permission denied - tidak bisa subscribe');
      return;
    }

    // Tunggu 2 detik setelah login, lalu otomatis request permission + subscribe
    console.log('⏳ Akan request permission dalam 2 detik...');
    setTimeout(async () => {
      console.log('🔔 Memulai auto-subscribe...');
      try {
        const result = await subscribeToPushNotifications(userId, role);
        console.log('📊 Subscribe result:', result);
        
        if (result.success) {
          console.log('✅ Auto-subscribe berhasil!');
          setSubscribed(true);
        } else {
          console.error('❌ Auto-subscribe gagal:', result.message);
        }
      } catch (error) {
        console.error('❌ Error saat auto-subscribe:', error);
      }
    }, 2000);
  };

  // Komponen ini tidak render UI apapun
  // Semua proses subscribe berjalan di background secara otomatis
  return null;
};

export default PushNotificationPrompt;
