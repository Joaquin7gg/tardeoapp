// ubicacion.js — Ubicación del usuario por GPS + buscador mundial de ciudades
import * as Location from 'expo-location';

const CIUDAD_POR_DEFECTO = 'Madrid';
const PAIS_POR_DEFECTO = 'España';
const LATITUD_POR_DEFECTO = 40.4168;
const LONGITUD_POR_DEFECTO = -3.7038;

export async function obtenerCiudad() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return {
        ciudad: CIUDAD_POR_DEFECTO,
        pais: PAIS_POR_DEFECTO,
        latitud: LATITUD_POR_DEFECTO,
        longitud: LONGITUD_POR_DEFECTO,
        detectada: false,
      };
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
      const pais = lugar.country || PAIS_POR_DEFECTO;
      if (ciudad) {
        return { ciudad, pais, latitud, longitud, detectada: true };
      }
    }

    return {
      ciudad: CIUDAD_POR_DEFECTO,
      pais: PAIS_POR_DEFECTO,
      latitud,
      longitud,
      detectada: false,
    };
  } catch (error) {
    console.log('Error obteniendo ubicación:', error.message);
    return {
      ciudad: CIUDAD_POR_DEFECTO,
      pais: PAIS_POR_DEFECTO,
      latitud: LATITUD_POR_DEFECTO,
      longitud: LONGITUD_POR_DEFECTO,
      detectada: false,
    };
  }
}

// Busca ciudades de TODO EL MUNDO que coincidan con el texto.
// Usa el geocoder gratuito de Open-Meteo (sin clave).
// Devuelve un array de hasta 8 opciones: { ciudad, region, pais, latitud, longitud }
export async function buscarCiudades(nombre) {
  try {
    const texto = nombre.trim();
    if (texto.length < 2) return [];

    const url =
      `https://geocoding-api.open-meteo.com/v1/search` +
      `?name=${encodeURIComponent(texto)}` +
      `&count=8&language=es&format=json`;

    const respuesta = await fetch(url);
    if (!respuesta.ok) return [];

    const datos = await respuesta.json();
    if (!datos.results) return [];

    return datos.results.map((resultado) => ({
      ciudad: resultado.name,
      region: resultado.admin1 || '',
      pais: resultado.country || '',
      latitud: resultado.latitude,
      longitud: resultado.longitude,
    }));
  } catch (error) {
    console.log('Error buscando ciudades:', error.message);
    return [];
  }
}