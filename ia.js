// ia.js — Cliente del backend de Planea
// Ya NO hay ninguna clave aquí: la app llama a nuestro backend en Vercel,
// y es el backend quien habla con Gemini usando la clave (que vive en el servidor).

// ⬇️ Sustituye esto por la URL que te dé Vercel al desplegar
const BACKEND_URL = 'https://planea-one.vercel.app/api/generar-plan';

export async function generarPlanIA({
  tiempo,
  presupuesto,
  compania,
  animo,
  ciudad,
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
      clima,
      lugares,
    }),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    // El backend devuelve mensajes de error legibles para el usuario
    throw new Error(datos.error || `Error del servidor (${respuesta.status})`);
  }

  return datos; // { titulo, actividades, costeTotal }
}