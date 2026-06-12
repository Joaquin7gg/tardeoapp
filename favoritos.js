// favoritos.js — Guardado de planes favoritos en el almacenamiento del móvil
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLAVE = 'planes_favoritos';

// Lee todos los favoritos guardados. Devuelve un array (vacío si no hay nada).
export async function obtenerFavoritos() {
  try {
    const texto = await AsyncStorage.getItem(CLAVE);
    return texto ? JSON.parse(texto) : [];
  } catch (error) {
    console.log('Error leyendo favoritos:', error.message);
    return [];
  }
}

// Guarda un plan nuevo al principio de la lista
export async function guardarFavorito({ plan, ciudad, opciones }) {
  const favoritos = await obtenerFavoritos();

  const nuevo = {
    id: Date.now(), // timestamp como identificador único
    fecha: new Date().toLocaleDateString('es-ES'),
    ciudad,
    opciones, // { tiempo, presupuesto, compania, animo }
    plan, // { titulo, actividades, costeTotal }
  };

  const actualizados = [nuevo, ...favoritos];
  await AsyncStorage.setItem(CLAVE, JSON.stringify(actualizados));
  return actualizados;
}

// Elimina un favorito por su id
export async function eliminarFavorito(id) {
  const favoritos = await obtenerFavoritos();
  const actualizados = favoritos.filter((favorito) => favorito.id !== id);
  await AsyncStorage.setItem(CLAVE, JSON.stringify(actualizados));
  return actualizados;
}