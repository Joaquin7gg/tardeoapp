// ia.js — Cliente del backend de Tardeo
// Envía las coordenadas y el idioma; el backend obtiene los lugares y responde en ese idioma.

const BACKEND_URL = 'https://planea-one.vercel.app/api/generar-plan';

export async function generarPlanIA({
  tiempo,
  presupuesto,
  compania,
  animo,
  ciudad,
  pais,
  clima,
  latitud,
  longitud,
  idioma,
  evitar,
}) {
  const respuesta = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tiempo,
      presupuesto,
      compania,
      animo,
      ciudad,
      pais,
      clima,
      latitud,
      longitud,
      idioma,
      evitar,
    }),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error || `Error del servidor (${respuesta.status})`);
  }

  return datos;
}