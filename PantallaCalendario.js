// PantallaCalendario.js — Calendario propio de la app (vista de mes + planes por día)
import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';

const COLORES = {
  fondo: '#FAF7F0', tarjeta: '#FFFFFF', borde: '#E5DFD0',
  textoPrincipal: '#292524', textoSecundario: '#78716C',
  acento: '#C2410C', acentoSuave: '#FBEAE2', verdeSuave: '#DCFCE7', verdeTexto: '#166534',
};

function fechaAClave(fecha) {
  const a = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
}

export default function PantallaCalendario({ t, agenda, onVolver, onEliminarPlan, modoElegirDia, onElegirDia }) {
  const hoy = new Date();
  const [mesVisible, setMesVisible] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [diaSeleccionado, setDiaSeleccionado] = useState(fechaAClave(hoy));

  // En modo "elegir día", al tocar un día se asigna el plan a ese día directamente
  const tocarDia = (clave) => {
    if (modoElegirDia) {
      onElegirDia(clave);
    } else {
      setDiaSeleccionado(clave);
    }
  };

  const anio = mesVisible.getFullYear();
  const mes = mesVisible.getMonth();

  // Construye la cuadrícula del mes
  const primerDia = new Date(anio, mes, 1);
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  // getDay(): 0=domingo..6=sábado. Lo convertimos a 0=lunes..6=domingo
  let offset = primerDia.getDay() - 1;
  if (offset < 0) offset = 6;

  const celdas = [];
  for (let i = 0; i < offset; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d);

  const cambiarMes = (delta) => {
    setMesVisible(new Date(anio, mes + delta, 1));
  };

  const claveDia = (d) => fechaAClave(new Date(anio, mes, d));
  const tienePlanes = (d) => {
    const c = claveDia(d);
    return agenda[c] && agenda[c].length > 0;
  };
  const esHoy = (d) =>
    d === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();

  const planesDelDia = agenda[diaSeleccionado] || [];

  const confirmarEliminar = (id) => {
    Alert.alert(t.eliminarTitulo, t.eliminarMensaje, [
      { text: t.cancelar, style: 'cancel' },
      { text: t.eliminar, style: 'destructive', onPress: () => onEliminarPlan({ fechaClave: diaSeleccionado, id }) },
    ]);
  };

  // Texto bonito del día seleccionado
  const [aa, mm, dd] = diaSeleccionado.split('-');
  const fechaSel = new Date(Number(aa), Number(mm) - 1, Number(dd));
  const textoDiaSel = `${fechaSel.getDate()} ${t.meses[fechaSel.getMonth()]}`;

  return (
    <View style={styles.fondo}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <Text style={styles.titulo}>{t.miCalendarioTitulo}</Text>

        {modoElegirDia && (
          <View style={styles.bannerElegir}>
            <Text style={styles.bannerElegirTexto}>{t.elegirDia} 👇</Text>
          </View>
        )}

        {/* Cabecera del mes con flechas */}
        <View style={styles.cabeceraMes}>
          <TouchableOpacity onPress={() => cambiarMes(-1)} style={styles.flecha}>
            <Text style={styles.flechaTexto}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.nombreMes}>{t.meses[mes]} {anio}</Text>
          <TouchableOpacity onPress={() => cambiarMes(1)} style={styles.flecha}>
            <Text style={styles.flechaTexto}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Días de la semana */}
        <View style={styles.filaSemana}>
          {t.diasSemana.map((dia, i) => (
            <Text key={i} style={styles.diaSemana}>{dia}</Text>
          ))}
        </View>

        {/* Cuadrícula de días */}
        <View style={styles.cuadricula}>
          {celdas.map((d, i) => {
            if (d === null) return <View key={i} style={styles.celdaVacia} />;
            const seleccionado = claveDia(d) === diaSeleccionado;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.celda, seleccionado && styles.celdaSeleccionada, esHoy(d) && styles.celdaHoy]}
                onPress={() => tocarDia(claveDia(d))}
              >
                <Text style={[styles.celdaTexto, seleccionado && styles.celdaTextoSel]}>{d}</Text>
                {tienePlanes(d) && <View style={[styles.punto, seleccionado && styles.puntoSel]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Planes del día seleccionado */}
        <Text style={styles.tituloDia}>{textoDiaSel}</Text>
        {planesDelDia.length === 0 ? (
          <Text style={styles.sinPlanes}>{t.sinPlanesDia}</Text>
        ) : (
          planesDelDia.map((entrada) => (
            <View key={entrada.id} style={styles.tarjetaPlan}>
              <View style={styles.planInfo}>
                <Text style={styles.planTitulo}>
                  {entrada.hora ? `${entrada.hora} · ` : ''}{entrada.plan.titulo}
                </Text>
                <Text style={styles.planDetalle}>📍 {entrada.ciudad} · {entrada.plan.costeTotal}</Text>
              </View>
              <TouchableOpacity style={styles.botonBorrar} onPress={() => confirmarEliminar(entrada.id)}>
                <Text style={styles.botonBorrarTexto}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.botonSecundario} onPress={onVolver}>
          <Text style={styles.botonSecundarioTexto}>{t.volver}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: COLORES.fondo },
  contenido: { padding: 24, paddingTop: 72, paddingBottom: 48 },
  titulo: { fontSize: 32, fontWeight: '700', color: COLORES.textoPrincipal, marginBottom: 20 },
  bannerElegir: { backgroundColor: COLORES.acentoSuave, borderRadius: 12, padding: 14, marginBottom: 16 },
  bannerElegirTexto: { color: COLORES.acento, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  cabeceraMes: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  flecha: { backgroundColor: COLORES.tarjeta, borderWidth: 1, borderColor: COLORES.borde, borderRadius: 999, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  flechaTexto: { fontSize: 24, color: COLORES.acento, fontWeight: '700', marginTop: -2 },
  nombreMes: { fontSize: 18, fontWeight: '700', color: COLORES.textoPrincipal },
  filaSemana: { flexDirection: 'row', marginBottom: 8 },
  diaSemana: { flex: 1, textAlign: 'center', color: COLORES.textoSecundario, fontSize: 13, fontWeight: '600' },
  cuadricula: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  celdaVacia: { width: `${100 / 7}%`, aspectRatio: 1 },
  celdaSeleccionada: { backgroundColor: COLORES.acento },
  celdaHoy: { borderWidth: 1.5, borderColor: COLORES.acento },
  celdaTexto: { fontSize: 15, color: COLORES.textoPrincipal, fontWeight: '500' },
  celdaTextoSel: { color: '#FFFFFF', fontWeight: '700' },
  punto: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORES.acento, marginTop: 2 },
  puntoSel: { backgroundColor: '#FFFFFF' },
  tituloDia: { fontSize: 18, fontWeight: '700', color: COLORES.textoPrincipal, marginTop: 24, marginBottom: 12 },
  sinPlanes: { color: COLORES.textoSecundario, fontSize: 14 },
  tarjetaPlan: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORES.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: COLORES.borde, padding: 16, marginBottom: 12 },
  planInfo: { flex: 1 },
  planTitulo: { color: COLORES.textoPrincipal, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  planDetalle: { color: COLORES.textoSecundario, fontSize: 13 },
  botonBorrar: { padding: 8, marginLeft: 8 },
  botonBorrarTexto: { fontSize: 18 },
  botonSecundario: { marginTop: 20, paddingVertical: 14, alignItems: 'center' },
  botonSecundarioTexto: { color: COLORES.textoSecundario, fontSize: 15 },
});