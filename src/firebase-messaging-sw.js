importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDmB8QenfIzGCVqvKt02rWi3y3omirHSTU",
    authDomain: "crm-rome.firebaseapp.com",
    projectId: "crm-rome",
    storageBucket: "crm-rome.firebasestorage.app",
    messagingSenderId: "480630286970",
    appId: "1:480630286970:web:d37f75d76d94d7b33969c3",
    measurementId: "G-DFVK5R7BXR"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Notificación recibida en segundo plano: ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/assets/icons/icon-128x128.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
