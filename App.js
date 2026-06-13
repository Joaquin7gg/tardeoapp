import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Share,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { generarPlanIA } from './ia';
import { obtenerCiudad, buscarCiudades } from './ubicacion';
import { obtenerClima } from './clima';
import { obtenerLugares } from './lugares';
import { obtenerFavoritos, guardarFavorito, eliminarFavorito } from './favoritos';

const TIEMPOS = ['1 hora', '2-3 horas', 'Media jornada', 'Todo el día'];
const PRESUPUESTOS = ['Gratis', 'Hasta 10€', 'Hasta 30€', 'Sin límite'];
const COMPANIAS = ['Solo/a', 'En pareja', 'Con amigos', 'En familia'];
const ANIMOS = ['Tranquilo', 'Aire libre', 'Deporte', 'Cultural', 'Gastronómico', 'Fiesta'];

const VERSION_APP = '1.0.0';
const EMAIL_CONTACTO = 'contacto.tardeo@gmail.com'; //

const COLORES = {
  fondo: '#FAF7F0',
  tarjeta: '#FFFFFF',
  borde: '#E5DFD0',
  textoPrincipal: '#292524',
  textoSecundario: '#78716C',
  acento: '#C2410C',
  acentoSuave: '#FBEAE2',
  verdeSuave: '#DCFCE7',
  verdeTexto: '#166534',
};

function emojiClima(descripcion) {
  if (descripcion === 'despejado') return '☀️';
  if (descripcion === 'parcialmente nublado') return '⛅';
  if (descripcion === 'niebla') return '🌫️';
  if (descripcion === 'llovizna' || descripcion === 'lluvia') return '🌧️';
  if (descripcion === 'nieve') return '❄️';
  if (descripcion === 'chubascos') return '🌦️';
  if (descripcion === 'tormenta') return '⛈️';
  return '🌡️';
}

export default function App() {
  const [tiempo, setTiempo] = useState(null);
  const [presupuesto, setPresupuesto] = useState(null);
  const [compania, setCompania] = useState(null);
  const [animo, setAnimo] = useState(null);

  const [cargando, setCargando] = useState(false);
  const [plan, setPlan] = useState(null);

  const [ciudad, setCiudad] = useState(null);
  const [pais, setPais] = useState(null);
  const [ciudadDetectada, setCiudadDetectada] = useState(false);
  const [ciudadManual, setCiudadManual] = useState(false);
  const [clima, setClima] = useState(null);
  const [lugares, setLugares] = useState([]);

  // Modal de cambio de ciudad
  const [modalCiudadVisible, setModalCiudadVisible] = useState(false);
  const [textoCiudad, setTextoCiudad] = useState('');
  const [resultadosCiudades, setResultadosCiudades] = useState([]);
  const [buscandoCiudades, setBuscandoCiudades] = useState(false);
  const [busquedaHecha, setBusquedaHecha] = useState(false);

  const [favoritos, setFavoritos] = useState([]);
  const [mostrandoFavoritos, setMostrandoFavoritos] = useState(false);
  const [mostrandoAcercaDe, setMostrandoAcercaDe] = useState(false);
  const [planGuardado, setPlanGuardado] = useState(false);

  const cargarDatosZona = async (latitud, longitud) => {
    const [tiempoActual, lugaresCercanos] = await Promise.all([
      obtenerClima({ latitud, longitud }),
      obtenerLugares({ latitud, longitud }),
    ]);
    setClima(tiempoActual);
    setLugares(lugaresCercanos);
  };

  const usarMiUbicacion = async () => {
    setClima(null);
    setLugares([]);
    const ubicacion = await obtenerCiudad();
    setCiudad(ubicacion.ciudad);
    setPais(ubicacion.pais);
    setCiudadDetectada(ubicacion.detectada);
    setCiudadManual(false);
    await cargarDatosZona(ubicacion.latitud, ubicacion.longitud);
  };

  useEffect(() => {
    async function iniciar() {
      const guardados = await obtenerFavoritos();
      setFavoritos(guardados);
      await usarMiUbicacion();
    }
    iniciar();
  }, []);

  // Busca ciudades que coincidan con el texto y muestra las opciones
  const buscarOpcionesCiudad = async () => {
    if (textoCiudad.trim().length < 2) return;
    setBuscandoCiudades(true);
    const resultados = await buscarCiudades(textoCiudad);
    setResultadosCiudades(resultados);
    setBusquedaHecha(true);
    setBuscandoCiudades(false);
  };

  // El usuario elige una de las opciones de la lista
  const seleccionarCiudad = async (opcion) => {
    setCiudad(opcion.ciudad);
    setPais(opcion.pais);
    setCiudadManual(true);
    setCiudadDetectada(false);
    cerrarModalCiudad();
    setClima(null);
    setLugares([]);
    await cargarDatosZona(opcion.latitud, opcion.longitud);
  };

  const volverAMiUbicacion = async () => {
    cerrarModalCiudad();
    await usarMiUbicacion();
  };

  const cerrarModalCiudad = () => {
    setModalCiudadVisible(false);
    setTextoCiudad('');
    setResultadosCiudades([]);
    setBusquedaHecha(false);
  };

  const todoSeleccionado = tiempo && presupuesto && compania && animo && ciudad;

  const generarPlan = async () => {
    setCargando(true);
    try {
      const resultado = await generarPlanIA({
        tiempo,
        presupuesto,
        compania,
        animo,
        ciudad,
        pais,
        clima,
        lugares,
      });
      setPlan(resultado);
      setPlanGuardado(false);
    } catch (error) {
      Alert.alert('Ups', 'No se pudo generar el plan.\n\n' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const guardarPlanActual = async () => {
    const actualizados = await guardarFavorito({
      plan,
      ciudad,
      opciones: { tiempo, presupuesto, compania, animo },
    });
    setFavoritos(actualizados);
    setPlanGuardado(true);
  };

  const compartirPlan = async () => {
    const lineas = plan.actividades
      .map((actividad) => `${actividad.hora} — ${actividad.nombre} (${actividad.coste})`)
      .join('\n');

    // TODO: cuando la app esté publicada, añadir al final:
    // `\n📲 Descárgala gratis: https://play.google.com/store/apps/details?id=com.joaquinluisgarcia.tardeo`
    const mensaje =
      `🎯 ${plan.titulo}\n📍 ${ciudad}\n\n${lineas}\n\n` +
      `💰 Total aproximado: ${plan.costeTotal}\n\n` +
      `✨ Creado con Tardeo — Tu plan perfecto en segundos`;

    try {
      await Share.share({ message: mensaje });
    } catch (error) {
      // El usuario canceló el diálogo de compartir: no pasa nada
    }
  };

  const contactar = () => {
    Linking.openURL(
      `mailto:${EMAIL_CONTACTO}?subject=Contacto desde Tardeo v${VERSION_APP}`
    );
  };

  const borrarFavorito = (id) => {
    Alert.alert('Eliminar plan', '¿Seguro que quieres eliminar este plan guardado?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const actualizados = await eliminarFavorito(id);
          setFavoritos(actualizados);
        },
      },
    ]);
  };

  const abrirFavorito = (favorito) => {
    setTiempo(favorito.opciones.tiempo);
    setPresupuesto(favorito.opciones.presupuesto);
    setCompania(favorito.opciones.compania);
    setAnimo(favorito.opciones.animo);
    setPlan(favorito.plan);
    setPlanGuardado(true);
    setMostrandoFavoritos(false);
  };

  const volver = () => setPlan(null);

  // ---- Pantalla "Acerca de" ----
  if (mostrandoAcercaDe) {
    return (
      <View style={styles.fondo}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.contenido}>
          <Text style={styles.titulo}>Acerca de Tardeo</Text>
          <Text style={styles.subtitulo}>Versión {VERSION_APP}</Text>

          <View style={styles.tarjetaAcercaDe}>
            <Text style={styles.textoAcercaDe}>
              Tardeo crea planes de ocio reales y a tu medida en segundos:
              dinos cuánto tiempo tienes, tu presupuesto, con quién vas y qué
              te apetece, y te montamos un plan con sitios verificados de tu
              zona, teniendo en cuenta hasta el tiempo que hace.
            </Text>
          </View>

          <View style={styles.tarjetaAcercaDe}>
            <Text style={styles.tituloAcercaDe}>Fuentes de datos</Text>
            <Text style={styles.textoAcercaDe}>
              Sitios reales: OpenStreetMap{'\n'}
              Meteorología: Open-Meteo{'\n'}
              Generación de planes: Google Gemini
            </Text>
          </View>

          <TouchableOpacity style={styles.boton} onPress={contactar}>
            <Text style={styles.botonTexto}>✉️ Contactar</Text>
          </TouchableOpacity>

          {/* TODO: al publicar, añadir aquí un botón con enlace a la
              política de privacidad */}

          <TouchableOpacity
            style={styles.botonSecundario}
            onPress={() => setMostrandoAcercaDe(false)}
          >
            <Text style={styles.botonSecundarioTexto}>← Volver</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ---- Pantalla de favoritos ----
  if (mostrandoFavoritos) {
    return (
      <View style={styles.fondo}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.contenido}>
          <Text style={styles.titulo}>Planes guardados ⭐</Text>
          <Text style={styles.subtitulo}>
            {favoritos.length === 0
              ? 'Aún no has guardado ningún plan. Genera uno y dale a guardar.'
              : `Tienes ${favoritos.length} plan${favoritos.length === 1 ? '' : 'es'} guardado${favoritos.length === 1 ? '' : 's'}`}
          </Text>

          {favoritos.map((favorito) => (
            <TouchableOpacity
              key={favorito.id}
              style={styles.tarjetaFavorito}
              onPress={() => abrirFavorito(favorito)}
            >
              <View style={styles.favoritoInfo}>
                <Text style={styles.favoritoTitulo}>{favorito.plan.titulo}</Text>
                <Text style={styles.favoritoDetalle}>
                  📍 {favorito.ciudad} · {favorito.fecha} · {favorito.plan.costeTotal}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.botonBorrar}
                onPress={() => borrarFavorito(favorito.id)}
              >
                <Text style={styles.botonBorrarTexto}>🗑️</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.botonSecundario}
            onPress={() => setMostrandoFavoritos(false)}
          >
            <Text style={styles.botonSecundarioTexto}>← Volver</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ---- Pantalla de resultado ----
  if (plan) {
    return (
      <View style={styles.fondo}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.contenido}>
          <Text style={styles.etiquetaCiudad}>TU PLAN EN {ciudad.toUpperCase()}</Text>
          <Text style={styles.titulo}>{plan.titulo}</Text>
          <Text style={styles.subtitulo}>
            {tiempo} · {presupuesto} · {compania} · {animo}
            {clima ? ` · ${emojiClima(clima.descripcion)} ${clima.temperatura}°C` : ''}
          </Text>

          {plan.actividades.map((actividad, indice) => (
            <View key={indice} style={styles.tarjetaActividad}>
              <View style={styles.columnaHora}>
                <Text style={styles.hora}>{actividad.hora}</Text>
                {indice < plan.actividades.length - 1 && (
                  <View style={styles.lineaVertical} />
                )}
              </View>
              <View style={styles.columnaInfo}>
                <Text style={styles.nombreActividad}>{actividad.nombre}</Text>
                <View
                  style={[
                    styles.pildoraCoste,
                    actividad.coste === 'Gratis' && styles.pildoraGratis,
                  ]}
                >
                  <Text
                    style={[
                      styles.textoCoste,
                      actividad.coste === 'Gratis' && styles.textoGratis,
                    ]}
                  >
                    {actividad.coste}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          <View style={styles.filaTotal}>
            <Text style={styles.etiquetaTotal}>Coste total aproximado</Text>
            <Text style={styles.valorTotal}>{plan.costeTotal}</Text>
          </View>

          <View style={styles.filaAcciones}>
            <TouchableOpacity
              style={[styles.botonAccion, planGuardado && styles.botonAccionOk]}
              onPress={guardarPlanActual}
              disabled={planGuardado}
            >
              <Text
                style={[
                  styles.botonAccionTexto,
                  planGuardado && styles.botonAccionTextoOk,
                ]}
              >
                {planGuardado ? '✓ Guardado' : '⭐ Guardar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonAccion} onPress={compartirPlan}>
              <Text style={styles.botonAccionTexto}>📤 Compartir</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.boton}
            onPress={generarPlan}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.botonTexto}>Dame otro plan 🔄</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.botonSecundario} onPress={volver}>
            <Text style={styles.botonSecundarioTexto}>← Cambiar opciones</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ---- Pantalla de formulario ----
  return (
    <View style={styles.fondo}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.cabecera}>
          <Text style={[styles.titulo, styles.tituloCabecera]}>¿Qué hacemos hoy?</Text>
          <View style={styles.botonesCabecera}>
            <TouchableOpacity
              style={styles.botonCabecera}
              onPress={() => setMostrandoFavoritos(true)}
            >
              <Text style={styles.botonCabeceraTexto}>
                ⭐{favoritos.length > 0 ? ` ${favoritos.length}` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.botonCabecera}
              onPress={() => setMostrandoAcercaDe(true)}
            >
              <Text style={styles.botonCabeceraTexto}>ℹ️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.filaUbicacion}
          onPress={() => setModalCiudadVisible(true)}
        >
          {ciudad === null ? (
            <Text style={styles.textoUbicacion}>📍 Detectando ubicación...</Text>
          ) : (
            <Text style={styles.textoUbicacion}>
              📍 {ciudad}
              {ciudadManual ? ' (elegida)' : ciudadDetectada ? '' : ' (por defecto)'}
              {clima ? `  ·  ${emojiClima(clima.descripcion)} ${clima.temperatura}°C` : ''}
              {'  '}
              <Text style={styles.textoCambiar}>cambiar ▾</Text>
            </Text>
          )}
          {lugares.length > 0 && (
            <Text style={styles.textoLugares}>
              ✓ {lugares.length} sitios reales detectados cerca
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.subtitulo}>
          Cuéntame tu situación y te monto un plan en segundos
        </Text>

        <Pregunta
          etiqueta="¿Cuánto tiempo tienes?"
          opciones={TIEMPOS}
          valor={tiempo}
          onSeleccionar={setTiempo}
        />
        <Pregunta
          etiqueta="¿Cuál es tu presupuesto?"
          opciones={PRESUPUESTOS}
          valor={presupuesto}
          onSeleccionar={setPresupuesto}
        />
        <Pregunta
          etiqueta="¿Con quién vas?"
          opciones={COMPANIAS}
          valor={compania}
          onSeleccionar={setCompania}
        />
        <Pregunta
          etiqueta="¿Qué te apetece?"
          opciones={ANIMOS}
          valor={animo}
          onSeleccionar={setAnimo}
        />

        <TouchableOpacity
          style={[styles.boton, (!todoSeleccionado || cargando) && styles.botonDeshabilitado]}
          disabled={!todoSeleccionado || cargando}
          onPress={generarPlan}
        >
          {cargando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              style={[
                styles.botonTexto,
                !todoSeleccionado && styles.botonTextoDeshabilitado,
              ]}
            >
              {todoSeleccionado ? 'Generar mi plan ✨' : 'Responde las 4 preguntas'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* ---- Modal para cambiar de ciudad ---- */}
      <Modal
        visible={modalCiudadVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cerrarModalCiudad}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalTarjeta}>
            <Text style={styles.modalTitulo}>¿Dónde quieres el plan?</Text>
            <Text style={styles.modalSubtitulo}>
              Escribe una ciudad de cualquier parte del mundo y elige entre las opciones.
            </Text>

            <View style={styles.filaBusqueda}>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej: Córdoba, Lisboa, Roma..."
                placeholderTextColor={COLORES.textoSecundario}
                value={textoCiudad}
                onChangeText={setTextoCiudad}
                autoFocus={true}
                returnKeyType="search"
                onSubmitEditing={buscarOpcionesCiudad}
              />
              <TouchableOpacity
                style={styles.botonBuscar}
                onPress={buscarOpcionesCiudad}
                disabled={buscandoCiudades}
              >
                {buscandoCiudades ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.botonBuscarTexto}>Buscar</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Lista de resultados */}
            <ScrollView style={styles.listaResultados}>
              {resultadosCiudades.map((opcion, indice) => (
                <TouchableOpacity
                  key={indice}
                  style={styles.filaResultado}
                  onPress={() => seleccionarCiudad(opcion)}
                >
                  <Text style={styles.resultadoCiudad}>{opcion.ciudad}</Text>
                  <Text style={styles.resultadoDetalle}>
                    {opcion.region ? `${opcion.region}, ` : ''}{opcion.pais}
                  </Text>
                </TouchableOpacity>
              ))}
              {busquedaHecha && resultadosCiudades.length === 0 && (
                <Text style={styles.sinResultados}>
                  No se han encontrado ciudades con ese nombre.
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.botonSecundario}
              onPress={volverAMiUbicacion}
            >
              <Text style={styles.botonSecundarioTexto}>📍 Usar mi ubicación actual</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botonSecundario} onPress={cerrarModalCiudad}>
              <Text style={styles.botonSecundarioTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Pregunta({ etiqueta, opciones, valor, onSeleccionar }) {
  return (
    <View style={styles.bloque}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <View style={styles.chips}>
        {opciones.map((opcion) => {
          const activo = valor === opcion;
          return (
            <TouchableOpacity
              key={opcion}
              style={[styles.chip, activo && styles.chipActivo]}
              onPress={() => onSeleccionar(opcion)}
            >
              <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>
                {opcion}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  contenido: {
    padding: 24,
    paddingTop: 72,
    paddingBottom: 48,
  },
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  botonesCabecera: {
    flexDirection: 'row',
    gap: 8,
  },
  botonCabecera: {
    backgroundColor: COLORES.tarjeta,
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  botonCabeceraTexto: {
    color: COLORES.textoPrincipal,
    fontSize: 15,
    fontWeight: '600',
  },
  etiquetaCiudad: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: COLORES.acento,
    marginBottom: 6,
  },
  titulo: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORES.textoPrincipal,
  },
  tituloCabecera: {
    flex: 1,
    marginRight: 12,
  },
  filaUbicacion: {
    marginTop: 8,
  },
  textoUbicacion: {
    color: COLORES.acento,
    fontSize: 14,
    fontWeight: '600',
  },
  textoCambiar: {
    color: COLORES.textoSecundario,
    fontSize: 13,
    fontWeight: '400',
  },
  textoLugares: {
    color: COLORES.verdeTexto,
    fontSize: 13,
    marginTop: 4,
  },
  subtitulo: {
    fontSize: 15,
    color: COLORES.textoSecundario,
    marginTop: 6,
    marginBottom: 28,
    lineHeight: 22,
  },
  bloque: {
    marginBottom: 24,
  },
  etiqueta: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.textoPrincipal,
    marginBottom: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: COLORES.tarjeta,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  chipActivo: {
    backgroundColor: COLORES.acento,
    borderColor: COLORES.acento,
  },
  chipTexto: {
    color: COLORES.textoSecundario,
    fontSize: 14,
  },
  chipTextoActivo: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tarjetaActividad: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  columnaHora: {
    width: 64,
    alignItems: 'center',
  },
  hora: {
    color: COLORES.acento,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 16,
  },
  lineaVertical: {
    flex: 1,
    width: 2,
    backgroundColor: COLORES.borde,
    marginTop: 6,
    marginBottom: -10,
    borderRadius: 1,
  },
  columnaInfo: {
    flex: 1,
    backgroundColor: COLORES.tarjeta,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORES.borde,
    padding: 16,
    marginBottom: 12,
  },
  nombreActividad: {
    color: COLORES.textoPrincipal,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 10,
  },
  pildoraCoste: {
    alignSelf: 'flex-start',
    backgroundColor: COLORES.acentoSuave,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  pildoraGratis: {
    backgroundColor: COLORES.verdeSuave,
  },
  textoCoste: {
    color: COLORES.acento,
    fontSize: 12,
    fontWeight: '700',
  },
  textoGratis: {
    color: COLORES.verdeTexto,
  },
  filaTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORES.tarjeta,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORES.acento,
  },
  etiquetaTotal: {
    color: COLORES.textoPrincipal,
    fontSize: 14,
    fontWeight: '600',
  },
  valorTotal: {
    color: COLORES.acento,
    fontSize: 20,
    fontWeight: '700',
  },
  filaAcciones: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  botonAccion: {
    flex: 1,
    backgroundColor: COLORES.acentoSuave,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  botonAccionOk: {
    backgroundColor: COLORES.verdeSuave,
  },
  botonAccionTexto: {
    color: COLORES.acento,
    fontSize: 14,
    fontWeight: '700',
  },
  botonAccionTextoOk: {
    color: COLORES.verdeTexto,
  },
  boton: {
    marginTop: 12,
    backgroundColor: COLORES.acento,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  botonDeshabilitado: {
    backgroundColor: '#EDE8DC',
  },
  botonTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  botonTextoDeshabilitado: {
    color: COLORES.textoSecundario,
  },
  botonSecundario: {
    marginTop: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botonSecundarioTexto: {
    color: COLORES.textoSecundario,
    fontSize: 15,
  },
  tarjetaAcercaDe: {
    backgroundColor: COLORES.tarjeta,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORES.borde,
    padding: 16,
    marginBottom: 12,
  },
  tituloAcercaDe: {
    color: COLORES.textoPrincipal,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  textoAcercaDe: {
    color: COLORES.textoSecundario,
    fontSize: 14,
    lineHeight: 22,
  },
  tarjetaFavorito: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.tarjeta,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORES.borde,
    padding: 16,
    marginBottom: 12,
  },
  favoritoInfo: {
    flex: 1,
  },
  favoritoTitulo: {
    color: COLORES.textoPrincipal,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  favoritoDetalle: {
    color: COLORES.textoSecundario,
    fontSize: 13,
  },
  botonBorrar: {
    padding: 8,
    marginLeft: 8,
  },
  botonBorrarTexto: {
    fontSize: 18,
  },
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(41, 37, 36, 0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalTarjeta: {
    backgroundColor: COLORES.fondo,
    borderRadius: 18,
    padding: 22,
    maxHeight: '80%',
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORES.textoPrincipal,
  },
  modalSubtitulo: {
    fontSize: 14,
    color: COLORES.textoSecundario,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 20,
  },
  filaBusqueda: {
    flexDirection: 'row',
    gap: 8,
  },
  modalInput: {
    flex: 1,
    backgroundColor: COLORES.tarjeta,
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: COLORES.textoPrincipal,
  },
  botonBuscar: {
    backgroundColor: COLORES.acento,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  botonBuscarTexto: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  listaResultados: {
    marginTop: 12,
    maxHeight: 260,
  },
  filaResultado: {
    backgroundColor: COLORES.tarjeta,
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  resultadoCiudad: {
    color: COLORES.textoPrincipal,
    fontSize: 15,
    fontWeight: '600',
  },
  resultadoDetalle: {
    color: COLORES.textoSecundario,
    fontSize: 13,
    marginTop: 2,
  },
  sinResultados: {
    color: COLORES.textoSecundario,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
});