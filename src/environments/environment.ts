export const environment = {
    production: true,
    apiUrl: 'http://localhost:7002/landingRome',
    // Arranque: en línea sólo se agendan promociones (el backend lo exige con AGENDA_WEB_SOLO_PROMOS)
    agendaSoloPromos: true,
    // Arranque: el catálogo y la compra de membresías en línea no se muestran (recepción las sigue vendiendo)
    membresiasPublicas: false,
    firebase: {
        apiKey: "AIzaSyDmB8QenfIzGCVqvKt02rWi3y3omirHSTU",
        authDomain: "crm-rome.firebaseapp.com",
        projectId: "crm-rome",
        storageBucket: "crm-rome.firebasestorage.app",
        messagingSenderId: "480630286970",
        appId: "1:480630286970:web:d37f75d76d94d7b33969c3"
    },
    vapidKey: "BNiKa0Ahn6bHkICwY8LGc0hdNQDVj_dlvHbOheOy5Z8-yBusSlSfQ_1RUaIjujVxRRNQLw8VxGfqo-K8Tky9wdg"
};