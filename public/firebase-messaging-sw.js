// Firebase Messaging Service Worker
// This file must be named exactly firebase-messaging-sw.js and placed in /public

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase
firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY || '',
  authDomain: self.FIREBASE_AUTH_DOMAIN || '',
  projectId: self.FIREBASE_PROJECT_ID || '',
  storageBucket: self.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: self.FIREBASE_APP_ID || ''
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const { title, body, icon, image, data } = payload.notification || {};

  const notificationTitle = title || 'vibemeet';
  const notificationOptions = {
    body: body || '',
    icon: icon || '/icon-192.png',
    image: image,
    badge: '/icon-192.png',
    data: data || {},
    actions: [
      { action: 'open', title: 'Apri' },
      { action: 'dismiss', title: 'Ignora' }
    ],
    requireInteraction: false,
    tag: data?.notificationId || 'vibemeet-notification'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  // Navigate based on notification type
  if (data.type === 'message') url = `/messages/${data.userId}`;
  else if (data.type === 'post') url = `/feed`;
  else if (data.type === 'event') url = `/events/${data.eventId}`;
  else if (data.type === 'profile') url = `/u/${data.username}`;
  else if (data.type === 'safe_home') url = `/safety`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
