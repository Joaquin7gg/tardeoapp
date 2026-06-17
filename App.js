import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar, Share, Linking, Modal, TextInput, BackHandler,
} from 'react-native';
import * as Localization from 'expo-localization';
import { generarPlanIA } from './ia';
import { obtenerCiudad, buscarCiudades } from './ubicacion';
import { obtenerClima } from './clima';
import { obtenerFavoritos, guardarFavorito, eliminarFavorito } from './favoritos';
import { obtenerAgenda, anadirPlanADia, eliminarPlanDeDia, fechaAClave } from './agenda';
import { anadirPlanACalendarioMovil } from './calendario-movil';
import PantallaCalendario from './PantallaCalendario';
import { TEXTOS } from './i18n';

const VERSION_APP = '1.0.0';
const EMAIL_CONTACTO = 'contacto.tardeo@gmail.com'; // <- cambia esto por tu email real

const COLORES = {
  fondo: '#FAF7F0', tarjeta: '#FFFFFF', borde: '#E5DFD0',
  textoPrincipal: '#292524', textoSecundario: '#78716C',
  acento: '#C2410C', acentoSuave: '#FBEAE2', verdeSuave: '#DCFCE7', verdeTexto: '#166534',
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

const idiomaDispositivo = Localization.getLocales()?.[0]?.languageCode === 'en' ? 'en' : 'es';

export default function App() {
  const [idioma, setIdioma] = useState(idiomaDispositivo);
  const t = TEXTOS[idioma];

  const [cargando, setCargando] = useState(false);
  const [plan, setPlan] = useState(null);

  const [ciudad, setCiudad] = useState(null);
  const [pais, setPais] = useState(null);
  const [coordenadas, setCoordenadas] = useState(null);
  const [ciudadDetectada, setCiudadDetectada] = useState(false);
  const [ciudadManual, setCiudadManual] = useState(false);
  const [clima, setClima] = useState(null);

  const [modalCiudadVisible, setModalCiudadVisible] = useState(false);
  const [textoCiudad, setTextoCiudad] = useState('');
  const [resultadosCiudades, setResultadosCiudades] = useState([]);
  const [buscandoCiudades, setBuscandoCiudades] = useState(false);
  const [busquedaHecha, setBusquedaHecha] = useState(false);

  const [favoritos, setFavoritos] = useState([]);
  const [mostrandoFavoritos, setMostrandoFavoritos] = useState(false);
  const [mostrandoAcercaDe, setMostrandoAcercaDe] = useState(false);
  const [planGuardado, setPlanGuardado] = useState(false);
  // Sitios propuestos recientemente, para no repetirlos en los próximos planes
  const [sitiosRecientes, setSitiosRecientes] = useState([]);

  // Agenda / calendario
  const [agenda, setAgenda] = useState({});
  const [mostrandoCalendario, setMostrandoCalendario] = useState(false);
  const [modalGuardarVisible, setModalGuardarVisible] = useState(false);
  const [modoElegirDia, setModoElegirDia] = useState(false); // calendario en modo "elige día"

  const [idxTiempo, setIdxTiempo] = useState(null);
  const [idxPresupuesto, setIdxPresupuesto] = useState(null);
  const [idxCompania, setIdxCompania] = useState(null);
  const [idxAnimo, setIdxAnimo] = useState(null);

  // Comer (0) o Cenar (1) fuerzan el ánimo a Gastronómico (índice 4) y lo bloquean
  const animoBloqueado = idxTiempo === 0 || idxTiempo === 1;
  const seleccionarTiempo = (i) => {
    setIdxTiempo(i);
    if (i === 0 || i === 1) {
      setIdxAnimo(4); // Gastronómico
    }
  };

  const usarMiUbicacion = async () => {
    setClima(null);
    setSitiosRecientes([]); // nueva ciudad -> olvidamos los sitios de la anterior
    const ubicacion = await obtenerCiudad();
    setCiudad(ubicacion.ciudad);
    setPais(ubicacion.pais);
    setCoordenadas({ latitud: ubicacion.latitud, longitud: ubicacion.longitud });
    setCiudadDetectada(ubicacion.detectada);
    setCiudadManual(false);
    const tiempoActual = await obtenerClima({ latitud: ubicacion.latitud, longitud: ubicacion.longitud });
    setClima(tiempoActual);
  };

  useEffect(() => {
    async function iniciar() {
      const guardados = await obtenerFavoritos();
      setFavoritos(guardados);
      const ag = await obtenerAgenda();
      setAgenda(ag);
      await usarMiUbicacion();
    }
    iniciar();
  }, []);

  // Botón físico "atrás" del móvil: retrocede entre pantallas/modales en vez de
  // cerrar la app de golpe. Se reevalúa cuando cambia alguna pantalla abierta.
  useEffect(() => {
    const onBack = () => {
      if (modalCiudadVisible) { cerrarModalCiudad(); return true; }
      if (modalGuardarVisible) { setModalGuardarVisible(false); return true; }
      if (modoElegirDia) { setModoElegirDia(false); setMostrandoCalendario(false); return true; }
      if (mostrandoCalendario) { setMostrandoCalendario(false); return true; }
      if (mostrandoFavoritos) { setMostrandoFavoritos(false); return true; }
      if (mostrandoAcercaDe) { setMostrandoAcercaDe(false); return true; }
      if (plan) { setPlan(null); return true; }
      return false; // nada abierto: deja que el móvil cierre la app
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [plan, mostrandoCalendario, mostrandoFavoritos, mostrandoAcercaDe, modalCiudadVisible, modalGuardarVisible, modoElegirDia]);

  const cambiarIdioma = () => setIdioma(idioma === 'es' ? 'en' : 'es');

  const buscarOpcionesCiudad = async () => {
    if (textoCiudad.trim().length < 2) return;
    setBuscandoCiudades(true);
    const resultados = await buscarCiudades(textoCiudad);
    setResultadosCiudades(resultados);
    setBusquedaHecha(true);
    setBuscandoCiudades(false);
  };

  const seleccionarCiudad = async (opcion) => {
    setSitiosRecientes([]); // nueva ciudad -> olvidamos los sitios de la anterior
    setCiudad(opcion.ciudad);
    setPais(opcion.pais);
    setCoordenadas({ latitud: opcion.latitud, longitud: opcion.longitud });
    setCiudadManual(true);
    setCiudadDetectada(false);
    cerrarModalCiudad();
    setClima(null);
    const tiempoActual = await obtenerClima({ latitud: opcion.latitud, longitud: opcion.longitud });
    setClima(tiempoActual);
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

  const todoSeleccionado =
    idxTiempo !== null && idxPresupuesto !== null && idxCompania !== null && idxAnimo !== null && ciudad;

  const generarPlan = async () => {
    setCargando(true);
    try {
      const resultado = await generarPlanIA({
        tiempo: TEXTOS.es.tiempos[idxTiempo],
        presupuesto: TEXTOS.es.presupuestos[idxPresupuesto],
        compania: TEXTOS.es.companias[idxCompania],
        animo: TEXTOS.es.animos[idxAnimo],
        ciudad, pais, clima,
        latitud: coordenadas?.latitud,
        longitud: coordenadas?.longitud,
        idioma,
        evitar: sitiosRecientes,
      });
      setPlan(resultado);
      setPlanGuardado(false);
      // Recordamos los sitios de este plan (nombre limpio) para no repetirlos.
      const nombresPlan = (resultado.actividades || [])
        .map((a) => (a.nombre || '').split(/[-–—:,(]/)[0].trim())
        .filter(Boolean);
      setSitiosRecientes((prev) => [...prev, ...nombresPlan].slice(-10));
    } catch (error) {
      // Detectamos los fallos típicos de falta de conexión para dar un mensaje claro
      const msg = (error.message || '').toLowerCase();
      const sinRed =
        msg.includes('network') || msg.includes('failed to fetch') ||
        msg.includes('internet') || msg.includes('timeout') || msg.includes('conexión');
      if (sinRed) {
        Alert.alert(t.errorTitulo, t.errorConexion);
      } else {
        Alert.alert(t.errorTitulo, t.errorPlan + error.message);
      }
    } finally {
      setCargando(false);
    }
  };

  const guardarPlanActual = async () => {
    const actualizados = await guardarFavorito({
      plan, ciudad,
      opciones: { idxTiempo, idxPresupuesto, idxCompania, idxAnimo },
    });
    setFavoritos(actualizados);
    setPlanGuardado(true);
  };

  // Busca, dentro del plan, la actividad que es de comer/cenar (no un monumento
  // o paseo). Estrategia: primero por palabras clave de restaurante; si no,
  // la primera actividad que cuesta dinero (un restaurante no es gratis).
  const buscarActividadRestaurante = () => {
    const actividades = plan.actividades || [];
    const PALABRAS = [
      'restaurante', 'comer', 'cenar', 'comida', 'cena', 'almuerzo', 'tapas',
      'tapear', 'raciones', 'menú', 'menu', 'gastron', 'bar ', 'taberna',
      'marisquería', 'asador', 'pizzería', 'cafetería', 'brunch', 'desayun',
      'restaurant', 'lunch', 'dinner', 'eat', 'food', 'dine',
    ];
    // 1) Por palabra clave
    const porPalabra = actividades.find((a) => {
      const texto = (a.nombre || '').toLowerCase();
      return PALABRAS.some((p) => texto.includes(p));
    });
    if (porPalabra) return porPalabra;
    // 2) La primera que cuesta dinero (no "Gratis"/"Free")
    const dePago = actividades.find(
      (a) => a.coste && a.coste !== 'Gratis' && a.coste !== 'Free'
    );
    if (dePago) return dePago;
    // 3) Si todo falla, la primera
    return actividades[0] || null;
  };

  // Reservar mesa: busca el restaurante concreto en Google (robusto y siempre
  // acierta de ciudad). El usuario llega a la ficha del sitio con sus opciones
  // de reserva (TheFork, web propia, Google Reserva...).
  // FUTURO AFILIACIÓN: cuando entres en un programa de afiliados, sustituir esta
  // URL por tu enlace de afiliado (ej. TheFork) con el nombre del restaurante.
  const reservarMesa = () => {
    const actividad = buscarActividadRestaurante();
    if (!actividad) return;
    // Limpiamos el nombre: quitamos verbos típicos del inicio y nos quedamos
    // con la parte antes de un guion, coma o paréntesis.
    let bruto = actividad.nombre || '';
    bruto = bruto.replace(/^(disfrutar de |comer en |cenar en |comer |cenar |ir a |visitar |explorar |dar un |un |una )/i, '');
    const nombreSitio = bruto.split(/[-–—,.(]/)[0].trim();
    const consulta = encodeURIComponent(`${nombreSitio} ${ciudad} restaurante reservar`);
    const url = `https://www.google.com/search?q=${consulta}`;
    Linking.openURL(url).catch(() => {});
  };

  const compartirPlan = async () => {
    const lineas = plan.actividades.map((a) => `${a.hora} — ${a.nombre} (${a.coste})`).join('\n');
    const mensaje =
      `🎯 ${plan.titulo}\n📍 ${ciudad}\n\n${lineas}\n\n` +
      `💰 ${t.totalAprox}: ${plan.costeTotal}\n\n${t.firmaCompartir}`;
    try { await Share.share({ message: mensaje }); } catch (error) {}
  };

  // --- Calendario: añadir el plan actual ---
  const abrirModalGuardar = () => setModalGuardarVisible(true);

  // Opción 1: guardar en el calendario propio de la app -> abre el calendario en modo "elige día"
  const guardarEnApp = () => {
    setModalGuardarVisible(false);
    setModoElegirDia(true);
    setMostrandoCalendario(true);
  };

  // Cuando el usuario toca un día en el calendario estando en modo "elegir día"
  const onElegirDia = async (fechaClave) => {
    const ag = await anadirPlanADia({ plan, ciudad, fechaClave, hora: null });
    setAgenda(ag);
    setModoElegirDia(false);
    Alert.alert('✓', t.planAnadidoApp);
  };

  // Opción 2: guardar en el calendario del móvil (hoy a las 18:00 por defecto)
  const guardarEnMovil = async () => {
    setModalGuardarVisible(false);
    const fecha = new Date();
    fecha.setHours(18, 0, 0, 0);
    const resultado = await anadirPlanACalendarioMovil({ plan, ciudad, fechaInicio: fecha });
    if (resultado.ok) {
      Alert.alert('✓', t.planAnadidoMovil);
    } else if (resultado.motivo === 'permiso') {
      Alert.alert(t.errorTitulo, t.errorCalendarioPermiso);
    } else {
      Alert.alert(t.errorTitulo, t.errorCalendarioMovil);
    }
  };

  const eliminarDeAgenda = async ({ fechaClave, id }) => {
    const ag = await eliminarPlanDeDia({ fechaClave, id });
    setAgenda(ag);
  };

  const contactar = () => Linking.openURL(`mailto:${EMAIL_CONTACTO}?subject=Tardeo v${VERSION_APP}`);

  const borrarFavorito = (id) => {
    Alert.alert(t.eliminarTitulo, t.eliminarMensaje, [
      { text: t.cancelar, style: 'cancel' },
      { text: t.eliminar, style: 'destructive', onPress: async () => {
        const actualizados = await eliminarFavorito(id);
        setFavoritos(actualizados);
      }},
    ]);
  };

  const abrirFavorito = (favorito) => {
    setIdxTiempo(favorito.opciones.idxTiempo);
    setIdxPresupuesto(favorito.opciones.idxPresupuesto);
    setIdxCompania(favorito.opciones.idxCompania);
    setIdxAnimo(favorito.opciones.idxAnimo);
    setPlan(favorito.plan);
    setPlanGuardado(true);
    setMostrandoFavoritos(false);
  };

  const volver = () => setPlan(null);

  const BotonIdioma = () => (
    <TouchableOpacity style={styles.botonCabecera} onPress={cambiarIdioma}>
      <Text style={styles.botonCabeceraTexto}>{idioma === 'es' ? '🇬🇧 EN' : '🇪🇸 ES'}</Text>
    </TouchableOpacity>
  );

  // ---- Calendario propio ----
  if (mostrandoCalendario) {
    return (
      <PantallaCalendario
        t={t}
        agenda={agenda}
        modoElegirDia={modoElegirDia}
        onElegirDia={onElegirDia}
        onEliminarPlan={eliminarDeAgenda}
        onVolver={() => { setMostrandoCalendario(false); setModoElegirDia(false); }}
      />
    );
  }

  // ---- Acerca de ----
  if (mostrandoAcercaDe) {
    return (
      <View style={styles.fondo}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.contenido}>
          <Text style={styles.titulo}>{t.acercaTitulo}</Text>
          <Text style={styles.subtitulo}>{t.version} {VERSION_APP}</Text>
          <View style={styles.tarjetaAcercaDe}><Text style={styles.textoAcercaDe}>{t.acercaTexto}</Text></View>
          <TouchableOpacity style={styles.boton} onPress={contactar}><Text style={styles.botonTexto}>{t.contactar}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.botonSecundario} onPress={() => setMostrandoAcercaDe(false)}><Text style={styles.botonSecundarioTexto}>{t.volver}</Text></TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ---- Favoritos ----
  if (mostrandoFavoritos) {
    return (
      <View style={styles.fondo}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.contenido}>
          <Text style={styles.titulo}>{t.planesGuardados}</Text>
          <Text style={styles.subtitulo}>
            {favoritos.length === 0 ? t.sinFavoritos : t.favoritosContador(favoritos.length)}
          </Text>
          {favoritos.map((favorito) => (
            <TouchableOpacity key={favorito.id} style={styles.tarjetaFavorito} onPress={() => abrirFavorito(favorito)}>
              <View style={styles.favoritoInfo}>
                <Text style={styles.favoritoTitulo}>{favorito.plan.titulo}</Text>
                <Text style={styles.favoritoDetalle}>📍 {favorito.ciudad} · {favorito.fecha} · {favorito.plan.costeTotal}</Text>
              </View>
              <TouchableOpacity style={styles.botonBorrar} onPress={() => borrarFavorito(favorito.id)}><Text style={styles.botonBorrarTexto}>🗑️</Text></TouchableOpacity>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.botonSecundario} onPress={() => setMostrandoFavoritos(false)}><Text style={styles.botonSecundarioTexto}>{t.volver}</Text></TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ---- Resultado ----
  if (plan) {
    return (
      <View style={styles.fondo}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.contenido}>
          <Text style={styles.etiquetaCiudad}>{t.tuPlanEn} {ciudad.toUpperCase()}</Text>
          <Text style={styles.titulo}>{plan.titulo}</Text>
          <Text style={styles.subtitulo}>{clima ? `${emojiClima(clima.descripcion)} ${clima.temperatura}°C` : ''}</Text>
          {plan.actividades.map((actividad, indice) => (
            <View key={indice} style={styles.tarjetaActividad}>
              <View style={styles.columnaHora}>
                <Text style={styles.hora}>{actividad.hora}</Text>
                {indice < plan.actividades.length - 1 && <View style={styles.lineaVertical} />}
              </View>
              <View style={styles.columnaInfo}>
                <Text style={styles.nombreActividad}>{actividad.nombre}</Text>
                <View style={[styles.pildoraCoste, (actividad.coste === 'Gratis' || actividad.coste === 'Free') && styles.pildoraGratis]}>
                  <Text style={[styles.textoCoste, (actividad.coste === 'Gratis' || actividad.coste === 'Free') && styles.textoGratis]}>{actividad.coste}</Text>
                </View>
              </View>
            </View>
          ))}
          <View style={styles.filaTotal}>
            <Text style={styles.etiquetaTotal}>{t.costeTotal}</Text>
            <Text style={styles.valorTotal}>{plan.costeTotal}</Text>
          </View>
          <View style={styles.filaAcciones}>
            <TouchableOpacity style={[styles.botonAccion, planGuardado && styles.botonAccionOk]} onPress={guardarPlanActual} disabled={planGuardado}>
              <Text style={[styles.botonAccionTexto, planGuardado && styles.botonAccionTextoOk]}>{planGuardado ? t.guardado : t.guardar}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonAccion} onPress={compartirPlan}><Text style={styles.botonAccionTexto}>{t.compartir}</Text></TouchableOpacity>
          </View>
          {/* Botón reservar mesa: solo en planes de comer o cenar */}
          {(idxTiempo === 0 || idxTiempo === 1) && (
            <TouchableOpacity style={styles.botonReservar} onPress={reservarMesa}>
              <Text style={styles.botonReservarTexto}>{t.reservarMesa}</Text>
            </TouchableOpacity>
          )}
          {/* Botón añadir al calendario */}
          <TouchableOpacity style={styles.botonCalendario} onPress={abrirModalGuardar}>
            <Text style={styles.botonCalendarioTexto}>{t.anadirCalendario}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.boton} onPress={generarPlan} disabled={cargando}>
            {cargando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.botonTexto}>{t.otroPlan}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonSecundario} onPress={volver}><Text style={styles.botonSecundarioTexto}>{t.cambiarOpciones}</Text></TouchableOpacity>
        </ScrollView>

        {/* Modal: elegir dónde guardar */}
        <Modal visible={modalGuardarVisible} transparent={true} animationType="fade" onRequestClose={() => setModalGuardarVisible(false)}>
          <View style={styles.modalFondo}>
            <View style={styles.modalTarjeta}>
              <Text style={styles.modalTitulo}>{t.elegirComo}</Text>
              <TouchableOpacity style={styles.boton} onPress={guardarEnApp}>
                <Text style={styles.botonTexto}>{t.enLaApp}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonCalendario} onPress={guardarEnMovil}>
                <Text style={styles.botonCalendarioTexto}>{t.enElMovil}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonSecundario} onPress={() => setModalGuardarVisible(false)}>
                <Text style={styles.botonSecundarioTexto}>{t.cancelar}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ---- Formulario ----
  return (
    <View style={styles.fondo}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.cabecera}>
          <Text style={[styles.titulo, styles.tituloCabecera]}>{t.tituloPrincipal}</Text>
          <View style={styles.botonesCabecera}>
            <BotonIdioma />
            <TouchableOpacity style={styles.botonCabecera} onPress={() => setMostrandoCalendario(true)}>
              <Text style={styles.botonCabeceraTexto}>📅</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonCabecera} onPress={() => setMostrandoFavoritos(true)}>
              <Text style={styles.botonCabeceraTexto}>⭐{favoritos.length > 0 ? ` ${favoritos.length}` : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botonCabecera} onPress={() => setMostrandoAcercaDe(true)}>
              <Text style={styles.botonCabeceraTexto}>ℹ️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.filaUbicacion} onPress={() => setModalCiudadVisible(true)}>
          {ciudad === null ? (
            <Text style={styles.textoUbicacion}>{t.detectando}</Text>
          ) : (
            <Text style={styles.textoUbicacion}>
              📍 {ciudad}
              {ciudadManual ? t.elegida : ciudadDetectada ? '' : t.porDefecto}
              {clima ? `  ·  ${emojiClima(clima.descripcion)} ${clima.temperatura}°C` : ''}
              {'  '}<Text style={styles.textoCambiar}>{t.cambiar}</Text>
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.subtitulo}>{t.subtitulo}</Text>

        <Pregunta etiqueta={t.preguntaTiempo} opciones={t.tiempos} idx={idxTiempo} onSeleccionar={seleccionarTiempo} />
        <Pregunta etiqueta={t.preguntaPresupuesto} opciones={t.presupuestos} idx={idxPresupuesto} onSeleccionar={setIdxPresupuesto} />
        <Text style={styles.notaPersona}>{t.porPersonaNota}</Text>
        <Pregunta etiqueta={t.preguntaCompania} opciones={t.companias} idx={idxCompania} onSeleccionar={setIdxCompania} />
        <Pregunta etiqueta={t.preguntaAnimo} opciones={t.animos} idx={idxAnimo} onSeleccionar={setIdxAnimo} bloqueada={animoBloqueado} />

        <TouchableOpacity style={[styles.boton, (!todoSeleccionado || cargando) && styles.botonDeshabilitado]} disabled={!todoSeleccionado || cargando} onPress={generarPlan}>
          {cargando ? <ActivityIndicator color="#FFFFFF" /> : (
            <Text style={[styles.botonTexto, !todoSeleccionado && styles.botonTextoDeshabilitado]}>
              {todoSeleccionado ? t.generar : t.responde}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalCiudadVisible} transparent={true} animationType="fade" onRequestClose={cerrarModalCiudad}>
        <View style={styles.modalFondo}>
          <View style={styles.modalTarjeta}>
            <Text style={styles.modalTitulo}>{t.modalTitulo}</Text>
            <Text style={styles.modalSubtitulo}>{t.modalSubtitulo}</Text>
            <View style={styles.filaBusqueda}>
              <TextInput
                style={styles.modalInput}
                placeholder={t.modalPlaceholder}
                placeholderTextColor={COLORES.textoSecundario}
                value={textoCiudad}
                onChangeText={setTextoCiudad}
                autoFocus={true}
                returnKeyType="search"
                onSubmitEditing={buscarOpcionesCiudad}
              />
              <TouchableOpacity style={styles.botonBuscar} onPress={buscarOpcionesCiudad} disabled={buscandoCiudades}>
                {buscandoCiudades ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.botonBuscarTexto}>{t.buscar}</Text>}
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.listaResultados}>
              {resultadosCiudades.map((opcion, indice) => (
                <TouchableOpacity key={indice} style={styles.filaResultado} onPress={() => seleccionarCiudad(opcion)}>
                  <Text style={styles.resultadoCiudad}>{opcion.ciudad}</Text>
                  <Text style={styles.resultadoDetalle}>{opcion.region ? `${opcion.region}, ` : ''}{opcion.pais}</Text>
                </TouchableOpacity>
              ))}
              {busquedaHecha && resultadosCiudades.length === 0 && (
                <Text style={styles.sinResultados}>{t.sinResultados}</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.botonSecundario} onPress={volverAMiUbicacion}><Text style={styles.botonSecundarioTexto}>{t.usarUbicacion}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.botonSecundario} onPress={cerrarModalCiudad}><Text style={styles.botonSecundarioTexto}>{t.cancelar}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Pregunta({ etiqueta, opciones, idx, onSeleccionar, bloqueada }) {
  return (
    <View style={styles.bloque}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <View style={styles.chips}>
        {opciones.map((opcion, i) => {
          const activo = idx === i;
          // Si la pregunta está bloqueada, solo se muestra activo el seleccionado;
          // el resto quedan atenuados y no responden al toque.
          const atenuado = bloqueada && !activo;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.chip, activo && styles.chipActivo, atenuado && styles.chipAtenuado]}
              onPress={() => onSeleccionar(i)}
              disabled={bloqueada}
            >
              <Text style={[styles.chipTexto, activo && styles.chipTextoActivo, atenuado && styles.chipTextoAtenuado]}>{opcion}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: COLORES.fondo },
  contenido: { padding: 24, paddingTop: 72, paddingBottom: 48 },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  botonesCabecera: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  botonCabecera: { backgroundColor: COLORES.tarjeta, borderWidth: 1, borderColor: COLORES.borde, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 11 },
  botonCabeceraTexto: { color: COLORES.textoPrincipal, fontSize: 14, fontWeight: '600' },
  etiquetaCiudad: { fontSize: 12, fontWeight: '700', letterSpacing: 2, color: COLORES.acento, marginBottom: 6 },
  titulo: { fontSize: 32, fontWeight: '700', color: COLORES.textoPrincipal },
  tituloCabecera: { flex: 1, marginRight: 10 },
  filaUbicacion: { marginTop: 8 },
  textoUbicacion: { color: COLORES.acento, fontSize: 14, fontWeight: '600' },
  textoCambiar: { color: COLORES.textoSecundario, fontSize: 13, fontWeight: '400' },
  subtitulo: { fontSize: 15, color: COLORES.textoSecundario, marginTop: 6, marginBottom: 28, lineHeight: 22 },
  bloque: { marginBottom: 24 },
  notaPersona: { color: COLORES.textoSecundario, fontSize: 12, marginTop: -16, marginBottom: 24, fontStyle: 'italic' },
  etiqueta: { fontSize: 16, fontWeight: '600', color: COLORES.textoPrincipal, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: COLORES.tarjeta, borderWidth: 1, borderColor: COLORES.borde },
  chipActivo: { backgroundColor: COLORES.acento, borderColor: COLORES.acento },
  chipTexto: { color: COLORES.textoSecundario, fontSize: 14 },
  chipTextoActivo: { color: '#FFFFFF', fontWeight: '600' },
  chipAtenuado: { opacity: 0.4 },
  chipTextoAtenuado: { color: COLORES.textoSecundario },
  tarjetaActividad: { flexDirection: 'row', marginBottom: 4 },
  columnaHora: { width: 64, alignItems: 'center' },
  hora: { color: COLORES.acento, fontSize: 14, fontWeight: '700', marginTop: 16 },
  lineaVertical: { flex: 1, width: 2, backgroundColor: COLORES.borde, marginTop: 6, marginBottom: -10, borderRadius: 1 },
  columnaInfo: { flex: 1, backgroundColor: COLORES.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: COLORES.borde, padding: 16, marginBottom: 12 },
  nombreActividad: { color: COLORES.textoPrincipal, fontSize: 15, fontWeight: '600', lineHeight: 21, marginBottom: 10 },
  pildoraCoste: { alignSelf: 'flex-start', backgroundColor: COLORES.acentoSuave, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  pildoraGratis: { backgroundColor: COLORES.verdeSuave },
  textoCoste: { color: COLORES.acento, fontSize: 12, fontWeight: '700' },
  textoGratis: { color: COLORES.verdeTexto },
  filaTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORES.tarjeta, borderRadius: 14, padding: 16, marginTop: 8, marginBottom: 12, borderWidth: 1, borderColor: COLORES.acento },
  etiquetaTotal: { color: COLORES.textoPrincipal, fontSize: 14, fontWeight: '600' },
  valorTotal: { color: COLORES.acento, fontSize: 20, fontWeight: '700' },
  filaAcciones: { flexDirection: 'row', gap: 8, marginTop: 4 },
  botonAccion: { flex: 1, backgroundColor: COLORES.acentoSuave, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  botonAccionOk: { backgroundColor: COLORES.verdeSuave },
  botonAccionTexto: { color: COLORES.acento, fontSize: 14, fontWeight: '700' },
  botonAccionTextoOk: { color: COLORES.verdeTexto },
  botonReservar: { marginTop: 8, backgroundColor: COLORES.verdeSuave, borderWidth: 1, borderColor: COLORES.verdeTexto, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  botonReservarTexto: { color: COLORES.verdeTexto, fontSize: 15, fontWeight: '700' },
  botonCalendario: { marginTop: 8, backgroundColor: COLORES.tarjeta, borderWidth: 1, borderColor: COLORES.acento, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  botonCalendarioTexto: { color: COLORES.acento, fontSize: 15, fontWeight: '700' },
  boton: { marginTop: 12, backgroundColor: COLORES.acento, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  botonDeshabilitado: { backgroundColor: '#EDE8DC' },
  botonTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  botonTextoDeshabilitado: { color: COLORES.textoSecundario },
  botonSecundario: { marginTop: 10, paddingVertical: 14, alignItems: 'center' },
  botonSecundarioTexto: { color: COLORES.textoSecundario, fontSize: 15 },
  tarjetaAcercaDe: { backgroundColor: COLORES.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: COLORES.borde, padding: 16, marginBottom: 12 },
  tituloAcercaDe: { color: COLORES.textoPrincipal, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  textoAcercaDe: { color: COLORES.textoSecundario, fontSize: 14, lineHeight: 22 },
  tarjetaFavorito: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORES.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: COLORES.borde, padding: 16, marginBottom: 12 },
  favoritoInfo: { flex: 1 },
  favoritoTitulo: { color: COLORES.textoPrincipal, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  favoritoDetalle: { color: COLORES.textoSecundario, fontSize: 13 },
  botonBorrar: { padding: 8, marginLeft: 8 },
  botonBorrarTexto: { fontSize: 18 },
  modalFondo: { flex: 1, backgroundColor: 'rgba(41, 37, 36, 0.5)', justifyContent: 'center', padding: 24 },
  modalTarjeta: { backgroundColor: COLORES.fondo, borderRadius: 18, padding: 22, maxHeight: '80%' },
  modalTitulo: { fontSize: 20, fontWeight: '700', color: COLORES.textoPrincipal, marginBottom: 12 },
  modalSubtitulo: { fontSize: 14, color: COLORES.textoSecundario, marginTop: 6, marginBottom: 16, lineHeight: 20 },
  filaBusqueda: { flexDirection: 'row', gap: 8 },
  modalInput: { flex: 1, backgroundColor: COLORES.tarjeta, borderWidth: 1, borderColor: COLORES.borde, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 16, color: COLORES.textoPrincipal },
  botonBuscar: { backgroundColor: COLORES.acento, borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  botonBuscarTexto: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  listaResultados: { marginTop: 12, maxHeight: 260 },
  filaResultado: { backgroundColor: COLORES.tarjeta, borderWidth: 1, borderColor: COLORES.borde, borderRadius: 12, padding: 14, marginBottom: 8 },
  resultadoCiudad: { color: COLORES.textoPrincipal, fontSize: 15, fontWeight: '600' },
  resultadoDetalle: { color: COLORES.textoSecundario, fontSize: 13, marginTop: 2 },
  sinResultados: { color: COLORES.textoSecundario, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
});