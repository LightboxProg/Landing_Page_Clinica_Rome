import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./firebase-messaging-sw.js')
        .then(reg => console.log('Firebase Service Worker registrado con éxito:', reg.scope))
        .catch(err => console.error('Error al registrar Firebase Service Worker:', err));
    }
  })
  .catch((err) => console.error(err));
