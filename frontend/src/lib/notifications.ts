import { getToken, onMessage } from "firebase/messaging";
import { getMessagingInstance } from "./firebase";
import { getAuthToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

// localStorage key for the user's notification preference
const NOTIF_PREF_KEY = "notifications_enabled";

/** Check if user has opted in to notifications */
export const isNotificationsEnabled = (): boolean => {
  return localStorage.getItem(NOTIF_PREF_KEY) !== "false";
};

/** Save user's notification preference */
export const setNotificationsEnabled = (enabled: boolean): void => {
  localStorage.setItem(NOTIF_PREF_KEY, enabled ? "true" : "false");
};

/**
 * Request notification permission from the browser, get the FCM token,
 * and POST it to the backend so the server can send targeted pushes.
 *
 * Call this once after login if notifications are enabled.
 * Safe to call multiple times — it registers the SW and refreshes the token.
 */
export const requestNotificationPermission = async (): Promise<void> => {
  if (!isNotificationsEnabled()) return;
  if (!("Notification" in window)) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // Register the FCM service worker manually (must be at root scope)
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ("serviceWorker" in navigator) {
      swRegistration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
        { scope: "/" }
      );
    }

    const messaging = await getMessagingInstance();
    if (!messaging) return;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) return;

    // Save token to backend
    const authToken = getAuthToken();
    if (!authToken) return;

    await fetch(`${API_URL}/notifications/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    // Non-fatal: notifications are a nice-to-have, not a hard requirement
    console.warn("[HostelFlow] Could not register for push notifications:", err);
  }
};

/**
 * Listen for foreground push messages (app is open/focused).
 * Use this to show a toast notification inside the app UI.
 *
 * @param callback - receives { title, body, data } from the push payload
 */
export const onForegroundMessage = async (
  callback: (payload: { title: string; body: string; data?: Record<string, string> }) => void
): Promise<(() => void) | undefined> => {
  const messaging = await getMessagingInstance();
  if (!messaging) return undefined;

  const unsubscribe = onMessage(messaging, (payload) => {
    callback({
      title: payload.notification?.title || "HostelFlow",
      body: payload.notification?.body || "You have a new update.",
      data: (payload.data as Record<string, string>) || {},
    });
  });

  return unsubscribe;
};
