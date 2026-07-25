/**
 * Duraciones (en minutos) relacionadas con los tipos de servicio.
 */

/** Opciones estándar al agendar cuando la profesional no definió sus servicios. */
export const DEFAULT_DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];

/** Duraciones elegibles al crear un tipo de servicio propio. */
export const SERVICE_DURATIONS = [
  15, 30, 45, 60, 90, 120, 180, 240, 300, 360, 480, 600, 720,
];

/** Máximo de tipos de servicio por profesional. */
export const MAX_SERVICE_TYPES = 12;

/**
 * Tipos de servicio con los que arranca cada profesional nueva (autoregistro
 * o alta desde una agencia), para que no tenga que configurarlos desde cero.
 * Deja margen bajo MAX_SERVICE_TYPES para que pueda agregar los suyos propios.
 */
export const DEFAULT_SERVICE_TYPES: { name: string; durationMinutes: number }[] = [
  { name: "El rato (15 min)", durationMinutes: 15 },
  { name: "Media hora", durationMinutes: 30 },
  { name: "1 hora", durationMinutes: 60 },
  { name: "2 horas", durationMinutes: 120 },
  { name: "3 horas", durationMinutes: 180 },
  { name: "Amanecida (8 h)", durationMinutes: 480 },
  { name: "Noche entera (12 h)", durationMinutes: 720 },
];
