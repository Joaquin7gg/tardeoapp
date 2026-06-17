// calendario-movil.js — Añade un plan al calendario NATIVO del móvil (Google Calendar, etc.)
// OJO: expo-calendar NO funciona en Expo Go, solo en un build de verdad.
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

// Crea un evento en el calendario del móvil para el plan dado, en la fecha/hora indicada.
// Devuelve true si se creó, false si el usuario no dio permiso o hubo error.
export async function anadirPlanACalendarioMovil({ plan, ciudad, fechaInicio }) {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') return { ok: false, motivo: 'permiso' };

    // Buscamos el calendario por defecto donde escribir
    const calendarios = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const escribibles = calendarios.filter((c) => c.allowsModifications);
    const principal =
      escribibles.find((c) => c.isPrimary) || escribibles[0] || calendarios[0];

    if (!principal) return { ok: false, motivo: 'sin_calendario' };

    // El plan dura por defecto 2 horas desde la hora elegida
    const fin = new Date(fechaInicio.getTime() + 2 * 60 * 60 * 1000);

    // Montamos la descripción con las actividades del plan
    const descripcion = plan.actividades
      .map((a) => `${a.hora} - ${a.nombre} (${a.coste})`)
      .join('\n');

    await Calendar.createEventAsync(principal.id, {
      title: `${plan.titulo} (${ciudad})`,
      startDate: fechaInicio,
      endDate: fin,
      notes: descripcion + `\n\nTotal: ${plan.costeTotal}\n\nCreado con Tardeo`,
      timeZone: Platform.OS === 'ios' ? undefined : 'Europe/Madrid',
    });

    return { ok: true };
  } catch (error) {
    console.log('Error añadiendo al calendario del móvil:', error.message);
    return { ok: false, motivo: 'error' };
  }
}