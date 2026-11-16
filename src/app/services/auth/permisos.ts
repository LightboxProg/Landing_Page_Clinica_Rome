// Qué rol entra a qué parte del panel. Tiene que coincidir con verificarRol en las
// rutas del backend: el menú sólo esconde, el backend es quien niega.

export type Rol = 'Administrador' | 'Secretaria' | 'Marketing' | 'Contador' | 'Doctor' | 'Especialista';

export const ROLES: Rol[] = ['Administrador', 'Secretaria', 'Marketing', 'Contador', 'Doctor', 'Especialista'];

const TODOS = ROLES;
const MEDICOS: Rol[] = ['Doctor', 'Especialista'];

export const PERMISOS = {
  agenda: ['Administrador', 'Secretaria', 'Contador', ...MEDICOS] as Rol[],
  // Crear y mover citas; el contador sólo consulta la agenda
  agendar: ['Administrador', 'Secretaria', ...MEDICOS] as Rol[],
  chats: ['Administrador', 'Secretaria', 'Marketing', ...MEDICOS] as Rol[],
  listaPacientes: TODOS,
  // Ficha, registro, edición y lista negra; marketing y contador sólo ven la lista
  expediente: ['Administrador', 'Secretaria', ...MEDICOS] as Rol[],
  cobrar: ['Administrador', 'Secretaria'] as Rol[],
  // Cotizador y planes de tratamiento
  cotizar: ['Administrador', 'Secretaria', ...MEDICOS] as Rol[],
  corteDiario: ['Administrador', 'Secretaria', 'Contador'] as Rol[],
  pagosPromo: ['Administrador', 'Secretaria', 'Marketing', 'Contador'] as Rol[],
  aceptaciones: ['Administrador', 'Secretaria'] as Rol[],
  suscripciones: ['Administrador', 'Secretaria', 'Contador', ...MEDICOS] as Rol[],
  // Vender, cobrar y cancelar membresías (el contador sólo las consulta)
  operarMembresias: ['Administrador', 'Secretaria', ...MEDICOS] as Rol[],
  prospectos: ['Administrador', 'Marketing', ...MEDICOS] as Rol[],
  marketing: ['Administrador', 'Marketing'] as Rol[],
  promociones: ['Administrador', 'Marketing'] as Rol[],
  catalogo: ['Administrador', ...MEDICOS] as Rol[],
  disponibilidad: ['Administrador', ...MEDICOS] as Rol[],
  misHorarios: ['Especialista'] as Rol[],
  admin: ['Administrador'] as Rol[]
};

export type Permiso = keyof typeof PERMISOS;

export const tiene = (tipo: string | null | undefined, permiso: Permiso): boolean =>
  !!tipo && PERMISOS[permiso].includes(tipo as Rol);

// Primera página que cada rol puede abrir, en el orden del menú
export const inicioDe = (tipo: string | null | undefined): string => {
  if (tiene(tipo, 'agenda')) return '/admin/gestion';
  if (tiene(tipo, 'chats')) return '/admin/chats';
  return '/admin/pacientes';
};
