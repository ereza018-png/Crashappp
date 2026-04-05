import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal, FlatList, StatusBar, Image, Dimensions, BackHandler, LayoutAnimation, Platform, UIManager } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const INICIAL = { aseguradora: 'Seleccionar', reporte: '', siniestro: '', atencion: [], acuerdos: 'Seleccionar', responsabilidad: 'Seleccionar', circunstancias: 'Seleccionar', improcedentes: 'Seleccionar' };

export default function App() {
  const refSiniestro = useRef();
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
    (async () => {
      await Location.requestForegroundPermissionsAsync();
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  const LISTAS = {
    aseguradora: ["HDI", "EL ÁGUILA", "GEN DE SEG", "ALLIANZ", "ANA SEGUROS", "CHUBB", "OTRAS"],
    atencion: ["COMPLEMENTARIA", "SIN PÓLIZA", "DIVERSOS", "KM", "PEAJE"],
    acuerdos: ["COBRO SIPAC", "COBRO COPAC", "RECUPERACIÓN EFECTIVO", "RECUPERACIÓN TDD", "RECUPERACIÓN GOA", "RECUPERACIÓN MODULO", "COSTO ASEGURADO", "CRISTAL", "SEGURO DE RINES Y LLANTAS", "ROBO PARCIAL", "ROBO TOTAL", "JURÍDICO", "PLAN PISO", "CASH FLOW", "INVESTIGACIÓN", "COMPLEMENTO", "PAGO SIPAC", "PAGO COPAC", "COSTO TERCERO", "PAGO UMAS Y DEDUCIBLES", "S/C ARREGLO ENTRE PARTICULARES", "S/C MENOR AL DEDUCIBLE", "IMPROCEDENTE", "S/C SIN PÓLIZA", "RECHAZO", "NO LOCALIZADO", "DIVERSOS", "CANCELADO 10 < NO FACTURAR"],
    responsabilidad: ["ASEGURADO", "TERCERO", "CORRESPONSABILIDAD", "PENDIENTE"],
    circunstancias: ["AGRAVAMIENTO DE DAÑO", "ALCANCE", "AMPLITUD Y/O AFLUENCIA", "APERTURA DE PUERTA", "ASESORÍA", "ATROPELLO", "BACHE", "CAÍDA DE OBJETOS", "CAMBIO DE CARRIL", "CARRIL DE CONTRA FLUJO", "CASH FLOW RECUPERACIÓN", "CIRCULABA A LA IZQUIERDA EN CRUCERO", "DE IGUAL AMPLITUD", "CIRCULABA SOBRE LA VÍA PRINCIPAL", "CIRCULABA SOBRE LA VÍA SECUNDARIA", "CITA POSTERIOR", "CORTE DE CIRCULACIÓN", "CUNETA", "DAÑOS OCASIONADOS POR LA CARGA", "DIVERSOS", "DUPLICADO", "ENTRE CARRILES", "ESTACIONADO", "EXCESO DE VELOCIDAD", "FALLA MECÁNICA", "INCORPORACIÓN", "INUNDACIÓN", "INVACIÓN DE CARRIL", "LIBERACIÒN DE VEHÍCULO", "MANIOBRAS PARA ESTACIONARSE", "NO LOCALIZADO", "NO TOMÉ EL EXTREMO", "OBJETO FIJO", "PAGO DE DAÑOS PAGO SIPAC/COPAC", "PARTES BAJAS", "PASADA DE ALTO", "PASES MÉDICOS", "PENDIENTE DECLARACIÓN", "PERDER EL CONTROL", "RECUPERACIÓN (RECUPERACIÓN,UMAS)", "RECUPERACIÓN COPAC/SIPAC", "RECUPERACIÓN DE VEHÍCULO POR ROBO", "REVERSA", "ROBO PARCIAL", "ROBO TOTAL", "ROTURA DE CRISTAL", "SALIDA DE CAMINO", "SALÍDA DE COCHERA", "SEMOVIENTE", "SENTIDO CONTRARIO", "SEÑAL PREVENTIVA", "SEÑAL RESTRICTIVA", "SIN COSTO", "TRASLADO", "VALE DE GRÚA", "VALET PARKING", "VANDALISMO", "VEHÍCULO RECUPERADO", "VIOLENCIA", "VISTA A LA DERECHA", "VOLANTE DE ADMISIÓN", "VOLANTE DE ADMISIÓN Y GRÚA", "VOLCADURA", "VUELTA A LA DERECHA", "VUELTA A LA IZQUIERDA", "VUELTA DESDE EL SEGUNDO CARRIL", "VUELTA EN U", "VUELTA PROHIBIDA", "GRANIZO", "DERRAPO", "OTRO"],
    improcedentes: ["OTRO", "CAMBIO DE CONDUCTOR", "COBERTURA NO AMPARADA (SEGURO DE LLANTAS Y RINES)", "DECLARACIÓN", "EXTENSIÓN DE RESPONSABILIDAD CIVIL", "FALLA MECÁNICA", "LICENCIA", "NO CONCUERDAN DAÑOS DE LOS AUTOMOVILES", "NO ES ASEGURADO", "NO HAY COLISIÓN", "PÓLIZA CANCELADA", "PÓLIZA LIMITADA", "PÓLIZA NO AMPARA DAÑOS", "PÓLIZA RECIENTE", "USO DISTINTO AL CONTRATADO", "PÓLIZA RC", "RECHAZO", "DESISTIMIENTO"]
  };

  const CATS = {
    asegurado: ["MÉTODO CRONOS", "DAÑOS", "DUA ANVERSO", "DUA REVERSO", "PLACAS", "NÚMERO DE SERIE", "ODÓMETRO", "LICENCIA", "TARJETA CIRCULACIÓN", "IDENTIFICACIONES", "ENCUESTA SATISFACCIÓN", "VOLANTES", "OTROS DOCUMENTOS"],
    tercero: ["DOCUMENTOS", "VEHÍCULO TERCERO"]
  };

  const manejarArchivo = async (modo) => {
    let res;
    if (modo === 'camara') {
      res = await ImagePicker.launchCameraAsync({ quality: 0.5 });
      if (!res.canceled) { setTempUri(res.assets[0].uri); setTempRot(0); setPreVisible(true); }
    } else if (modo === 'galeria') {
      res = await ImagePicker.launchImageLibraryAsync({ quality: 0.5, allowsMultipleSelection: true });
      if (!res.canceled) {
        const nuevos = res.assets.map(a => ({ id: Date.now() + Math.random(), uri: a.uri, type: 'image', label: activeCat, rotation: 0 }));
        setAttachments([...attachments, ...nuevos]);
      }
    } else {
      res = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: true });
      if (!res.canceled) {
        const nuevos = res.assets.map(a => ({ id: Date.now() + Math.random(), uri: a.uri, type: a.mimeType.includes('pdf') ? 'pdf' : 'image', label: activeCat, rotation: 0 }));
        setAttachments([...attachments, ...nuevos]);
      }
    }
    setSourceVisible(false);
  };

  const enviar = async () => {
    setLoading(true);
    try {
      let loc = await Location.getCurrentPositionAsync({});
      const maps = `https://www.google.com/maps?q=${loc.coords.latitude},${loc.coords.longitude}`;
      const asunto = `${datos.aseguradora} REPORTE ${datos.reporte} SINIESTRO ${datos.siniestro} ${datos.atencion.join(' ')}`;
      
      const cuerpo = `
REPORTE DE AJUSTE - CRASH ASESORES
----------------------------------
ASEGURADORA: ${datos.aseguradora}
REPORTE: ${datos.reporte}
SINIESTRO: ${datos.siniestro}
ATENCIÓN: ${datos.atencion.join(', ') || 'N/A'}
ACUERDOS: ${datos.acuerdos}
RESPONSABILIDAD: ${datos.responsabilidad}
CIRCUNSTANCIAS: ${datos.circunstancias}
IMPROCEDENTES: ${datos.improcedentes}

UBICACIÓN: ${maps}
----------------------------------
TOTAL DE ARCHIVOS ADJUNTOS: ${attachments.length}
      `;

      await MailComposer.composeAsync({
        recipients: ['tu-correo@ejemplo.com'],
        subject: asunto,
        body: cuerpo,
        attachments: attachments.map(a => a.uri)
      });
    } catch (e) { Alert.alert("Error", "Fallo al enviar"); }
    setLoading(false);
  };

  const logout = () => {
    Alert.alert("Cerrar Sesión", "¿Borrar datos y salir?", [
      { text: "No" }, { text: "Sí", onPress: () => { setAttachments([]); setDatos(INICIAL); BackHandler.exitApp(); } }
    ]);
  };

  return (
    <View style={styles.main}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={logout}><Text style={{color: 'red', fontWeight: 'bold', fontSize: 12}}>SALIR</Text></TouchableOpacity>
        <Text style={styles.headT}>CRASH ASESORES</Text>
        <View style={{width: 40}} />
      </View>
      
      <ScrollView contentContainerStyle={{padding: 15}}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.fila} onPress={() => { setModalData({ title: 'ASEGURADORA', options: LISTAS.aseguradora, field: 'aseguradora' }); setModalVisible(true); }}>
            <Text style={styles.labelF}>ASEGURADORA:</Text><Text style={styles.valF}>{datos.aseguradora}</Text>
          </TouchableOpacity>

          <View style={styles.fila}>
            <Text style={styles.labelF}>REPORTE:</Text>
            <TextInput style={styles.inputF} value={datos.reporte} keyboardType="numeric" placeholder="0000" onChangeText={(t) => setDatos({...datos, reporte: t})} returnKeyType="next" onSubmitEditing={() => refSiniestro.current.focus()} />
          </View>

          <View style={styles.fila}>
            <Text style={styles.labelF}>SINIESTRO:</Text>
            <TextInput style={styles.inputF} ref={refSiniestro} value={datos.siniestro} keyboardType="numeric" placeholder="0000" onChangeText={(t) => setDatos({...datos, siniestro: t})} />
          </View>

          <TouchableOpacity style={styles.fila} onPress={() => { setModalData({ title: 'ATENCION', options: LISTAS.atencion, field: 'atencion' }); setModalVisible(true); }}>
            <Text style={styles.labelF}>ATENCION:</Text><Text style={styles.valF}>{datos.atencion.length} Selecc.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.fila} onPress={() => { setModalData({ title: 'ACUERDOS', options: LISTAS.acuerdos, field: 'acuerdos' }); setModalVisible(true); }}>
            <Text style={styles.labelF}>ACUERDOS:</Text><Text style={styles.valF}>{datos.acuerdos}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.fila} onPress={() => { setModalData({ title: 'RESPONSABILIDAD', options: LISTAS.responsabilidad, field: 'responsabilidad' }); setModalVisible(true); }}>
            <Text style={styles.labelF}>RESPONSABILIDAD:</Text><Text style={styles.valF}>{datos.responsabilidad}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.fila} onPress={() => { setModalData({ title: 'CIRCUNSTANCIAS', options: LISTAS.circunstancias, field: 'circunstancias' }); setModalVisible(true); }}>
            <Text style={styles.labelF}>CIRCUNSTANCIAS:</Text><Text style={styles.valF}>{datos.circunstancias}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.fila} onPress={() => { setModalData({ title: 'IMPROCEDENTES', options: LISTAS.improcedentes, field: 'improcedentes' }); setModalVisible(true); }}>
            <Text style={styles.labelF}>IMPROCEDENTES:</Text><Text style={styles.valF}>{datos.improcedentes}</Text>
          </TouchableOpacity>
        </View>

        <Carpeta titulo="FOTOS ASEGURADO" 
lista={CATS.asegurado} exp={aseguradoExp} setExp={setAseguradoExp} attachments={attachments} setActiveCat={setActiveCat} setSourceVisible={setSourceVisible} setReviewVisible={setReviewVisible} />
        <Carpeta titulo="FOTOS TERCERO" lista={CATS.tercero} exp={terceroExp} setExp={setTerceroExp} attachments={attachments} setActiveCat={setActiveCat} setSourceVisible={setSourceVisible} setReviewVisible={setReviewVisible} />

        <TouchableOpacity style={styles.btnE} onPress={enviar} disabled={loading}>
          {loading ? <ActivityIndicator color="#003366" /> : <Text style={styles.btnET}>📩 ENVIAR REPORTE FINAL</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL CÁMARA PREVIEW */}
      <Modal visible={preVisible} animationType="fade">
        <View style={styles.preF}>
          <Image source={{uri: tempUri}} style={[styles.preI, {transform: [{rotate: `${tempRot}deg`}]}]} />
          <View style={styles.preB}>
            <TouchableOpacity style={styles.pBtn} onPress={() => setTempRot((tempRot + 90) % 360)}><Text style={styles.pBtnT}>ROTAR 🔄</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.pBtn, {backgroundColor: '#2d6a2d'}]} onPress={() => { setAttachments([...attachments, {id: Date.now(), uri: tempUri, label: activeCat, rotation: tempRot, type: 'image'}]); manejarArchivo('camara'); }}><Text style={styles.pBtnT}>OTRA</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.pBtn, {backgroundColor: '#003366'}]} onPress={() => { setAttachments([...attachments, {id: Date.now(), uri: tempUri, label: activeCat, rotation: tempRot, type: 'image'}]); setPreVisible(false); }}><Text style={styles.pBtnT}>LISTO</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL REVISIÓN */}
      <Modal visible={reviewVisible} animationType="slide">
        <View style={styles.revC}>
          <Text style={styles.revTi}>VISUALIZAR / ELIMINAR / ROTAR</Text>
          <FlatList data={attachments} numColumns={2} renderItem={({item}) => (
            <View style={styles.revB}>
              {item.type === 'image' ? <Image source={{uri: item.uri}} style={[styles.revI, {transform: [{rotate: `${item.rotation}deg`}]}]} /> : <View style={[styles.revI, styles.pdfB]}><Text>📄 PDF</Text></View>}
              <Text numberOfLines={1} style={styles.revL}>{item.label}</Text>
              <View style={styles.revA}>
                <TouchableOpacity onPress={() => setAttachments(attachments.map(a => a.id === item.id ? {...a, rotation: (a.rotation + 90) % 360} : a))}><Text style={{fontSize: 20}}>🔄</Text></TouchableOpacity>
                <TouchableOpacity onPress={async () => await Sharing.shareAsync(item.uri)}><Text style={{fontSize: 20}}>👁️</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setAttachments(attachments.filter(a => a.id !== item.id))}><Text style={{fontSize: 20}}>🗑️</Text></TouchableOpacity>
              </View>
            </View>
          )} />
          <TouchableOpacity style={styles.revCl} onPress={() => setReviewVisible(false)}><Text style={{color: 'white', fontWeight: 'bold'}}>GUARDAR Y CERRAR</Text></TouchableOpacity>
        </View>
      </Modal>

      {/* OTROS MODALES */}
      <Modal visible={sourceVisible} transparent={true}><View style={styles.mF}><View style={styles.mC}>
          <Text style={styles.mT}>Origen: {activeCat}</Text>
          <TouchableOpacity style={styles.sB} onPress={() => manejarArchivo('camara')}><Text>📷 Cámara</Text></TouchableOpacity>
          <TouchableOpacity style={styles.sB} onPress={() => manejarArchivo('galeria')}><Text>🖼️ Galería (Multiselección)</Text></TouchableOpacity>
          <TouchableOpacity style={styles.sB} onPress={() => manejarArchivo('drive')}><Text>📁 Drive / Archivos (Multiselección)</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.sB, {backgroundColor: '#eee'}]} onPress={() => setSourceVisible(false)}><Text style={{color: 'red'}}>Cancelar</Text></TouchableOpacity>
      </View></View></Modal>

      <Modal visible={modalVisible} transparent={true} animationType="slide"><View style={styles.mF}><View style={styles.mC}>
          <Text style={styles.mT}>{modalData.title}</Text>
          <FlatList data={modalData.options} renderItem={({item}) => (
            <TouchableOpacity style={styles.itL} onPress={() => {
              if (modalData.field === 'atencion') {
                const n = datos.atencion.includes(item) ? datos.atencion.filter(x => x !== item) : [...datos.atencion, item];
                setDatos({...datos, atencion: n});
              } else { setDatos({...datos, [modalData.field]: item}); setModalVisible(false); }
            }}>
              <Text>{item} {datos.atencion.includes(item) ? '✅' : ''}</Text>
            </TouchableOpacity>
          )} />
          <TouchableOpacity style={styles.btnC} onPress={() => setModalVisible(false)}><Text style={{color: 'white'}}>CERRAR</Text></TouchableOpacity>
      </View></View></Modal>
    </View>
  );
}

function Carpeta({ titulo, lista, exp, setExp, attachments, setActiveCat, setSourceVisible, setReviewVisible }) {
  return (
    <View style={{marginTop: 10}}>
      <TouchableOpacity style={titulo.includes("ASEGURADO") ? styles.barV : styles.barA} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExp(!exp); }}>
        <Text style={styles.barT}>{titulo}</Text><Text style={styles.barT}>{exp ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {exp && lista.map((it, i) => {
        const c = attachments.filter(a => a.label === it).length;
        return (
          <View key={i} style={styles.itF}>
            <Text style={styles.itFT}>{it}</Text>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TouchableOpacity onPress={() => setReviewVisible(true)}><Text style={{fontSize: 20, marginRight: 10}}>👁️</Text></TouchableOpacity>
              {c > 0 && <View style={styles.badge}><Text style={styles.badgeT}>{c}</Text></View>}
              <TouchableOpacity onPress={() => { setActiveCat(it); setSourceVisible(true); }}><Text style={{fontSize: 24, marginLeft: 10}}>📷</Text></TouchableOpacity>
            </View>
          </View>
        )
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: '#e9effb' },
  header: { backgroundColor: '#003366', paddingTop: 50, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  headT: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 10, elevation: 4 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  labelF: { color: '#666', fontWeight: 'bold', fontSize: 11 },
  valF: { color: '#003366', fontWeight: 'bold', fontSize: 14 },
  inputF: { color: '#003366', fontWeight: 'bold', textAlign: 'right', width: 120, padding: 5 },
  barV: { backgroundColor: '#2d6a2d', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between' },
  barA: { backgroundColor: '#003366', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between' },
  barT: { color: 'white', fontWeight: 'bold' },
  itF: { backgroundColor: 'white', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itFT: { fontSize: 12, color: '#444' },
  badge: { backgroundColor: '#4CD964', borderRadius: 10, paddingHorizontal: 6 },
  badgeT: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  btnE: { backgroundColor: '#ffcc00', padding: 18, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  btnET: { color: '#003366', fontWeight: 'bold', fontSize: 16 },
  preF: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
  preI: { width: '100%', height: '70%', resizeMode: 'contain' },
  preB: { flexDirection: 'row', justifyContent: 'space-around', padding: 20 },
  pBtn: { padding: 15, backgroundColor: '#4a5568', borderRadius: 10, width: width / 3.5, alignItems: 'center' },
  pBtnT: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  revC: { flex: 1, backgroundColor: 'white', paddingTop: 50, padding: 10 },
  revTi: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#003366' },
  revB: { width: '48%', margin: '1%', padding: 5, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  revI: { width: '100%', height: 110, borderRadius: 8 },
  pdfB: { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  revL: { fontSize: 9, marginTop: 5, fontWeight: 'bold' },
  revA: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 5 },
  revCl: { backgroundColor: '#003366', padding: 20, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  mF: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
  mC: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '80%' },
  mT: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#003366' },
  sB: { padding: 18, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  itL: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  btnC: { backgroundColor: '#003366', padding: 15, borderRadius: 10, marginTop: 10, alignItems: 'center' }
});                                                    
