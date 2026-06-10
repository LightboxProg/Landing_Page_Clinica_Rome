import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PushNotificationService } from './services/notifications/push-notification.service';
import { SwalService } from './services/swal/swal.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'Landing_Page_Clinica_Rome';

  constructor(
    private pushService: PushNotificationService,
    private swalService: SwalService
  ) {}

  ngOnInit(): void {
    this.pushService.listenForMessages();
    this.pushService.message$.subscribe((payload) => {
      if (payload && payload.notification) {
        // Mostrar Toast
        this.swalService.toast(
          payload.notification.body,
          payload.notification.title,
          'info'
        );
      }
    });
  }
}
