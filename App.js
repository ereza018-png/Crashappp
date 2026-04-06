import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, Modal, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

const LISTAS = {
  aseguradoras: ["HDI", "EL ÁGUILA", "GEN DE SEG", "ALLIANZ", "ANA SEGUROS", "CHUBB", "ZURICH", "MOMENTO", "OTRA"],
  atencion: ["COMPLEMENTARIA", "SIN PÓLIZA", "DIVERSOS", "KM", "PEAJE"],
  acuerdos: ["COBRO SIPAC", "COBRO COPAC", "RECUPERACIÓN EFECTIVO", "RECUPERACIÓN TDD", "RECUPERACIÓN EFECTIVO Y TDD", "RECUPERACIÓN GOA", "RECUPERACIÓN MODULO", "COSTO ASEGURADO", "CRISTAL", "SEGURO DE RINES Y LLANTAS", "ROBO PARCIAL", "ROBO TOTAL", "JURÍDICO", "PLAN PISO", "CASH FLOW", "INVESTIGACIÓN", "COMPLEMENTO", "PAGO SIPAC", "PAGO COPAC", "COSTO TERCERO", "PAGO UMAS Y DEDUCIBLES", "S/C ARREGLO ENTRE PARTICULARES", "S/C MENOR AL DEDUCIBLE", "IMPROCEDENTE", "S/C SIN PÓLIZA", "RECHAZO", "NO LOCALIZADO", "DIVERSOS", "CANCELADO 10 < NO FACTURAR"],
  responsabilidad: ["ASEGURADO", "TERCERO", "PENDIENTE", "CORRESPONSABILIDAD"],
  circunstancias: ["AGRAVAMIENTO DE DAÑO", "ALCANCE", "AMPLITUD Y/O AFLUENCIA", "APERTURA DE PUERTA", "ASESORÍA", "ATROPELLO", "BACHE", "CAÍDA DE OBJETOS", "CAMBIO DE CARRIL", "CARRIL DE CONTRA FLUJO", "CASH FLOW RECUPERACIÓN", "CIRCULABA A LA IZQUIERDA EN CRUCERO", "DE IGUAL AMPLITUD", "CIRCULABA SOBRE LA VÍA PRINCIPAL", "CIRCULABA SOBRE LA VÍA SECUNDARIA", "CITA POSTERIOR", "CORTE DE CIRCULACIÓN", "CUNETA", "DAÑOS OCASIONADOS POR LA CARGA", "DIVERSOS", "DUPLICADO", "ENTRE CARRILES", "ESTACIONADO", "EXCESO DE VELOCIDAD", "FALLA MECÁNICA", "INCORPORACIÓN", "INUNDACIÓN", "INVACIÓN DE CARRIL", "LIBERACIÒN DE VEHÍCULO", "MANIOBRAS PARA ESTACIONARSE", "NO LOCALIZADO", "NO TOMÉ EL EXTREMO", "OBJETO FIJO", "PAGO DE DAÑOS PAGO SIPAC/COPAC", "PARTES BAJAS", "PASADA DE ALTO", "PASES MÉDICOS", "PENDIENTE DECLARACIÓN", "PERDER EL CONTROL", "RECUPERACIÓN (RECUPERACIÓN,UMAS)", "RECUPERACIÓN COPAC/SIPAC", "RECUPERACIÓN DE VEHÍCULO POR ROBO", "REVERSA", "ROBO PARCIAL", "ROBO TOTAL", "ROTURA DE CRISTAL", "SALIDA DE CAMINO", "SALÍDA DE COCHERA", "SEMOVIENTE", "SENTIDO CONTRARIO", "SEÑAL PREVENTIVA", "SEÑAL RESTRICTIVA", "SIN COSTO", "TRASLADO", "VALE DE GRÚA", "VALET PARKING", "VANDALISMO", "VEHÍCULO RECUPERADO", "VIOLENCIA", "VISTA A LA DERECHA", "VOLANTE DE ADMISIÓN", "VOLANTE DE ADMISIÓN y GRÚA", "VOLCADURA", "VUELTA A LA DERECHA", "VUELTA A LA IZQUIERDA", "VUELTA DESDE EL SEGUNDO CARRIL", "VUELTA EN U", "VUELTA PROHIBIDA", "GRANIZO", "DERRAPO", "OTRO"]
};

const ORDEN_FOTOS = ["DUA ANVERSO", "DUA REVERSO", "ENCUESTA SATISFACCIÓN", "LICENCIA", "TARJETA CIRCULACIÓN", "NÚMERO DE VIN", "ODÓMETRO", "IDENTIFICACIONES", "VOLANTES", "OTROS DOCUMENTOS", "DAÑOS", "MÉTODO CRONOS"];

const URL_ACCESO = "https://raw.githubusercontent.com/ereza018-png/Crashappp/main/acceso.json";

export default function App() {
  const [autorizado, setAutorizado] = useState(false);
  const [perfil, setPerfil] = useState({ id: "", nombre: "" });
  const [inputID, setInputID] = useState("");
  const refSiniestro = useRef();
  const [datos, setDatos] = useState({ aseguradora: '', reporte: '', siniestro: '', atencion: [], acuerdo: '', responsabilidad: '', circunstancias: '' });
  const [attachments, setAttachments] = useState([]);
  const RUTA_RESPALDO = FileSystem.documentDirectory + 'Respaldo_Crashito/';

  useEffect(() => { asegurarCarpeta(); checarAcceso(); }, []);

  const asegurarCarpeta = async () => {
    const info = await FileSystem.getInfoAsync(RUTA_RESPALDO);
    if (!info.exists) await FileSystem.makeDirectoryAsync(RUTA_RESPALDO, { intermediates: true });
  };

  const checarAcceso = async () => {
    try {
      const res = await fetch(URL_ACCESO);
      const config = await res.json();
      const pLocal = await AsyncStorage.getItem('@perfil');
      if (pLocal) {
        const p = JSON.parse(pLocal);
        if (config.usuarios_autorizados.find(u => u.id === p.id)) { setPerfil(p); setAutorizado(true); }
      }
    } catch (e) { console.log("Modo Offline"); }
  };

  const login = async () => {
    try {
      const res = await fetch(URL_ACCESO);
      const config = await res.json();
      const user = config.usuarios_autorizados.find(u => u.id === inputID.trim().toUpperCase());
      if (user) {
        await AsyncStorage.setItem('@perfil', JSON.stringify(user));
        setPerfil(user); setAutorizado(true);
      } else { Alert.alert("Error", "ID no autorizado"); }
    } catch (e) { Alert.alert("Error", "Revisa conexión"); }
  };

  // --- 🧹 FUNCIONES DE LIMPIEZA Y CIERRE ---
  const limpiarFormulario = () => {
    Alert.alert("Innovación / Reset", "¿Aplicar Reset Mágico para empezar un nuevo siniestro?", [
      { text: "No, Mantener datos" },
      { text: "Sí, Reset Inteligente", onPress: () => {
        setDatos({ aseguradora: '', reporte: '', siniestro: '', atencion: [], acuerdo: '', responsabilidad: '', circunstancias: '' });
        setAttachments([]);
      }}
    ]);
  };

  const cerrarSesion = () => {
    Alert.alert("Salir", "¿Cerrar tu sesión de Ajustador?", [
      { text: "No" },
      { text: "Salir", onPress: async () => {
        await AsyncStorage.removeItem('@perfil');
        setAutorizado(false);
        setInputID("");
      }}
    ]);
  };

  const manejarOrigen = async (origen, cat) => {
    let res;
    const hoy = new Date();
    const fecha = `${hoy.getDate()}-${hoy.getMonth()+1}-${hoy.getFullYear()}`;
    const nombreFinal = `${datos.aseguradora}_REP_${datos.reporte}_${cat}_${fecha}.jpg`.replace(/\s+/g, '_').toUpperCase();
    const destino = RUTA_RESPALDO + nombreFinal;

    try {
      if (origen === 'camara') res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      else if (origen === 'galeria') res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
      else res = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });

      if (!res.canceled) {
        const uriOrig = origen === 'archivos' ? res.assets[0].uri : res.assets[0].uri;
        await FileSystem.copyAsync({ from: uriOrig, to: destino });
        setAttachments([...attachments, { uri: destino, label: cat }]);
      }
    } catch (e) { Alert.alert("Error", "No se pudo cargar"); }
  };

  const enviarReporte = async () => {
    const asunto = `${datos.aseguradora} reporte ${datos.reporte} siniestro ${datos.siniestro} atencion ${datos.atencion.join(' ')}`.toUpperCase();
    const ordenadas = [...attachments].sort((a,b) => ORDEN_FOTOS.indexOf(a.label) - ORDEN_FOTOS.indexOf(b.label));
    
    await MailComposer.composeAsync({
      recipients: ['reportes@crashasesores.com'],
      subject: asunto,
      body: `REPORTE: ${perfil.nombre}\nAcuerdo: ${datos.acuerdo}\nResponsabilidad: ${datos.responsabilidad}\nCircunstancias: ${datos.circunstancias}`,
      attachments: ordenadas.map(f => f.uri)
    });
  };

  if (!autorizado) return (
    <View style={styles.loginPage}>
      <Text style={styles.loginTitle}>CRASH ASESORES</Text>
      <TextInput style={styles.loginInput} placeholder="ID AJUSTADOR" value={inputID} onChangeText={setInputID} keyboardType="numeric" />
      <TouchableOpacity style={styles.loginBtn} onPress={login}><Text style={{fontWeight:'bold', color:'#003366'}}>INGRESAR</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={{color:'white', fontWeight:'bold'}}>{perfil.nombre}</Text>
        <TouchableOpacity onPress={cerrarSesion} style={styles.btnSalir}><Text style={{color:'white', fontSize:10}}>CERRAR SESIÓN</Text></TouchableOpacity>
      </View>
      <ScrollView style={{padding: 15}}>
        <TextInput style={styles.input} placeholder="ASEGURADORA" value={datos.aseguradora} onChangeText={v => setDatos({...datos, aseguradora: v})} />
        <TextInput style={styles.input} placeholder="REPORTE" value={datos.reporte} keyboardType="numeric" returnKeyType="next" onSubmitEditing={() => refSiniestro.current.focus()} onChangeText={v => setDatos({...datos, reporte: v})} />
        <TextInput ref={refSiniestro} style={styles.input} placeholder="SINIESTRO" value={datos.siniestro} keyboardType="numeric" onChangeText={v => setDatos({...datos, siniestro: v})} />
        
        <Text style={styles.sectionT}>FOTOGRAFÍAS / ARCHIVOS / DRIVE</Text>
        {ORDEN_FOTOS.map(cat => (
          <View key={cat} style={styles.catRow}>
            <Text style={{fontSize:9, width:'35%'}}>{cat}</Text>
            <View style={{flexDirection:'row'}}>
              <TouchableOpacity onPress={() => manejarOrigen('camara', cat)} style={styles.iconB}><Text>📷</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => manejarOrigen('galeria', cat)} style={styles.iconB}><Text>🖼️</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => manejarOrigen('archivos', cat)} style={styles.iconB}><Text>📁</Text></TouchableOpacity>
            </View>
            <Text style={{fontSize:10, color:'blue'}}>{attachments.filter(a => a.label === cat).length}</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.btnEnviar} onPress={enviarReporte}><Text style={styles.btnText}>ENVIAR REPORTE</Text></TouchableOpacity>
        
        {/* --- 🔥 BOTÓN INNOVADOR DE RESET MAGIC --- */}
        <TouchableOpacity style={styles.btnLimpiar} onPress={limpiarFormulario}>
          <Text style={{color:'#666', fontWeight:'bold', fontSize: 13}}>✨ FRESH RESET / EMPEZAR DE CERO</Text>
        </TouchableOpacity>

        <View style={{height: 60}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  loginPage: { flex: 1, backgroundColor: '#003366', justifyContent: 'center', alignItems: 'center' },
  loginTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  loginInput: { backgroundColor: 'white', width: '80%', padding: 15, borderRadius: 10, textAlign: 'center', fontSize: 20 },
  loginBtn: { backgroundColor: '#FFCC00', padding: 15, borderRadius: 10, marginTop: 20, width: '80%', alignItems: 'center' },
  header: { backgroundColor: '#003366', paddingTop: 50, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  btnSalir: { backgroundColor: 'red', padding: 5, borderRadius: 5 },
  sectionT: { fontWeight: 'bold', color: '#003366', marginTop: 20, fontSize: 13, borderBottomWidth: 1, borderColor: '#EEE' },
  input: { borderBottomWidth: 1.5, borderColor: '#003366', marginBottom: 10, padding: 8 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderColor: '#EEE' },
  iconB: { padding: 8, backgroundColor: '#F5F5F5', borderRadius: 5, marginLeft: 5 },
  btnEnviar: { backgroundColor: '#FFCC00', padding: 20, borderRadius: 10, alignItems: 'center', marginTop: 30 },
  btnText: { color: '#003366', fontWeight: 'bold', fontSize: 18 },
  btnLimpiar: { marginTop: 30, padding: 18, alignItems: 'center', borderWidth: 1.5, borderColor: '#EEE', borderRadius: 15, backgroundColor: '#FBFBFB' }
});
