// Import the Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Parse the firebase config from the query string
const urlParams = new URLSearchParams(location.search);

const firebaseConfig = {
  apiKey: urlParams.get('apiKey'),
  authDomain: urlParams.get('authDomain'),
  projectId: urlParams.get('projectId'),
  storageBucket: urlParams.get('storageBucket'),
  messagingSenderId: urlParams.get('messagingSenderId'),
  appId: urlParams.get('appId')
};

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);

  // Retrieve an instance of Firebase Messaging so that it can handle background
  // messages.
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification?.title || 'Siyayya Notification';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new notification.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: payload.data, // Contains the URL to open
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.warn('Firebase config missing in SW registration URL. Background messages will not work.');
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Open the link attached to the notification data, or the home page
  const urlToOpen = event.notification.data?.link || '/notifications';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
