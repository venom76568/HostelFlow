// Firebase Cloud Messaging Service Worker
// This file is served from the root and handles BACKGROUND push notifications.
// Keep it lightweight to preserve battery life.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase config is injected at build time via the SW registration.
// We read it from a global set during registration, or fall back to defaults.
// NOTE: Replace these placeholder values with your actual Firebase project config.
firebase.initializeApp({
  apiKey:            self.__FIREBASE_API_KEY__            || "PLACEHOLDER_API_KEY",
  authDomain:        self.__FIREBASE_AUTH_DOMAIN__        || "PLACEHOLDER.firebaseapp.com",
  projectId:         self.__FIREBASE_PROJECT_ID__         || "PLACEHOLDER_PROJECT_ID",
  storageBucket:     self.__FIREBASE_STORAGE_BUCKET__     || "PLACEHOLDER.appspot.com",
  messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID__ || "PLACEHOLDER_SENDER_ID",
  appId:             self.__FIREBASE_APP_ID__             || "PLACEHOLDER_APP_ID",
});

const messaging = firebase.messaging();

// Handle background push messages (app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  const { title, body, data } = payload.notification || {};

  // Privacy-safe: only show a brief summary on the lock screen
  const notificationTitle = title || "Jainpro";
  const notificationOptions = {
    body: body || "You have a new update.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: data || {},
    // Vibrate pattern: short pulses (battery friendly)
    vibrate: [100, 50, 100],
    tag: data?.tag || "Jainpro-notification",
    renotify: true,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — deep-link to the right page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
