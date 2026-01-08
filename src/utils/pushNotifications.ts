// Push Notifications Manager - Pinjam Kuy
import { API_BASE_URL } from '../config/api';

// VAPID public key - Generate this with web-push library
// Generated using: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = 'BGhFvr-14LSm6KqdJlcEZkBJ9DgPEjUoMG8i5cAbAw2wjnoOgqajf_8qUx0ibxd6hACUhySSoh-cxLPAUfY9Tfw';

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) {
    console.warn('Push notifications are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    console.log('✅ Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(
  userId: number,
  role: 'user' | 'admin'
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Check support
    if (!isPushNotificationSupported()) {
      return { success: false, message: 'Push notifications tidak didukung di browser ini' };
    }

    // 2. Request permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'Izin notifikasi ditolak' };
    }

    // 3. Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, message: 'Gagal mendaftar Service Worker' };
    }

    // 4. Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    console.log('✅ Push subscription:', subscription);

    // 5. Send subscription to backend
    const token = sessionStorage.getItem(role === 'admin' ? 'admin_token' : 'token');
    const response = await fetch(`${API_BASE_URL}/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        role,
        subscription: subscription.toJSON()
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Subscription saved to backend');
      return { success: true, message: 'Notifikasi push berhasil diaktifkan' };
    } else {
      console.error('❌ Failed to save subscription:', data);
      return { success: false, message: data.message || 'Gagal menyimpan subscription' };
    }
  } catch (error) {
    console.error('❌ Error subscribing to push:', error);
    return { success: false, message: 'Terjadi kesalahan saat mengaktifkan notifikasi push' };
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<{ success: boolean; message: string }> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return { success: false, message: 'Service Worker tidak ditemukan' };
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return { success: false, message: 'Tidak ada subscription aktif' };
    }

    const success = await subscription.unsubscribe();
    if (success) {
      console.log('✅ Unsubscribed from push notifications');
      return { success: true, message: 'Notifikasi push dinonaktifkan' };
    } else {
      return { success: false, message: 'Gagal menonaktifkan notifikasi push' };
    }
  } catch (error) {
    console.error('❌ Error unsubscribing:', error);
    return { success: false, message: 'Terjadi kesalahan' };
  }
}

/**
 * Check if user is subscribed
 */
export async function isSubscribed(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('❌ Error checking subscription:', error);
    return false;
  }
}

/**
 * Show a local notification (for testing)
 */
export async function showLocalNotification(
  title: string,
  body: string,
  icon?: string
): Promise<void> {
  if (!isPushNotificationSupported()) {
    console.warn('Notifications not supported');
    return;
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    registration.showNotification(title, {
      body,
      icon: icon || '/Logo-nobg.png',
      badge: '/Logo-nobg.png',
      tag: 'pinjam-kuy-local',
      requireInteraction: false,
      data: {
        url: window.location.origin
      }
    });
  }
}
