import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatService, ChatConversation } from '../../services/chat/chat.service';
import { AuthService } from '../../services/auth/auth.service';
import { PacientesService } from '../../services/pacientes/pacientes.service';
import { LeadsService } from '../../services/leads/leads.service';
import { ChatSidebarComponent } from '../../components/chat/chat-sidebar/chat-sidebar.component';
import { ChatWindowComponent } from '../../components/chat/chat-window/chat-window.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-chats',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatSidebarComponent, ChatWindowComponent],
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.css'
})
export class ChatsComponent implements OnInit {
  conversaciones: ChatConversation[] = [];
  tipoSeleccionado: 'Lead' | 'Paciente' = 'Lead';
  conversacionActiva: ChatConversation | null = null;
  mensajes: any[] = [];
  nuevoMensaje = '';
  filtro = '';
  isDarkMode = false;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private pacientesService: PacientesService,
    private leadsService: LeadsService,
    private router: Router
  ) {}

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
  }

  ngOnInit() {
    this.cargarConversaciones();
  }

  cargarConversaciones() {
    this.chatService.obtenerConversaciones(this.tipoSeleccionado).subscribe(data => {
      if (data && data.length > 0) {
        this.conversaciones = data;
      } else {
        this.conversaciones = this.getMockConversations();
      }
    });
  }

  getMockConversations(): any[] {
    if (this.tipoSeleccionado === 'Lead') {
      return [
        {
          _id: 'l1',
          contacto: { nombre: 'Lucía Fernández' },
          ultimoMensaje: { body: 'Hola, me interesa el tratamiento de Botox.', timestamp: new Date(), contactType: 'Lead' },
          mensajesSinLeer: 2
        },
        {
          _id: 'l2',
          contacto: { nombre: 'Carlos Ruiz' },
          ultimoMensaje: { body: '¿Qué costo tiene la valoración inicial?', timestamp: new Date(Date.now() - 3600000), contactType: 'Lead' },
          mensajesSinLeer: 0
        }
      ];
    } else {
      return [
        {
          _id: 'p1',
          contacto: { nombre: 'María García' },
          ultimoMensaje: { body: 'Ya estoy en camino a mi cita.', timestamp: new Date(), contactType: 'Paciente' },
          mensajesSinLeer: 1
        },
        {
          _id: 'p2',
          contacto: { nombre: 'Juan Pérez' },
          ultimoMensaje: { body: 'Muchas gracias por la atención.', timestamp: new Date(Date.now() - 86400000), contactType: 'Paciente' },
          mensajesSinLeer: 0
        }
      ];
    }
  }

  cambiarTipo(tipo: 'Lead' | 'Paciente') {
    this.tipoSeleccionado = tipo;
    this.conversacionActiva = null;
    this.mensajes = [];
    this.cargarConversaciones();
  }

  seleccionarConversacion(conv: ChatConversation) {
    this.conversacionActiva = conv;
    this.chatService.obtenerMensajes(conv._id).subscribe(data => {
      if (data && data.length > 0) {
        this.mensajes = data;
      } else {
        this.mensajes = this.getMockMessages(conv);
      }
      conv.mensajesSinLeer = 0;
    });
  }

  getMockMessages(conv: any): any[] {
    const nombre = this.getNombreContacto(conv);
    return [
      { from: 'USER', body: `Hola, me gustaría recibir más información.`, timestamp: new Date(Date.now() - 3600000) },
      { from: 'SYSTEM', body: `¡Hola ${nombre}! Soy la asistente virtual. ¿En qué tratamiento estás interesado?`, timestamp: new Date(Date.now() - 3500000) },
      { from: 'USER', body: conv.ultimoMensaje.body, timestamp: conv.ultimoMensaje.timestamp },
      { from: 'SYSTEM', body: `Excelente elección. Contamos con especialistas certificados para ese procedimiento.`, timestamp: new Date() }
    ];
  }

  enviarMensaje(body: string) {
    if (!body.trim() || !this.conversacionActiva) return;

    const payload = {
      contactId: this.conversacionActiva._id,
      contactType: this.tipoSeleccionado,
      body: body
    };

    this.chatService.enviarMensaje(payload).subscribe(msg => {
      this.mensajes.push(msg);
      this.nuevoMensaje = '';
      if (this.conversacionActiva) {
        this.conversacionActiva.ultimoMensaje = msg;
      }
    });
  }

  // --- CRM Handlers ---

  handleAgendar(conv: any) {
    const user = this.authService.getUsuario();
    if (user?.tipo === 'Doctor' || user?.tipo === 'Especialista') {
      // Ir directamente a su agenda
      this.router.navigate(['/admin/gestion'], { queryParams: { doctor: user.id } });
    } else {
      // Admin o Recepcionista: Escoger tipo de cita
      Swal.fire({
        title: 'Nueva Cita',
        text: 'Selecciona el departamento:',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Estética',
        denyButtonText: 'Dental',
        showDenyButton: true,
        confirmButtonColor: '#C5A028',
        denyButtonColor: '#1a2b3c'
      }).then((result) => {
        if (result.isConfirmed || result.isDenied) {
          this.router.navigate(['/admin/gestion'], { 
            queryParams: { 
              tipo: result.isConfirmed ? 'Estetica' : 'Dental',
              nombre: this.getNombreContacto(conv)
            } 
          });
        }
      });
    }
  }

  handleExpediente(conv: any) {
    if (this.tipoSeleccionado === 'Paciente') {
      this.router.navigate(['/admin/pacientes/perfil', conv.contacto._id]);
    } else {
      Swal.fire({
        title: 'Lead (Prospecto)',
        text: 'Este contacto aún no es paciente. ¿Deseas convertirlo?',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Ver Lead',
        confirmButtonColor: '#C5A028'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/admin/leads']);
        }
      });
    }
  }

  handleNota(conv: any) {
    Swal.fire({
      title: 'Añadir Nota',
      input: 'textarea',
      inputPlaceholder: 'Escribe aquí tu observación sobre este contacto...',
      inputAttributes: {
        'aria-label': 'Escribe aquí tu observación'
      },
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      confirmButtonColor: '#C5A028'
    }).then((text) => {
      if (text.value) {
        if (this.tipoSeleccionado === 'Lead') {
          this.leadsService.crearOActualizarLead({ _id: conv.contacto._id, notas: text.value }).subscribe(() => {
            Swal.fire('Guardado', 'La nota se ha añadido al lead.', 'success');
          });
        } else {
          this.pacientesService.actualizarPaciente(conv.contacto._id, { apodo: text.value }).subscribe(() => {
            // Nota: Aquí podrías tener un campo específico de notas en Paciente, 
            // por ahora usamos un ejemplo de actualización.
            Swal.fire('Guardado', 'La nota se ha añadido al expediente.', 'success');
          });
        }
      }
    });
  }

  cerrarChat() {
    this.conversacionActiva = null;
    this.mensajes = [];
  }

  get filtradas() {
    return this.conversaciones.filter(c => {
      const nombre = this.getNombreContacto(c);
      return nombre.toLowerCase().includes(this.filtro.toLowerCase());
    });
  }

  getNombreContacto(conv: any): string {
    if (!conv || !conv.contacto) return 'Desconocido';
    // Soportar tanto ChatConversation como objetos mock
    const contacto = conv.contacto;
    if (this.tipoSeleccionado === 'Lead') {
      return contacto.nombre || 'Prospecto';
    } else {
      return `${contacto.nombre || ''} ${contacto.apeP || ''}`.trim();
    }
  }
}
