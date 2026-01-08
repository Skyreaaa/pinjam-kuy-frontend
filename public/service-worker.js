// Service Worker for Push Notifications - Pinjam Kuy
/* eslint-disable no-restricted-globals */

// Cache name
const CACHE_NAME = 'pinjam-kuy-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  let notificationData = {
    title: 'Pemberitahuan',
    body: 'Anda memiliki notifikasi baru',
    icon: '/Logo-nobg.png',
    badge: '/Logo-nobg.png',
    tag: 'pinjam-kuy-notification',
    requireInteraction: false,
    data: {}
  };

  if (event.data) {
    try {
      // Try to parse as JSON first
      const payload = event.data.json();
      console.log('[SW] Push payload (JSON):', payload);
      
      notificationData = {
        title: payload.title || 'Pemberitahuan',
        body: payload.message || payload.body || 'Anda memiliki notifikasi baru',
        icon: payload.icon || '/Logo-nobg.png',
        badge: '/Logo-nobg.png',
        tag: payload.tag || 'pinjam-kuy-notification',
        requireInteraction: payload.requireInteraction || false,
        data: payload.data || {},
        actions: payload.actions || []
      };
    } catch (e) {
      // If not JSON, treat as plain text
      console.log('[SW] Push payload (text):', event.data.text());
      notificationData.body = event.data.text();
    }
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    notificationData
  );

  event.waitUntil(promiseChain);
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  event.notification.close();

  // Get the URL to open from notification data
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync event (optional, for offline support)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  try {
    // Sync any pending notifications when back online
    console.log('[SW] Syncing notifications...');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}
