# Tardeo — Tu plan perfecto en segundos

**Tardeo** es una app móvil para **Android/iOS** que genera planes de ocio reales y personalizados al instante. Le dices cuánto tiempo tienes, tu presupuesto, con quién vas y qué te apetece, y te monta un plan completo con sitios verificados de tu zona, adaptado incluso al tiempo que hace en ese momento.

> *"Tengo 3 horas libres esta tarde y 15 euros, ¿qué hago?"*
> Tardeo responde a esa pregunta en segundos.

---

## Funcionalidades

- **Planes a medida**: 4 preguntas rápidas —tiempo, presupuesto, compañía y tipo de plan— y un plan completo con horarios y costes por persona.
- **Modos comer y cenar**: opciones dedicadas que centran el plan en un restaurante concreto, con botón directo para reservar mesa.
- **Hiperlocal de verdad**: detecta tu ciudad por GPS y construye los planes con sitios reales verificados de tu entorno: restaurantes, museos, parques, instalaciones deportivas, etc.
- **Búsqueda mundial de ciudades**: ¿no quieres un plan donde estás? Busca cualquier ciudad del mundo y genera el plan allí.
- **Consciente del clima**: consulta la meteorología en tiempo real y adapta el plan según umbrales concretos de temperatura: interior y sombra con calor o lluvia, exterior si hace bueno.
- **Variedad real**: combina barajado de resultados, mayor creatividad del modelo y memoria de sitios recientes para no repetir siempre las mismas recomendaciones.
- **Bilingüe (ES/EN)**: interfaz y planes generados en español o inglés, con detección automática del idioma del dispositivo y cambio manual al instante.
- **Calendario doble**: guarda los planes en el calendario propio de la app o expórtalos al calendario nativo del móvil, eligiendo el día.
- **Planes guardados**: guarda tus planes favoritos en el dispositivo y recupéralos cuando quieras.
- **Compartir**: envía cualquier plan por WhatsApp, Telegram o donde quieras con un toque.
- **Robusta**: reintentos automáticos con backoff exponencial y modelos de respaldo si los servidores de IA están saturados. Degradación elegante si falla el GPS, el clima o el mapa, y mensajes claros cuando no hay conexión.

---

## Arquitectura

```text
+------------------+         +----------------------+         +-------------+
|    App móvil     |  HTTPS  |  Backend serverless  |  HTTPS  |   Google    |
|  React Native    | ------> |        Vercel        | ------> |   Gemini    |
|      + Expo      |         |    clave de API      |         |             |
+------------------+         +----------------------+         +-------------+
        |                              |
        |                              +--> Google Places (sitios reales)
        |                              +--> OpenStreetMap / Overpass (fallback)
        |
        +--> GPS del dispositivo, con expo-location
        +--> Open-Meteo, para clima en tiempo real
        +--> Calendario nativo del dispositivo, con expo-calendar
```

La clave de la API de IA **nunca viaja en la app**: vive como variable de entorno en el backend, en un repositorio aparte, siguiendo buenas prácticas de seguridad. El backend es también quien obtiene los sitios reales (cascada de Google Places a OpenStreetMap) y quien responde en el idioma solicitado, de modo que la app solo envía coordenadas y preferencias.

---

## Stack

| Capa | Tecnología |
|---|---|
| App móvil | React Native + Expo |
| Backend | Función serverless en Vercel, con Node.js |
| IA | Google Gemini, con fallback de modelos |
| Geolocalización | expo-location + geocodificación inversa |
| Sitios reales | Google Places API, con fallback a Overpass / OpenStreetMap |
| Meteorología | Open-Meteo |
| Internacionalización | expo-localization (ES/EN) |
| Calendario | expo-calendar + agenda propia |
| Persistencia local | AsyncStorage |

---

## Ejecutar en local

### Requisitos

- Node.js LTS
- La app [Expo Go](https://expo.dev/go) instalada en el móvil

### Instalación

```bash
git clone https://github.com/Joaquin7gg/tardeoapp.git
cd tardeoapp
npm install
npx expo start
```

Escanea el código QR con Expo Go en Android o con la cámara en iOS. El móvil y el PC deben estar en la misma red WiFi.

> **Nota**
> Algunas funciones nativas (calendario del móvil, pantalla de inicio) solo están disponibles en una compilación real de la app, no en Expo Go. La app consume un backend desplegado en Vercel, en un repositorio aparte. Para usar tu propia instancia, despliega el backend con tu clave de Gemini y tu clave de Google Places, y actualiza `BACKEND_URL` en `ia.js`.

---

## Estructura del proyecto

```text
tardeoapp/
├── App.js                  # Pantallas y lógica de la interfaz
├── i18n.js                 # Textos en español e inglés
├── ia.js                   # Cliente del backend de generación de planes
├── ubicacion.js            # Detección y búsqueda de ciudades por GPS y nombre
├── clima.js                # Tiempo actual vía Open-Meteo
├── favoritos.js            # Persistencia local de planes guardados
├── agenda.js               # Persistencia del calendario propio
├── calendario-movil.js     # Exportación al calendario nativo del dispositivo
└── PantallaCalendario.js   # Vista de calendario mensual
```

Cada módulo tiene una única responsabilidad y maneja sus propios fallos. Si una fuente de datos no responde, la app sigue funcionando sin ella.

---

## Hoja de ruta

- [x] Generación de planes con IA y sitios verificados
- [x] GPS, clima y persistencia local
- [x] Backend serverless con la clave protegida
- [x] Sitios reales con Google Places y fallback a OpenStreetMap
- [x] Interfaz y planes bilingües (ES/EN)
- [x] Modos comer y cenar con reserva de mesa
- [x] Calendario propio y exportación al calendario del móvil
- [x] Búsqueda mundial de ciudades
- [ ] Publicación en Google Play
- [ ] Enlaces de reserva con afiliación
- [ ] Plan semanal

---

## Autor

Desarrollado por **Joaquín Luis García García**.

---

## Créditos

Datos de lugares © [Google Places](https://developers.google.com/maps/documentation/places/web-service) y colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright) · Meteorología por [Open-Meteo](https://open-meteo.com/)