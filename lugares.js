// lugares.js — Sitios reales cercanos con OpenStreetMap (Overpass API)
// Gratis, sin registro y sin clave de API.

// Radio de búsqueda en metros alrededor del usuario
const RADIO = 3000;

// Traducción de las etiquetas de OpenStreetMap a categorías en español
const CATEGORIAS = {
  restaurant: 'restaurante',
  cafe: 'cafetería',
  bar: 'bar',
  pub: 'pub',
  ice_cream: 'heladería',
  cinema: 'cine',
  theatre: 'teatro',
  museum: 'museo',
  gallery: 'galería de arte',
  attraction: 'atracción turística',
  viewpoint: 'mirador',
  park: 'parque',
  beach: 'playa',
  marketplace: 'mercado',
  bowling_alley: 'bolera',
  escape_game: 'escape room',
  // --- Deporte ---
  sports_centre: 'polideportivo',
  fitness_centre: 'gimnasio',
  pitch: 'pista deportiva',
  swimming_pool: 'piscina',
  ice_rink: 'pista de hielo',
  golf_course: 'campo de golf',
  stadium: 'estadio',
  horse_riding: 'centro de hípica',
};

export async function obtenerLugares({ latitud, longitud }) {
  try {
    // Consulta Overpass. Usamos "nwr" (node + way + relation) porque muchos
    // sitios grandes (polideportivos, parques, piscinas) están dibujados en el
    // mapa como ÁREAS, no como puntos, y antes nos los estábamos perdiendo.
    const consulta = `
      [out:json][timeout:15];
      (
        nwr["amenity"~"restaurant|cafe|bar|pub|ice_cream|cinema|theatre|marketplace"]["name"](around:${RADIO},${latitud},${longitud});
        nwr["tourism"~"museum|gallery|attraction|viewpoint"]["name"](around:${RADIO},${latitud},${longitud});
        nwr["leisure"~"park|bowling_alley|escape_game|sports_centre|fitness_centre|pitch|swimming_pool|ice_rink|golf_course|stadium|horse_riding"]["name"](around:${RADIO},${latitud},${longitud});
        nwr["natural"="beach"]["name"](around:${RADIO},${latitud},${longitud});
      );
      out center 120;
    `;

    const respuesta = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(consulta),
    });

    if (!respuesta.ok) return [];

    const datos = await respuesta.json();

    const lugares = datos.elements
      .map((elemento) => {
        const etiquetas = elemento.tags || {};
        const clave =
          etiquetas.leisure || etiquetas.amenity || etiquetas.tourism || etiquetas.natural;
        return {
          nombre: etiquetas.name,
          categoria: CATEGORIAS[clave] || clave,
        };
      })
      .filter((lugar) => lugar.nombre);

    // Eliminamos duplicados por nombre
    const vistos = new Set();
    const unicos = lugares.filter((lugar) => {
      if (vistos.has(lugar.nombre)) return false;
      vistos.add(lugar.nombre);
      return true;
    });

    // Limitamos a 50 para no hacer el prompt gigante
    return unicos.slice(0, 50);
  } catch (error) {
    console.log('Error obteniendo lugares:', error.message);
    return [];
  }
}