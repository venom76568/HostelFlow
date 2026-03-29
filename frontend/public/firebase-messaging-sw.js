// Firebase Cloud Messaging Service Worker
// This file is served from the root and handles BACKGROUND push notifications.
// Keep it lightweight to preserve battery life.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Parse config from query params (passed during registration in notifications.ts)
const urlParams = new URL(self.location).searchParams;
const firebaseConfig = {
  apiKey:            urlParams.get("apiKey")            || "PLACEHOLDER_API_KEY",
  authDomain:        urlParams.get("authDomain")        || "PLACEHOLDER.firebaseapp.com",
  projectId:         urlParams.get("projectId")         || "PLACEHOLDER_PROJECT_ID",
  storageBucket:     urlParams.get("storageBucket")     || "PLACEHOLDER.appspot.com",
  messagingSenderId: urlParams.get("messagingSenderId") || "PLACEHOLDER_SENDER_ID",
  appId:             urlParams.get("appId")             || "PLACEHOLDER_APP_ID",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background push messages (app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  const { title, body, data } = payload.notification || {};

  // Privacy-safe: only show a brief summary on the lock screen
  const notificationTitle = title || "JainPro";
  const notificationOptions = {
    body: body || "You have a new update.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: data || {},
    // Vibrate pattern: short pulses (battery friendly)
    vibrate: [100, 50, 100],
    tag: data?.tag || "JainPro-notification",
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
