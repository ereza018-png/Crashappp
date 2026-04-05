import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal, FlatList, StatusBar, Image, Dimensions, BackHandler, LayoutAnimation, Platform, UIManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const { width } = Dimensions.get('window');
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const INICIAL = { aseguradora: 'Seleccionar', reporte: '', siniestro: '', atencion: [], acuerdos: 'Seleccionar', responsabilidad: 'Seleccionar', circunstancias: 'Seleccionar', improcedentes: 'Seleccionar' };

const ORDEN_MAESTRO = [
  "DUA ANVERSO", "DUA REVERSO", "ENCUESTA SATISFACCIÓN", "VOLANTES", 
  "NÚMERO DE SERIE", "ODÓMETRO", "LICENCIA", "TARJETA CIRCULACIÓN", 
  "IDENTIFICACIONES", "OTROS DOCUMENTOS", "DAÑOS", "MÉTODO CRONOS", 
  "DOCUMENTOS", "VEHÍCULO TERCERO"
];

export default function App() {
  const refSiniestro = useRef();
  const [loadingSeguridad, setLoadingSeguridad] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [perfil, setPerfil] = useState({ id: "", nombre: "", correo: "" });
  const [inputID, setInputID] = useState("");
  const [mensajeServidor, setMensajeServidor] = useState("");

  const [datos, setDatos] = useState(INICIAL);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({ title: '', options: [], field: '' });
  const [sourceVisible, setSourceVisible] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [aseguradoExp, setAseguradoExp] = useState(true);
  const [terceroExp, setTerceroExp] = useState(false);
  const [activeCat, setActiveCat] = useState('');
  const [preVisible, setPreVisible] = useState(false);
  const [tempUri, setTempUri] = useState(null);
  const [tempRot, setTempRot] = useState(0);

  useEffect(() => {
    checarIdentidad();
    (async () => {
      await Location.requestForegroundPermissionsAsync();
      await ImagePicker.requestCameraPermissionsAsync();
    })();
  }, []);

  const checarIdentidad = async () => {
    try {
      const perfilGuardado = await AsyncStorage.getItem('@perfil_ajustador');
      const res = await fetch('https://raw.githubusercontent.com/ereza018-png/Crashappp/main/acceso.json');
      const config = await res.json();
      setMensajeServidor(config.mensaje_bloqueo);

      if (perfilGuardado) {
        const p = JSON.parse(perfilGuardado);
        const usuarioValido = config.usuarios_autorizados.find(u => u.id.toUpperCase() === p.id.toUpperCase());
        if (usuarioValido) {
          setPerfil(usuarioValido);
          setAutorizado(true);
        } else { setAutorizado(false); }
      } else { setAutorizado(false); }
    } catch (e) {
      const local = await AsyncStorage.getItem('@perfil_ajustador');
      if (local) { setPerfil(JSON.parse(local)); setAutorizado(true); }
    }
    setLoadingSeguridad(false);
  };

  const registrarID = async () => {
    if (!inputID) return Alert.alert("Error", "Ingresa tu ID");
    setLoadingSeguridad(true);
    try {
      const res = await fetch('https://raw.githubusercontent.com/ereza018-png/Crashappp/main/acceso.json');
      const config = await res.json();
      const usuario = config.usuarios_autorizados.find(u => u.id.toUpperCase() === inputID.toUpperCase());
      
      if (usuario) {
        await AsyncStorage.setItem('@perfil_ajustador', JSON.stringify(usuario));
        setPerfil(usuario);
        setAutorizado(true);
      } else { Alert.alert("Denegado", "ID no autorizado."); }
    } catch (e) { Alert.alert("Error", "Sin conexión"); }
    setLoadingSeguridad(false);
  };

  const procesarYRespaldar = async (uriOriginal, categoria, esPdf = false) => {
    try {
      const ext = esPdf ? '.pdf' : '.jpg';
      const hoy = new Date();
      const fecha = `${hoy.getDate()}-${hoy.getMonth()+1}-${hoy.getFullYear()}`;
      const idS = `${datos.aseguradora}_${datos.reporte || datos.siniestro || 'SIN-ID'}`.replace(/\s+/g, '_');
      const nombre = `${idS}_${categoria}_${fecha}`.toUpperCase() + ext;
      
      const carpeta = FileSystem.documentDirectory + 'CRASH_RESPALDO/';
      const info = await FileSystem.getInfoAsync(carpeta);
      if (!info.exists) await FileSystem.makeDirectoryAsync(carpeta, { intermediates: true });

      const destino = carpeta + nombre;
      await FileSystem.copyAsync({ from: uriOriginal, to: destino });
      return destino;
    } catch (e) { return uriOriginal; }
  };

  const manejarArchivo = async (modo) => {
    let res;
    if (modo === 'camara') {
      res = await ImagePicker.launchCameraAsync({ quality: 0.5 });
      if (!res.canceled) { setTempUri(res.assets[0].uri); setTempRot(0); setPreVisible(true); }
    } else {
      res = modo === 'galeria' ? await ImagePicker.launchImageLibraryAsync({ quality: 0.5, allowsMultipleSelection: true }) 
                               : await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: true });
      if (!res.canceled) {
        setLoading(true);
        const procesados = await Promise.all(res.assets.map(async (a) => {
          const r = await procesarYRespaldar(a.uri, activeCat, a.mimeType?.includes('pdf'));
          return { id: Date.now()+Math.random(), uri: r, type: a.mimeType?.includes('pdf') ? 'pdf' : 'image', label: activeCat, rotation: 0 };
        }));
        setAttachments([...attachments, ...procesados]);
        setLoading(false);
      }
    }
    setSourceVisible(false);
  };

  const enviar = async () => {
    setLoading(true);
    try {
      let loc = await Location.getCurrentPositionAsync({});
      const maps = `https://www.google.com/maps?q=${loc.coords.latitude},${loc.coords.longitude}`;
      
      const ordenados = [...attachments].sort((a, b) => {
        let iA = ORDEN_MAESTRO.indexOf(a.label);
        let iB = ORDEN_MAESTRO.indexOf(b.label);
        return (iA === -1 ? 99 : iA) - (iB === -1 ? 99 : iB);
      });

      const asunto = `${datos.aseguradora} REPORTE ${datos.reporte} SINIESTRO ${datos.siniestro} ${datos.atencion.join(' ')}`;
      const cuerpo = `REPORTE CRASH ASESORES\nAJUSTADOR: ${perfil.nombre}\nID: ${perfil.id}\n----------------\nASEGURADORA: ${datos.aseguradora}\nREPORTE: ${datos.reporte}\nSINIESTRO: ${datos.siniestro}\nACUERDOS: ${datos.acuerdos}\nRESPONSABILIDAD: ${datos.responsabilidad}\nCIRCUNSTANCIAS: ${datos.circunstancias}\nIMPROCEDENTES: ${datos.improcedentes}\n\nUBICACIÓN: ${maps}\n----------------\nArchivos ordenados y respaldados.`;
      
      await MailComposer.composeAsync({ recipients: ['tu-correo@ejemplo.com'], subject: asunto, body: cuerpo, attachments: ordenados.map(a => a.uri) });
    } catch (e) { Alert.alert("Error", "Fallo al enviar"); }
    setLoading(false);
  };

  if (loadingSeguridad) return <View style={styles.centrado}><ActivityIndicator size="large" color="#003366" /></View>;
  if (!autorizado) {
    return (
      <View style={styles.bloqueoCont}>
        <View style={styles.bloqueoCard}>
          <Text style={{fontSize:40}}>{perfil.id ? '🚫' : '🆔'}</Text>
          <Text style={styles.bloqueoTit}>{perfil.id ? 'ACCESO RESTRINGIDO' : 'IDENTIFICACIÓN'}</Text>
          {perfil.id ? <Text style={styles.bloqueoTxt}>{mensajeServidor}</Text> : 
            <TextInput style={styles.inputLogin} placeholder="ID Ajustador (Ej: AJ01)" value={inputID} onChangeText={setInputID} autoCapitalize="characters" />
          }
          <TouchableOpacity style={styles.btnRegistro} onPress={perfil.id ? checarIdentidad : registrarID}>
            <Text style={{color:'white', fontWeight:'bold'}}>{perfil.id ? 'REINTENTAR' : 'ACTIVAR'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.main}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View><Text style={{color:'white', fontSize:9, fontWeight:'bold'}}>{perfil.nombre}</Text><Text style={{color:'white', fontSize:8}}>ID: {perfil.id}</Text></View>
        <Text style={styles.headT}>CRASH ASESORES</Text>
        <TouchableOpacity onPress={() => BackHandler.exitApp()}><Text style={{color: 'red', fontWeight: 'bold'}}>SALIR</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{padding: 15}}>
        <View style={styles.card}>
          <Fila label="ASEGURADORA" field="aseguradora" val={datos.aseguradora} datos={datos} setDatos={setDatos} refS={refSiniestro} />
          <Fila label="REPORTE" field="reporte" val={datos.reporte} isInput datos={datos} setDatos={setDatos} refS={refSiniestro} />
          <Fila label="SINIESTRO" field="siniestro" val={datos.siniestro} isInput datos={datos} setDatos={setDatos} refS={refSiniestro} />
          <Fila label="ATENCION" field="atencion" val={datos.atencion.length + " Selecc."} datos={datos} setDatos={setDatos} refS={refSiniestro} />
          <Fila label="ACUERDOS" field="acuerdos" val={datos.acuerdos} datos={datos} setDatos={setDatos} refS={refSiniestro} />
          <Fila label="RESPONSABILIDAD" field="responsabilidad" val={datos.responsabilidad} datos={datos} setDatos={setDatos} refS={refSiniestro} />
          <Fila label="CIRCUNSTANCIAS" field="circunstancias" val={datos.circunstancias} datos={datos} setDatos={setDatos} refS={refSiniestro} />
          <Fila label="IMPROCEDENTES" field="improcedentes" val={datos.improcedentes} datos={datos} setDatos={setDatos} refS={refSiniestro} />
        </View>
        <Carpeta titulo="FOTOS ASEGURADO" lista={CATS.asegurado} exp={aseguradoExp} setExp={setAseguradoExp} attachments={attachments} setActiveCat={setActiveCat} setSourceVisible={setSourceVisible} setReviewVisible={setReviewVisible} />
        <Carpeta titulo="FOTOS TERCERO" lista={CATS.tercero} exp={terceroExp} setExp={setTerceroExp} attachments={attachments} setActiveCat={setActiveCat} setSourceVisible={setSourceVisible} setReviewVisible={setReviewVisible} />
        <TouchableOpacity style={styles.btnE} onPress={enviar} disabled={loading}>{loading ? <ActivityIndicator color="#003366" /> : <Text style={styles.btnET}>📩 ENVIAR REPORTE</Text>}</TouchableOpacity>
      </ScrollView>

      <Modal visible={preVisible} animationType="fade">
        <View style={styles.preF}>
          <Image source={{uri: tempUri}} style={[styles.preI, {transform: [{rotate: `${tempRot}deg`}]}]} />
          <View style={styles.preB}>
            <TouchableOpacity style={styles.pBtn} onPress={() => setTempRot((tempRot + 90) % 360)}><Text style={styles.pBtnT}>ROTAR</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.pBtn, {backgroundColor: '#2d6a2d'}]} onPress={async () => { const r = await procesarYRespaldar(tempUri, activeCat); setAttachments([...attachments, {id: Date.now(), uri: r, label: activeCat, rotation: tempRot, type: 'image'}]); manejarArchivo('camara'); }}><Text style={styles.pBtnT}>OTRA</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.pBtn, {backgroundColor: '#003366'}]} onPress={async () => { const r = await procesarYRespaldar(tempUri, activeCat); setAttachments([...attachments, {id: Date.now(), uri: r, label: activeCat, rotation: tempRot, type: 'image'}]); setPreVisible(false); }}><Text style={styles.pBtnT}>LISTO</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={reviewVisible} animationType="slide"><View style={styles.revC}><Text style={styles.revTi}>REVISAR / ELIMINAR</Text><FlatList data={attachments} numColumns={2} renderItem={({item}) => ( <View style={styles.revB}> {item.type === 'image' ? <Image source={{uri: item.uri}} style={[styles.revI, {transform: [{rotate: `${item.rotation}deg`}]}]} /> : <View style={[styles.revI, styles.pdfB]}><Text>📄 PDF</Text></View>} <Text numberOfLines={1} style={styles.revL}>{item.label}</Text><View style={styles.revA}><TouchableOpacity onPress={() => setAttachments(attachments.map(a => a.id === item.id ? {...a, rotation: (a.rotation + 90) % 360} : a))}><Text>🔄</Text></TouchableOpacity><TouchableOpacity onPress={async () => await Sharing.shareAsync(item.uri)}><Text>👁️</Text></TouchableOpacity><TouchableOpacity onPress={() => setAttachments(attachments.filter(a => a.id !== item.id))}><Text>🗑️</Text></TouchableOpacity></View></View> )} /><TouchableOpacity style={styles.revCl} onPress={() => setReviewVisible(false)}><Text style={{color:'white', fontWeight:'bold'}}>CERRAR</Text></TouchableOpacity></View></Modal>
      <Modal visible={sourceVisible} transparent={true}><View style={styles.mF}><View style={styles.mC}><Text style={styles.mT}>Origen: {activeCat}</Text><TouchableOpacity style={styles.sB} onPress={() => manejarArchivo('camara')}><Text>📷 Cámara</Text></TouchableOpacity><TouchableOpacity style={styles.sB} onPress={() => manejarArchivo('galeria')}><Text>🖼️ Galería (Multi)</Text></TouchableOpacity><TouchableOpacity style={styles.sB} onPress={() => manejarArchivo('drive')}><Text>📁 Drive / Archivos (Multi)</Text></TouchableOpacity><TouchableOpacity onPress={() => setSourceVisible(false)} style={styles.sB}><Text style={{color:'red'}}>Cancelar</Text></TouchableOpacity></View></View></Modal>
      <Modal visible={modalVisible} transparent={true} animationType="slide"><View style={styles.mF}><View style={styles.mC}><Text style={styles.mT}>{modalData.title}</Text><FlatList data={modalData.options} renderItem={({item}) => ( <TouchableOpacity style={styles.itL} onPress={() => { if (modalData.field === 'atencion') { const n = datos.atencion.includes(item) ? datos.atencion.filter(x => x !== item) : [...datos.atencion, item]; setDatos({...datos, atencion: n}); } else { setDatos({...datos, [modalData.field]: item}); setModalVisible(false); } }}><Text>{item} {datos.atencion.includes(item) ? '✅' : ''}</Text></TouchableOpacity> )} /><TouchableOpacity style={styles.btnC} onPress={() => setModalVisible(false)}><Text style={{color: 'white'}}>CERRAR</Text></TouchableOpacity></View></View></Modal>
    </View>
  );
}

function Fila({ label, field, val, isInput, datos, setDatos, refS }) {
  const LISTAS = {
    aseguradora: ["HDI", "EL ÁGUILA", "GEN DE SEG", "ALLIANZ", "ANA SEGUROS", "CHUBB", "OTRAS"],
    atencion: ["COMPLEMENTARIA", "SIN PÓLIZA", "DIVERSOS", "KM", "PEAJE"],
    acuerdos: ["COBRO SIPAC", "COBRO COPAC", "RECUPERACIÓN EFECTIVO", "RECUPERACIÓN TDD", "RECUPERACIÓN GOA", "RECUPERACIÓN MODULO", "COSTO ASEGURADO", "CRISTAL", "SEGURO DE RINES Y LLANTAS", "ROBO PARCIAL", "ROBO TOTAL", "JURÍDICO", "PLAN PISO", "CASH FLOW", "INVESTIGACIÓN", "COMPLEMENTO", "PAGO SIPAC", "PAGO COPAC", "COSTO TERCERO", "PAGO UMAS Y DEDUCIBLES", "S/C ARREGLO ENTRE PARTICULARES", "S/C MENOR AL DEDUCIBLE", "IMPROCEDENTE", "S/C SIN PÓLIZA", "RECHAZO", "NO LOCALIZADO", "DIVERSOS", "CANCELADO 10 < NO FACTURAR"],
    responsabilidad: ["ASEGURADO", "TERCERO", "CORRESPONSABILIDAD", "PENDIENTE"],
    circunstancias: ["AGRAVAMIENTO DE DAÑO", "ALCANCE", "AMPLITUD Y/O AFLUENCIA", "APERTURA DE PUERTA", "ASESORÍA", "ATROPELLO", "BACHE", "CAÍDA DE OBJETOS", "CAMBIO DE CARRIL", "CARRIL DE CONTRA FLUJO", "CASH FLOW RECUPERACIÓN", "CIRCULABA A LA IZQUIERDA EN CRUCERO", "DE IGUAL AMPLITUD", "CIRCULABA SOBRE LA VÍA PRINCIPAL", "CIRCULABA SOBRE LA VÍA SECUNDARIA", "CITA POSTERIOR", "CORTE DE CIRCULACIÓN", "CUNETA", "DAÑOS OCASIONADOS POR LA CARGA", "DIVERSOS", "DUPLICADO", "ENTRE CARRILES", "ESTACIONADO", "EXCESO DE VELOCIDAD", "FALLA MECÁNICA", "INCORPORACIÓN", "INUNDACIÓN", "INVACIÓN DE CARRIL", "LIBERACIÒN DE VEHÍCULO", "MANIOBRAS PARA ESTACIONARSE", "NO LOCALIZADO", "NO TOMÉ EL EXTREMO", "OBJETO FIJO", "PAGO DE DAÑOS PAGO SIPAC/COPAC", "PARTES BAJAS", "PASADA DE ALTO", "PASES MÉDICOS", "PENDIENTE DECLARACIÓN", "PERDER EL CONTROL", "RECUPERACIÓN (RECUPERACIÓN,UMAS)", "RECUPERACIÓN COPAC/SIPAC", "RECUPERACIÓN DE VEHÍCULO POR ROBO", "REVERSA", "ROBO PARCIAL", "ROBO TOTAL", "ROTURA DE CRISTAL", "SALIDA DE CAMINO", "SALÍDA DE COCHERA", "SEMOVIENTE", "SENTIDO CONTRARIO", "SEÑAL PREVENTIVA", "SEÑAL RESTRICTIVA", "SIN COSTO", "TRASLADO", "VALE DE GRÚA", "VALET PARKING", "VANDALISMO", "VEHÍCULO RECUPERADO", "VIOLENCIA", "VISTA A LA DERECHA", "VOLANTE DE ADMISIÓN", "VOLANTE DE ADMISIÓN Y GRÚA", "VOLCADURA", "VUELTA A LA DERECHA", "VUELTA A LA IZQUIERDA", "VUELTA DESDE EL SEGUNDO CARRIL", "VUELTA EN U", "VUELTA PROHIBIDA", "GRANIZO", "DERRAPO", "OTRO"],
    improcedentes: ["OTRO", "CAMBIO DE CONDUCTOR", "COBERTURA NO AMPARADA (SEGURO DE LLANTAS Y RINES)", "DECLARACIÓN", "EXTENSIÓN DE RESPONSABILIDAD CIVIL", "FALLA MECÁNICA", "LICENCIA", "NO CONCUERDAN DAÑOS DE LOS AUTOMOVILES", "NO ES ASEGURADO", "NO HAY COLISIÓN", "PÓLIZA CANCELADA", "PÓLIZA LIMITADA", "PÓLIZA NO AMPARA DAÑOS", "PÓLIZA RECIENTE", "USO DISTINTO AL CONTRATADO", "PÓLIZA RC", "RECHAZO", "DESISTIMIENTO"]
  };

  return (
    <View style={styles.fila}>
      <Text style={styles.labelF}>{label}:</Text>
      {isInput ? (
        <TextInput style={styles.inputF} value={datos[field]} keyboardType="numeric" placeholder="0000" onChangeText={(t) => setDatos({...datos, [field]: t})} returnKeyType="next" onSubmitEditing={() => field === 'reporte' && refS.current.focus()} ref={field === 'siniestro' ? refS : null} />
      ) : (
        <TouchableOpacity onPress={() => { Alert.alert("Seleccionar", label, LISTAS[field].map(opt => ({ text: opt, onPress: () => setDatos({...datos, [field]: opt}) }))); }}><Text style={styles.valF}>{val}</Text></TouchableOpacity>
      )}
    </View>
  );
}

function Carpeta({ titulo, lista, exp, setExp, attachments, setActiveCat, setSourceVisible, setReviewVisible }) {
  return (
    <View style={{marginTop: 10}}>
      <TouchableOpacity style={titulo.includes("ASE") ? styles.barV : styles.barA} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExp(!exp); }}><Text style={styles.barT}>{titulo}</Text><Text style={styles.barT}>{exp ? '▲' : '▼'}</Text></TouchableOpacity>
      {exp && lista.map((it, i) => (
        <View key={i} style={styles.itF}>
          <Text style={styles.itFT}>{it}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TouchableOpacity onPress={() => setReviewVisible(true)}><Text style={{fontSize: 18, marginRight: 10}}>👁️</Text></TouchableOpacity>
            {attachments.filter(a => a.label === it).length > 0 && <View style={styles.badge}><Text style={styles.badgeT}>{attachments.filter(a => a.label === it).length}</Text></View>}
            <TouchableOpacity onPress={() => { setActiveCat(it); setSourceVisible(true); }}><Text style={{fontSize: 22, marginLeft: 10}}>📷</Text></TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const CATS = {
  asegurado: ["MÉTODO CRONOS", "DAÑOS", "DUA ANVERSO", "DUA REVERSO", "PLACAS", "NÚMERO DE SERIE", "ODÓMETRO", "LICENCIA", "TARJETA CIRCULACIÓN", "IDENTIFICACIONES", "ENCUESTA SATISFACCIÓN", "VOLANTES", "OTROS DOCUMENTOS"],
  tercero: ["DOCUMENTOS", "VEHÍCULO TERCERO"]
};

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { backgroundColor: '#003366', paddingTop: 50, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15 },
  headT: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 10, elevation: 4 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  labelF: { color: '#666', fontWeight: 'bold', fontSize: 10 },
  valF: { color: '#003366', fontWeight: 'bold', fontSize: 12 },
  inputF: { color: '#003366', fontWeight: 'bold', textAlign: 'right', width: 120 },
  barV: { backgroundColor: '#2d6a2d', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between' },
  barA: { backgroundColor: '#003366', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between' },
  barT: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  itF: { backgroundColor: 'white', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itFT: { fontSize: 11, color: '#444' },
  badge: { backgroundColor: '#4CD964', borderRadius: 10, paddingHorizontal: 6 },
  badgeT: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  btnE: { backgroundColor: '#ffcc00', padding: 18, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  btnET: { color: '#003366', fontWeight: 'bold', fontSize: 15 },
  preF: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
  preI: { width: '100%', height: '70%', resizeMode: 'contain' },
  preB: { flexDirection: 'row', justifyContent: 'space-around', padding: 20 },
  pBtn: { padding: 12, backgroundColor: '#4a5568', borderRadius: 10, width: width / 3.5, alignItems: 'center' },
  pBtnT: { color: 'white', fontWeight: 'bold', fontSize: 10 },
  revC: { flex: 1, backgroundColor: 'white', paddingTop: 50, padding: 10 },
  revTi: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#003366' },
  revB: { width: '48%', margin: '1%', padding: 5, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  revI: { width: '100%', height: 100, borderRadius: 8 },
  pdfB: { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  revL: { fontSize: 8, marginTop: 5, fontWeight: 'bold' },
  revA: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 5 },
  revCl: { backgroundColor: '#003366', padding: 18, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  mF: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
  mC: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '80%' },
  mT: { fontSize: 14, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#003366' },
  sB: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  itL: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  btnC: { backgroundColor: '#003366', padding: 12, borderRadius: 10, marginTop: 10, alignItems: 'center' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bloqueoCont: { flex: 1, backgroundColor: '#003366', justifyContent: 'center', alignItems: 'center' },
  bloqueoCard: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center' },
  bloqueoTit: { fontWeight: 'bold', marginTop: 15, color: '#003366', textAlign: 'center' },
  inputLogin: { width: '100%', borderBottomWidth: 1, borderColor: '#ccc', marginVertical: 20, textAlign: 'center', fontSize: 16 },
  btnRegistro: { backgroundColor: '#003366', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
  bloqueoTxt: { textAlign: 'center', marginVertical: 15, color: 'red', fontSize: 12 }
});
