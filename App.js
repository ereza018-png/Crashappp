import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  TextInput, Modal, Alert, Image, Dimensions, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  // --- SISTEMA DE LOGIN ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState('');

  // --- DATOS DEL REPORTE ---
  const [aseguradora, setAseguradora] = useState('Seleccionar');
  const [atencion, setAtencion] = useState('Seleccionar');
  const [reporteNum, setReporteNum] = useState('');
  const [siniestroNum, setSiniestroNum] = useState('');
  const [acuerdo, setAcuerdo] = useState('Seleccionar');
  const [responsabilidad, setResponsabilidad] = useState('Seleccionar');
  const [circunstancia, setCircunstancia] = useState('Seleccionar');

  // --- ACUERDOS IMPORTANTES (DATOS ESPECÍFICOS) ---
  const [datosAcuerdos, setDatosAcuerdos] = useState({
    recuperacion: '', autRecuperacion: '',
    complemento: '', autComplemento: ''
  });

  // --- MULTIMEDIA ---
  const [evidencias, setEvidencias] = useState({});
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);

  // --- UI ---
  const [modalGeneric, setModalGeneric] = useState({ visible: false, title: '', options: [], setter: null });
  const [modalVisor, setModalVisor] = useState({ visible: false, folder: '', sub: '' });
  const [cameraActive, setCameraActive] = useState(false);
  const [currentFolder, setCurrentFolder] = useState('');
  const [currentSubFolder, setCurrentSubFolder] = useState('');
  const [tempPhoto, setTempPhoto] = useState(null);
  const [rotation, setRotation] = useState(0);

  // --- LISTAS SOLICITADAS ---
  const listaAseguradoras = ["HDI", "EL ÁGUILA", "GEN DE SEG", "ALLIANZ", "ANA SEGUROS", "CHUBB", "QUALITAS", "AXA", "GNP", "OTRAS"];
  const opcionesAtencion = ["COMPLEMENTARIA", "SINIESTRO SIN PÓLIZA", "DIVERSOS", "KM", "PEAJE"];
  const opcionesResponsabilidad = ["ASEGURADO", "TERCERO", "CORRESPONSABILIDAD", "PENDIENTE"];
  const opcionesAcuerdos = ["COBRO SIPAC", "COBRO COPAC", "RECUPERACIÓN EFECTIVO", "RECUPERACIÓN TDD", "RECUPERACIÓN GOA", "RECUPERACIÓN MODULO", "COSTO ASEGURADO", "CRISTAL", "SEGURO DE RINES Y LLANTAS", "ROBO PARCIAL", "ROBO TOTAL", "JURÍDICO", "PLAN PISO", "CASH FLOW", "INVESTIGACIÓN", "COMPLEMENTO", "PAGO SIPAC", "PAGO COPAC", "COSTO TERCERO", "PAGO UMAS Y DEDUCIBLES", "S/C ARREGLO ENTRE PARTICULARES", "S/C MENOR AL DEDUCIBLE", "IMPROCEDENTE", "S/C SIN PÓLIZA", "RECHAZO", "NO LOCALIZADO", "DIVERSOS", "CANCELADO 10< NO FACTURAR"];
  
  const opcionesCircunstancias = ["AGRAVAMIENTO DE DAÑO", "ALCANCE", "AMPLITUD Y/O AFLUENCIA", "APERTURA DE PUERTA", "ASESORÍA", "ATROPELLO", "BACHE", "CAÍDA DE OBJETOS", "CAMBIO DE CARRIL", "CARRIL DE CONTRA FLUJO", "CASH FLOW RECUPERACIÓN", "CIRCULABA A LA IZQUIERDA EN CRUCERO", "DE IGUAL AMPLITUD", "CIRCULABA SOBRE LA VÍA PRINCIPAL", "CIRCULABA SOBRE LA VÍA SECUNDARIA", "CITA POSTERIOR", "CORTE DE CIRCULACIÓN", "CUNETA", "DAÑOS OCASIONADOS POR LA CARGA", "DIVERSOS", "DUPLICADO", "ENTRE CARRILES", "ESTACIONADO", "EXCESO DE VELOCIDAD", "FALLA MECÁNICA", "INCORPORACIÓN", "INUNDACIÓN", "INVACIÓN DE CARRIL", "LIBERACIÒN DE VEHÍCULO", "MANIOBRAS PARA ESTACIONARSE", "NO LOCALIZADO", "NO TOMÉ EL EXTREMO", "OBJETO FIJO", "PAGO DE DAÑOS PAGO SIPAC/COPAC", "PARTES BAJAS", "PASADA DE ALTO", "PASES MÉDICOS", "PENDIENTE DECLARACIÓN", "PERDER EL CONTROL", "RECUPERACIÓN (RECUPERACIÓN,UMAS)", "RECUPERACIÓN COPAC/SIPAC", "RECUPERACIÓN DE VEHÍCULO POR ROBO", "REVERSA", "ROBO PARCIAL", "ROBO TOTAL", "ROTURA DE CRISTAL", "SALIDA DE CAMINO", "SALÍDA DE COCHERA", "SEMOVIENTE", "SENTIDO CONTRARIO", "SEÑAL PREVENTIVA", "SEÑAL RESTRICTIVA", "SIN COSTO", "TRASLADO", "VALE DE GRÚA", "VALET PARKING", "VANDALISMO", "VEHÍCULO RECUPERADO", "VIOLENCIA", "VISTA A LA DERECHA", "VOLANTE DE ADMISIÓN", "VOLANTE DE ADMISIÓN Y GRÚA", "VOLCADURA", "VUELTA A LA DERECHA", "VUELTA A LA IZQUIERDA", "VUELTA DESDE EL SEGUNDO CARRIL", "VUELTA EN U", "VUELTA PROHIBIDA", "GRANIZO", "DERRAPO", "OTRO"];

  const subAsegurado = ["DUA ANVERSO", "DUA REVERSO", "ENCUESTA SATISFACCIÓN", "LICENCIA", "TARJETA CIRCULACIÓN", "NÚMERO DE VIN", "ODÓMETRO", "IDENTIFICACIONES", "VOLANTES", "OTROS DOCUMENTOS", "DAÑOS", "MÉTODO CRONOS"];
  const subTercero = ["DOCUMENTOS", "DAÑOS", "PROCEDIMIENTO CRONOS"];

  // --- ACUERDOS IMPORTANTES (SUB-CARPETAS) ---
  const subAcuerdosImp = {
    "RECUPERACIÓN": ["RECIBO RECUPERACIÓN", "PANTALLA BOT"],
    "COBRO SIPAC/COPAC": ["FISICO DUA AMARILLO ANVERSO", "FISICO DUA AMARILLO REVERSO", "DIGITAL", "E-DUA"],
    "COMPLEMENTO": ["PANTALLAS"],
    "NO LOCALIZADO": ["PANTALLAS"],
    "DIVERSOS": ["PANTALLAS"],
    "MODULOS": ["PÓLIZA AMPLIA", "SEG RINES Y LLANTAS", "ROBO PARCIAL"],
    "ROBO TOTAL": ["DOCUMENTOS"]
  };

  // --- FUNCIONES ---
  const handleLogin = () => {
    if (userId.length > 2) setIsLoggedIn(true);
    else Alert.alert("Error", "Ingresa un ID válido");
  };

  const procesarMultimedia = async (folder, sub) => {
    Alert.alert("Seleccionar Origen", "¿De dónde quieres obtener la imagen?", [
      { text: "Cámara", onPress: () => { setCurrentFolder(folder); setCurrentSubFolder(sub); setCameraActive(true); } },
      { text: "Galería", onPress: () => abrirGaleria(folder, sub) },
      { text: "Archivos / Drive", onPress: () => abrirArchivos(folder, sub) },
      { text: "Cancelar", style: "cancel" }
    ]);
  };

  const abrirGaleria = async (folder, sub) => {
    let res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5 });
    if (!res.canceled) agregarEvidencia(folder, sub, res.assets[0].uri);
  };

  const abrirArchivos = async (folder, sub) => {
    let res = await DocumentPicker.getDocumentAsync({ type: 'image/*' });
    if (!res.canceled) agregarEvidencia(folder, sub, res.assets[0].uri);
  };

  const agregarEvidencia = (folder, sub, uri) => {
    const key = `${folder}_${sub}`;
    setEvidencias(prev => ({ ...prev, [key]: [...(prev[key] || []), { uri, id: Math.random().toString() }] }));
  };

  const enviarMail = async () => {
    if (reporteNum === '') { Alert.alert("Error", "Falta N° Reporte"); return; }
    setLoading(true);
    let attachments = [];
    for (let key in evidencias) {
      for (let img of evidencias[key]) {
        attachments.push(img.uri);
      }
    }
    await MailComposer.composeAsync({
      recipients: ['reportes@crashasesores.com'],
      subject: `ID:${userId} | ${aseguradora} | REP:${reporteNum}`.toUpperCase(),
      body: `Acuerdo: ${acuerdo}\nResponsabilidad: ${responsabilidad}\nCircunstancia: ${circunstancia}`,
      attachments
    });
    setLoading(false);
  };

  // --- VISTAS ---
  if (!isLoggedIn) {
    return (
      <View style={styles.loginContainer}>
        <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}} style={{width: 100, height: 100, marginBottom: 20}} />
        <Text style={styles.loginTitle}>CRASH ASESORES</Text>
        <TextInput style={styles.loginInput} placeholder="ID DE INGRESO" value={userId} onChangeText={setUserId} autoCapitalize="characters" />
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}><Text style={styles.whiteTxt}>INGRESAR</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}><Text style={styles.headerTitle}>REPORTE: {userId}</Text></View>
        <ScrollView contentContainerStyle={{padding: 15}}>
          
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => setModalGeneric({visible:true, title:'ASEGURADORA', options:listaAseguradoras, setter:setAseguradora})}><Text style={styles.label}>ASEGURADORA:</Text><Text style={styles.valBlue}>{aseguradora}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={() => setModalGeneric({visible:true, title:'ATENCIÓN', options:opcionesAtencion, setter:setAtencion})}><Text style={styles.label}>ATENCIÓN:</Text><Text style={styles.valBlue}>{atencion}</Text></TouchableOpacity>
            <View style={styles.row}><Text style={styles.label}>N° REPORTE:</Text><TextInput style={styles.input} keyboardType="numeric" value={reporteNum} onChangeText={setReporteNum} placeholder="0000" /></View>
            <View style={styles.row}><Text style={styles.label}>N° SINIESTRO:</Text><TextInput style={styles.input} keyboardType="numeric" value={siniestroNum} onChangeText={setSiniestroNum} placeholder="0000" /></View>
            <TouchableOpacity style={styles.row} onPress={() => setModalGeneric({visible:true, title:'ACUERDO', options:opcionesAcuerdos, setter:setAcuerdo})}><Text style={styles.label}>NOMBRE ACUERDO:</Text><Text style={styles.valBlue}>{acuerdo}</Text></TouchableOpacity>
          </View>

          {/* SECCIÓN ACUERDOS IMPORTANTES */}
          <Text style={styles.sectionTitle}>ACUERDOS IMPORTANTES</Text>
          <View style={styles.card}>
            {Object.keys(subAcuerdosImp).map(key => (
              <View key={key} style={{marginBottom: 10, borderBottomWidth: 0.5, borderColor: '#DDD'}}>
                <Text style={styles.subFolderTitle}>{key}</Text>
                {key === "RECUPERACIÓN" && (
                   <View style={styles.innerInputRow}>
                     <TextInput style={styles.innerInput} placeholder="$ RECUPERACIÓN" keyboardType="numeric" onChangeText={(v)=>setDatosAcuerdos({...datosAcuerdos, recuperacion: v})} />
                     <TextInput style={styles.innerInput} placeholder="AUT:" autoCapitalize="characters" onChangeText={(v)=>setDatosAcuerdos({...datosAcuerdos, autRecuperacion: v})} />
                   </View>
                )}
                {key === "COMPLEMENTO" && (
                   <View style={styles.innerInputRow}>
                     <TextInput style={styles.innerInput} placeholder="$ COMPLEMENTO" keyboardType="numeric" onChangeText={(v)=>setDatosAcuerdos({...datosAcuerdos, complemento: v})} />
                     <TextInput style={styles.innerInput} placeholder="AUT:" autoCapitalize="characters" onChangeText={(v)=>setDatosAcuerdos({...datosAcuerdos, autComplemento: v})} />
                   </View>
                )}
                {subAcuerdosImp[key].map(sub => (
                  <View key={sub} style={styles.listItem}>
                    <Text style={styles.listText}>{sub}</Text>
                    <TouchableOpacity onPress={() => procesarMultimedia("ACUERDO", sub)} style={styles.camIcon}><Text>📷</Text></TouchableOpacity>
                    {evidencias[`ACUERDO_${sub}`]?.length > 0 && <TouchableOpacity onPress={() => setModalVisor({visible:true, folder:"ACUERDO", sub})} style={styles.eyeBadge}><Text style={{color:'white', fontSize:10}}>👁️ {evidencias[`ACUERDO_${sub}`].length}</Text></TouchableOpacity>}
                  </View>
                ))}
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.docBtn} onPress={() => DocumentPicker.getDocumentAsync({multiple:true})}><Text style={styles.whiteTxtBold}>DOCUMENTOS DE ACUERDOS IMPORTANTES</Text></TouchableOpacity>

          {/* DATOS FINALES */}
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => setModalGeneric({visible:true, title:'RESPONSABILIDAD', options:opcionesResponsabilidad, setter:setResponsabilidad})}><Text style={styles.label}>RESPONSABILIDAD:</Text><Text style={styles.valBlue}>{responsabilidad}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={() => setModalGeneric({visible:true, title:'CIRCUNSTANCIA', options:opcionesCircunstancias, setter:setCircunstancia})}><Text style={styles.label}>CIRCUNSTANCIA:</Text><Text style={styles.valBlue}>{circunstancia}</Text></TouchableOpacity>
          </View>

          {/* BOTONES DE FOTOGRAFÍA */}
          <TouchableOpacity style={styles.catBtnAse} onPress={() => setShowAsegurado(!showAsegurado)}><Text style={styles.whiteTxtBold}>FOTOGRAFÍAS ASEGURADO</Text></TouchableOpacity>
          {showAsegurado && <View style={styles.listContainer}>{subAsegurado.map(i => (
            <View key={i} style={styles.listItem}><Text style={styles.listText}>{i}</Text><TouchableOpacity onPress={()=>procesarMultimedia("ASEGURADO", i)}><Text style={{fontSize:20}}>📷</Text></TouchableOpacity></View>
          ))}</View>}

          <TouchableOpacity style={styles.catBtnTer} onPress={() => setShowTercero(!showTercero)}><Text style={styles.whiteTxtBold}>FOTOGRAFÍAS TERCERO</Text></TouchableOpacity>
          {showTercero && <View style={styles.listContainer}>{subTercero.map(i => (
            <View key={i} style={styles.listItem}><Text style={styles.listText}>{i}</Text><TouchableOpacity onPress={()=>procesarMultimedia("TERCERO", i)}><Text style={{fontSize:20}}>📷</Text></TouchableOpacity></View>
          ))}</View>}

          <TouchableOpacity style={styles.sendBtn} onPress={enviarMail}><Text style={styles.sendTxt}>ENVIAR EXPEDIENTE</Text></TouchableOpacity>
        </ScrollView>

        {/* VISOR CON ROTACIÓN */}
        <Modal visible={modalVisor.visible} transparent animationType="slide">
          <View style={styles.overlay}><View style={styles.modalBox}>
            <Text style={styles.modalHeader}>VISOR: {modalVisor.sub}</Text>
            <ScrollView horizontal contentContainerStyle={{alignItems:'center'}}>
              {(evidencias[`${modalVisor.folder}_${modalVisor.sub}`] || []).map((img, idx) => (
                <View key={img.id} style={{margin: 10, alignItems:'center'}}>
                  <Image source={{uri: img.uri}} style={[styles.visorImg, {transform: [{rotate: `${rotation}deg`}]}]} />
                  <View style={{flexDirection:'row', gap: 10, marginTop:10}}>
                    <TouchableOpacity onPress={() => setRotation(r => r + 90)} style={styles.toolBtn}><Text style={styles.whiteTxt}>ROTAR</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      const k = `${modalVisor.folder}_${modalVisor.sub}`;
                      const filtered = evidencias[k].filter(f => f.id !== img.id);
                      setEvidencias({...evidencias, [k]: filtered});
                      if(filtered.length === 0) setModalVisor({visible:false});
                    }} style={[styles.toolBtn, {backgroundColor:'red'}]}><Text style={styles.whiteTxt}>BORRAR</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => {setModalVisor({visible:false}); setRotation(0);}} style={styles.closeBtn}><Text style={styles.whiteTxt}>CERRAR</Text></TouchableOpacity>
          </View></View>
        </Modal>

        {/* CÁMARA */}
        {cameraActive && (
          <Modal visible={true}>
            <CameraView style={{flex:1}} ref={cameraRef}>
              <View style={styles.camUI}>
                <TouchableOpacity onPress={() => setCameraActive(false)} style={styles.camX}><Text style={styles.whiteTxt}>X</Text></TouchableOpacity>
                <TouchableOpacity onPress={async () => {
                  const p = await cameraRef.current.takePictureAsync();
                  const manip = await ImageManipulator.manipulateAsync(p.uri, [{resize:{width:1200}}], {compress:0.5});
                  agregarEvidencia(currentFolder, currentSubFolder, manip.uri);
                  setCameraActive(false);
                }} style={styles.shutter} />
              </View>
            </CameraView>
          </Modal>
        )}

        {/* MODAL GENÉRICO */}
        <Modal visible={modalGeneric.visible} transparent animationType="fade">
          <View style={styles.overlay}><View style={styles.modalBox}>
            <Text style={styles.modalHeader}>{modalGeneric.title}</Text>
            <ScrollView style={{maxHeight: 400}}>
              {modalGeneric.options.map(o => (
                <TouchableOpacity key={o} style={styles.optBtn} onPress={() => {modalGeneric.setter(o); setModalGeneric({...modalGeneric, visible:false})}}><Text>{o}</Text></TouchableOpacity>
              ))}
            </ScrollView>
          </View></View>
        </Modal>

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F3F6' },
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#004381' },
  loginTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  loginInput: { backgroundColor: 'white', width: '80%', padding: 15, borderRadius: 10, textAlign: 'center', fontWeight: 'bold' },
  loginBtn: { backgroundColor: '#FFD600', padding: 15, borderRadius: 10, marginTop: 20, width: '80%', alignItems: 'center' },
  header: { backgroundColor: '#004381', padding: 15, alignItems: 'center' },
  headerTitle: { color: 'white', fontWeight: 'bold' },
  card: { backgroundColor: 'white', borderRadius: 10, padding: 10, marginBottom: 15, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderColor: '#EEE' },
  label: { fontSize: 11, fontWeight: 'bold', color: '#555' },
  valBlue: { color: '#004381', fontWeight: 'bold' },
  input: { textAlign: 'right', fontWeight: 'bold', color: '#004381', width: 100 },
  sectionTitle: { fontWeight: '900', color: '#004381', marginVertical: 10 },
  subFolderTitle: { backgroundColor: '#E3F2FD', padding: 5, fontSize: 10, fontWeight: 'bold', color: '#004381' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, alignItems: 'center' },
  listText: { fontSize: 11, color: '#333' },
  innerInputRow: { flexDirection: 'row', gap: 5, padding: 5 },
  innerInput: { flex: 1, backgroundColor: '#F5F5F5', padding: 5, borderRadius: 5, fontSize: 10, fontWeight: 'bold' },
  docBtn: { backgroundColor: '#D32F2F', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  catBtnAse: { backgroundColor: '#2E7D32', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  catBtnTer: { backgroundColor: '#004381', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  sendBtn: { backgroundColor: '#FFD600', padding: 20, borderRadius: 15, marginTop: 20, marginBottom: 50, alignItems: 'center' },
  sendTxt: { color: '#004381', fontWeight: '900', fontSize: 18 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: 'white', width: '90%', borderRadius: 15, padding: 20 },
  modalHeader: { fontWeight: 'bold', textAlign: 'center', marginBottom: 15, color: '#004381' },
  optBtn: { padding: 15, borderBottomWidth: 0.5, borderColor: '#EEE' },
  closeBtn: { backgroundColor: '#333', padding: 15, borderRadius: 10, marginTop: 10, alignItems: 'center' },
  visorImg: { width: 250, height: 350, borderRadius: 10, resizeMode: 'contain' },
  toolBtn: { padding: 10, backgroundColor: '#004381', borderRadius: 5 },
  camUI: { flex: 1, justifyContent: 'space-between', padding: 40, alignItems: 'center' },
  shutter: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'white', borderWidth: 5, borderColor: '#004381' },
  eyeBadge: { backgroundColor: '#2E7D32', padding: 5, borderRadius: 10 },
  whiteTxt: { color: 'white', fontWeight: 'bold' },
  whiteTxtBold: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
