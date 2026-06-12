// clima.js — Tiempo actual con Open-Meteo (gratis, sin clave de API)

// Open-Meteo devuelve el tiempo como un código numérico (estándar WMO).
// Esta función lo traduce a una descripción en español.
function describirCodigo(codigo) {
  if (codigo === 0) return 'despejado';
  if (codigo <= 3) return 'parcialmente nublado';
  if (codigo <= 48) return 'niebla';
  if (codigo <= 57) return 'llovizna';
  if (codigo <= 67) return 'lluvia';
  if (codigo <= 77) return 'nieve';
  if (codigo <= 82) return 'chubascos';
  if (codigo <= 99) return 'tormenta';
  return 'desconocido';
}

export async function obtenerClima({ latitud, longitud }) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitud}&longitude=${longitud}&current=temperature_2m,weather_code`;

    const respuesta = await fetch(url);
    if (!respuesta.ok) return null;

    const datos = await respuesta.json();
    const temperatura = Math.round(datos.current.temperature_2m);
    const descripcion = describirCodigo(datos.current.weather_code);

    return { temperatura, descripcion };
  } catch (error) {
    // Sin internet o API caída: la app sigue funcionando sin clima
    console.log('Error obteniendo clima:', error.message);
    return null;
  }
}