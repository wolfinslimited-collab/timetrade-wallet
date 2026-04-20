/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCBfKgjSvSy9tifr5I4EdI3wp2TQF0akHs",
  authDomain: "timetrade-81620.firebaseapp.com",
  projectId: "timetrade-81620",
  storageBucket: "timetrade-81620.firebasestorage.app",
  messagingSenderId: "166449318661",
  appId: "1:166449318661:web:bfa84ede000f784fbdc56c",
});

const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Timetrade Wallet";
  const options = {
    body: payload.notification?.body || "",
    icon: "/app-logo.png",
    badge: "/app-logo.png",
    data: payload.data,
  };
  self.registration.showNotification(title, options);
});