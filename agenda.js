// agenda.js — Guarda los planes asignados a fechas concretas (calendario propio)
// Funciona igual que favoritos.js pero la "clave" de cada plan es la fecha.
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLAVE = '@tardeo_agenda';

// Estructura guardada: un objeto { "2026-06-20": [plan1, plan2], "2026-06-21": [plan3] }

// Convierte un objeto Date a clave "AAAA-MM-DD" (sin horas, para agrupar por día)
export function fechaAClave(fecha) {
  const a = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
}

// Lee toda la agenda
export async function obtenerAgenda() {
  try {
    const datos = await AsyncStorage.getItem(CLAVE);
    return datos ? JSON.parse(datos) : {};
  } catch (error) {
    console.log('Error leyendo agenda:', error.message);
    return {};
  }
}

// Añade un plan a un día concreto. Devuelve la agenda actualizada.
export async function anadirPlanADia({ plan, ciudad, fechaClave, hora }) {
  try {
    const agenda = await obtenerAgenda();
    const entrada = {
      id: Date.now().toString(),
      plan,
      ciudad,
      hora: hora || null, // "18:00" opcional
    };
    if (!agenda[fechaClave]) agenda[fechaClave] = [];
    agenda[fechaClave].push(entrada);
    await AsyncStorage.setItem(CLAVE, JSON.stringify(agenda));
    return agenda;
  } catch (error) {
    console.log('Error añadiendo plan a la agenda:', error.message);
    return await obtenerAgenda();
  }
}

// Elimina un plan concreto de un día. Devuelve la agenda actualizada.
export async function eliminarPlanDeDia({ fechaClave, id }) {
  try {
    const agenda = await obtenerAgenda();
    if (agenda[fechaClave]) {
      agenda[fechaClave] = agenda[fechaClave].filter((e) => e.id !== id);
      // Si el día se queda sin planes, borramos la clave para no acumular basura
      if (agenda[fechaClave].length === 0) delete agenda[fechaClave];
      await AsyncStorage.setItem(CLAVE, JSON.stringify(agenda));
    }
    return agenda;
  } catch (error) {
    console.log('Error eliminando plan de la agenda:', error.message);
    return await obtenerAgenda();
  }
}