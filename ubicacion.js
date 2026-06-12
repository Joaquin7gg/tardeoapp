// ubicacion.js — Detección de la ciudad del usuario por GPS
import * as Location from 'expo-location';

// Valores por defecto si el usuario no da permiso o algo falla
const CIUDAD_POR_DEFECTO = 'Madrid';
const LATITUD_POR_DEFECTO = 40.4168;
const LONGITUD_POR_DEFECTO = -3.7038;

export async function obtenerCiudad() {
  const porDefecto = {
    ciudad: CIUDAD_POR_DEFECTO,
    latitud: LATITUD_POR_DEFECTO,
    longitud: LONGITUD_POR_DEFECTO,
    detectada: false,
  };

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return porDefecto;
    }

    const posicion = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const latitud = posicion.coords.latitude;
    const longitud = posicion.coords.longitude;

    const direcciones = await Location.reverseGeocodeAsync({
      latitude: latitud,
      longitude: longitud,
    });

    if (direcciones.length > 0) {
      const lugar = direcciones[0];
      const ciudad = lugar.city || lugar.subregion || lugar.region;
      if (ciudad) {
        return { ciudad, latitud, longitud, detectada: true };
      }
    }

    return porDefecto;
  } catch (error) {
    console.log('Error obteniendo ubicación:', error.message);
    return porDefecto;
  }
}