// ia.js — Cliente del backend de Tardeo
// La app llama a nuestro backend en Vercel; la clave de Gemini vive en el servidor.

// ⬇️ Tu URL de Vercel (la que ya tienes funcionando)
const BACKEND_URL = 'https://planea-one.vercel.app/api/generar-plan';

export async function generarPlanIA({
  tiempo,
  presupuesto,
  compania,
  animo,
  ciudad,
  pais,
  clima,
  lugares,
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
      lugares,
    }),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error || `Error del servidor (${respuesta.status})`);
  }

  return datos; // { titulo, actividades, costeTotal }
}