import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system';

const LISTAS = {
  aseguradoras: ["HDI", "EL ÁGUILA", "GEN DE SEG", "ALLIANZ", "ANA SEGUROS", "CHUBB", "ZURICH", "MOMENTO", "OTRA"],
  atencion: ["COMPLEMENTARIA", "SIN PÓLIZA", "DIVERSOS", "KM", "PEAJE"],
  acuerdos: ["COBRO SIPAC", "COBRO COPAC", "RECUPERACIÓN EFECTIVO", "RECUPERACIÓN TDD", "RECUPERACIÓN GOA", "RECUPERACIÓN MODULO", "COSTO ASEGURADO", "CRISTAL", "SEGURO DE RINES Y LLANTAS", "ROBO PARCIAL", "ROBO TOTAL", "JURÍDICO", "PLAN PISO", "CASH FLOW", "INVESTIGACIÓN", "COMPLEMENTO", "PAGO SIPAC", "PAGO COPAC", "COSTO TERCERO", "PAGO UMAS Y DEDUCIBLES", "S/C ARREGLO ENTRE PARTICULARES", "S/C MENOR AL DEDUCIBLE", "IMPROCEDENTE", "S/C SIN PÓLIZA", "RECHAZO", "NO LOCALIZADO", "DIVERSOS", "CANCELADO 10 < NO FACTURAR"],
  responsabilidad: ["ASEGURADO", "TERCERO", "CORRESPONSABILIDAD"],
  circunstancias: ["ALCANCE", "PASADA DE ALTO", "INVASIÓN DE CARRIL", "REVERSA", "ESTACIONADO", "CAMBIO DE CARRIL", "SENTIDO CONTRARIO", "OTRO"],
  improcedentes: ["CAMBIO DE CONDUCTOR", "COBERTURA NO AMPARADA", "LICENCIA", "NO ES ASEGURADO", "RECHAZO", "DESISTIMIENTO"]
};

const ORDEN_FOTOS = [
  "DUA ANVERSO", "DUA REVERSO", "ENCUESTA SATISFACCIÓN", "LICENCIA", "TARJETA CIRCULACIÓN", 
  "NÚMERO DE VIN", "ODÓMETRO", "IDENTIFICACIONES", "VOLANTES", "OTROS DOCUMENTOS", "DAÑOS", "MÉTODO CRONOS",
  "DOCUMENTOS TERCERO", "DAÑOS TERCERO", "PROCEDIMIENTO CRONOS TERCERO"
];

const URL_ACCESO = "https://raw.githubusercontent.com/ereza018-png/Crashappp/main/acceso.json";

export default function App() {
  const [autorizado, setAutorizado] = useState(false);
  const [perfil, setPerfil] = useState({ id: "", nombre: "" });
  const [inputID, setInputID] = useState("");
  const refSiniestro = useRef(); 

  const [datos, setDatos] = useState({
    aseguradora: '', reporte: '', siniestro: '', atencion: [], acuerdo: '', 
    responsabilidad: '', circunstancias: '', improcedentes: ''
  });
  const [attachments, setAttachments] = useState([]);

  const RUTA_RESPALDO = FileSystem.documentDirectory + 'Respaldo_Crashito/';

  useEffect(() => { 
    asegurarCarpeta();
    checarAcceso(); 
  }, []);

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
        if (config.usuarios_autorizados.find(u => u.id === p.id)) {
          setPerfil(p); setAutorizado(true);
        }
      }
    } catch (e) { console.log("Error de red", e); }
  };

  const login = async () => {
    try {
      const res = await fetch(URL_ACCESO);
      const config = await res.json();
      const user = config.usuarios_autorizados.find(u => u.id === inputID.trim().toUpperCase());
      if (user) {
        await AsyncStorage.setItem('@perfil', JSON.stringify(user));
        setPerfil(user); setAutorizado(true);
      } else { Alert.alert("Error", "ID No Autorizado"); }
    } catch (e) { Alert.alert("Error", "Sin Conexión"); }
  };

  const manejarImagen = async (tipo, cat) => {
    // OPTIMIZACIÓN: Calidad al 0.3 (30%) para ahorrar los datos de los ajustadores
    const opciones = { quality: 0.3 };
    
    const res = tipo === 'camara' 
      ? await ImagePicker.launchCameraAsync(opciones) 
      : await ImagePicker.launchImageLibraryAsync(opciones);

    if (!res.canceled) {
      const hoy = new Date();
      const fecha = `${hoy.getDate()}-${hoy.getMonth()+1}-${hoy.getFullYear()}_${hoy.getHours()}${hoy.getMinutes()}`;
      const aseg = datos.aseguradora ? datos.aseguradora : 'SIN_ASEGURADORA';
      const rep = datos.reporte ? datos.reporte : 'SIN_REPORTE';
      
      const nombreFinal = `${aseg}_REP_${rep}_${cat}_${fecha}.jpg`.replace(/\s+/g, '_').toUpperCase();
      const destino = RUTA_RESPALDO + nombreFinal;

      await FileSystem.copyAsync({ from: res.assets[0].uri, to: destino });
      setAttachments([...attachments, { uri: destino, label: cat }]);
    }
  };

  const enviarReporte = async () => {
    if (!datos.aseguradora || !datos.reporte || !datos.siniestro) {
      return Alert.alert("Faltan Datos", "Llena Aseguradora, Reporte y Siniestro.");
    }
    
    // FORMATO DE ASUNTO SOLICITADO CON ATENCIÓN MÚLTIPLE AL FINAL
    const asunto = `${datos.aseguradora} reporte ${datos.reporte} siniestro ${datos.siniestro} atencion ${datos.atencion.join(' ')}`.toUpperCase();
    
    // ORDENAMIENTO DE FOTOGRAFÍAS ANTES DE ENVIAR
    const ordenadas = [...attachments].sort((a,b) => ORDEN_FOTOS.indexOf(a.label) - ORDEN_FOTOS.indexOf(b.label));

    await MailComposer.composeAsync({
      recipients: ['reportes@crashasesores.com'],
      subject: asunto,
      body: `REPORTE: ${perfil.nombre}\n\nAcuerdo: ${datos.acuerdo}\nResponsabilidad: ${datos.responsabilidad}\nCircunstancias: ${datos.circunstancias}`,
      attachments: ordenadas.map(f => f.uri)
    });
  };

  const cerrarSesion = () => {
    setDatos({ aseguradora: '', reporte: '', siniestro: '', atencion: [], acuerdo: '', responsabilidad: '', circunstancias: '', improcedentes: '' });
    setAttachments([]);
    setAutorizado(false);
  };

  if (!autorizado) return (
    <View style={styles.loginPage}>
      <Text style={styles.loginTitle}>CRASH ASESORES</Text>
      <TextInput style={styles.loginInput} placeholder="ID AJUSTADOR" value={inputID} onChangeText={setInputID} keyboardType="numeric" />
      <TouchableOpacity style={styles.loginBtn} onPress={login}><Text style={{fontWeight:'bold'}}>ENTRAR</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={{color:'white', fontWeight:'bold'}}>{perfil.nombre}</Text>
        <TouchableOpacity onPress={cerrarSesion}><Text style={{color:'red', fontWeight:'bold'}}>LIMPIAR/SALIR</Text></TouchableOpacity>
      </View>

      <ScrollView style={{padding: 15}}>
        <Text style={styles.sectionT}>DATOS PRINCIPALES</Text>
        <TextInput style={styles.input} placeholder="ASEGURADORA" onChangeText={v => setDatos({...datos, aseguradora: v})} />
        
        {/* TABULADOR AQUI (returnKeyType="next" y onSubmitEditing) */}
        <TextInput 
          style={styles.input} 
          placeholder="NÚMERO DE REPORTE" 
          keyboardType="numeric" 
          returnKeyType="next" 
          onSubmitEditing={() => refSiniestro.current.focus()} 
          onChangeText={v => setDatos({...datos, reporte: v})} 
        />
        <TextInput 
          ref={refSiniestro} 
          style={styles.input} 
          placeholder="NÚMERO DE SINIESTRO" 
          keyboardType="numeric" 
          onChangeText={v => setDatos({...datos, siniestro: v})} 
        />

        <Text style={styles.sectionT}>ATENCIÓN (CHECKLIST MÚLTIPLE):</Text>
        <View style={styles.grid}>
          {LISTAS.atencion.map(i => (
            <TouchableOpacity key={i} style={[styles.check, datos.atencion.includes(i) && styles.checkAct]} onPress={() => {
              let at = [...datos.atencion];
              at.includes(i) ? at = at.filter(x=>x!==i) : at.push(i);
              setDatos({...datos, atencion: at});
            }}>
              <Text style={{fontSize:10, color: datos.atencion.includes(i) ? 'white' : 'black'}}>{i}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionT}>ACUERDO (ÚNICA):</Text>
        <View style={styles.grid}>
          {LISTAS.acuerdos.map(i => (
            <TouchableOpacity key={i} style={[styles.check, datos.acuerdo === i && styles.checkAct]} onPress={() => setDatos({...datos, acuerdo: i})}>
              <Text style={{fontSize:8, textAlign:'center', color: datos.acuerdo === i ? 'white' : 'black'}}>{i}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionT}>RESPONSABILIDAD (ÚNICA):</Text>
        <View style={styles.grid}>
          {LISTAS.responsabilidad.map(i => (
            <TouchableOpacity key={i} style={[styles.check, datos.responsabilidad === i && styles.checkAct]} onPress={() => setDatos({...datos, responsabilidad: i})}>
              <Text style={{fontSize:9, textAlign:'center', color: datos.responsabilidad === i ? 'white' : 'black'}}>{i}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionT}>CIRCUNSTANCIAS (ÚNICA):</Text>
        <View style={styles.grid}>
          {LISTAS.circunstancias.map(i => (
            <TouchableOpacity key={i} style={[styles.check, datos.circunstancias === i && styles.checkAct]} onPress={() => setDatos({...datos, circunstancias: i})}>
              <Text style={{fontSize:9, textAlign:'center', color: datos.circunstancias === i ? 'white' : 'black'}}>{i}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionT}>FOTOGRAFÍAS ORDENADAS</Text>
        {ORDEN_FOTOS.map(cat => (
          <View key={cat} style={styles.catRow}>
            <Text style={{fontSize:10, width:'45%'}}>{cat}</Text>
            <View style={{flexDirection:'row'}}>
              <TouchableOpacity onPress={() => manejarImagen('camara', cat)} style={styles.btnCam}><Text>📷</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => manejarImagen('galeria', cat)} style={styles.btnCam}><Text>🖼️</Text></TouchableOpacity>
            </View>
            <Text style={{fontSize:12, fontWeight:'bold', color:'#0066CC', width: 20, textAlign:'center'}}>
              {attachments.filter(a => a.label === cat).length > 0 ? attachments.filter(a => a.label === cat).length : ''}
            </Text>
          </View>
        ))}

        <TouchableOpacity style={styles.btnEnviar} onPress={enviarReporte}>
          <Text style={styles.btnText}>ENVIAR REPORTE</Text>
        </TouchableOpacity>
        <View style={{height: 100}} />
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
  sectionT: { fontWeight: 'bold', color: '#003366', marginTop: 15, fontSize: 13, borderBottomWidth: 1, borderColor: '#EEE', paddingBottom: 5 },
  input: { borderBottomWidth: 1.5, borderColor: '#003366', marginBottom: 10, padding: 10, fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 5 },
  check: { width: '48%', padding: 8, borderWidth: 1, borderColor: '#DDD', marginBottom: 5, borderRadius: 5, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  checkAct: { backgroundColor: '#0066CC', borderColor: '#0066CC' },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#EEE' },
  btnCam: { padding: 10, backgroundColor: '#F0F0F0', borderRadius: 5, marginLeft: 5 },
  btnEnviar: { backgroundColor: '#FFCC00', padding: 22, borderRadius: 15, alignItems: 'center', marginTop: 30 },
  btnText: { color: '#003366', fontWeight: 'bold', fontSize: 16 }
});
