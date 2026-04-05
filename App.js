import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal, FlatList, StatusBar, Image, Dimensions, BackHandler, LayoutAnimation, Platform, UIManager } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

// Habilitar animaciones suaves en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ESTADO_INICIAL = {
  aseguradora: 'Seleccionar', reporte: '', siniestro: '', atencion: [],
  acuerdos: 'Seleccionar', responsabilidad: 'Seleccionar', circunstancias: 'Seleccionar', improcedentes: 'Seleccionar'
};

export default function App() {
  // --- REFS PARA EL "TAB" (SALTAR CAMPOS) ---
  const refSiniestro = useRef();

  // --- ESTADOS ---
  const [datos, setDatos] = useState(ESTADO_INICIAL);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modales
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({ title: '', options: [], field: '' });
  const [sourceVisible, setSourceVisible] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  
  // Multitoma con Rotación en Cámara (Preview Modal)
  const [activeCategory, setActiveCategory] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [tempPhoto, setTempPhoto] = useState(null);
  const [tempRotation, setTempRotation] = useState(0);

  // Modal para Visualizar Fotos/PDFs de "Archivo"
  const [filePreviewVisible, setFilePreviewVisible] = useState(false);
  const [currentFilePreview, setCurrentFilePreview] = useState(null);

  // Acordeones
  const [aseguradoExpanded, setAseguradoExpanded] = useState(true);
  const [terceroExpanded, setTerceroExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      await Location.requestForegroundPermissionsAsync();
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  // --- LISTADOS COMPLETOS ---
  const LISTAS = {
    aseguradora: ["HDI", "EL ÁGUILA", "GEN DE SEG", "ALLIANZ", "ANA SEGUROS", "CHUBB", "OTRAS"],
    atencion: ["COMPLEMENTARIA", "SIN PÓLIZA", "DIVERSOS", "KM", "PEAJE"],
    acuerdos: ["COBRO SIPAC", "COBRO COPAC", "RECUPERACIÓN EFECTIVO", "RECUPERACIÓN TDD", "RECUPERACIÓN GOA", "RECUPERACIÓN MODULO", "COSTO ASEGURADO", "CRISTAL", "SEGURO DE RINES Y LLANTAS", "ROBO PARCIAL", "ROBO TOTAL", "JURÍDICO", "PLAN PISO", "CASH FLOW", "INVESTIGACIÓN", "COMPLEMENTO", "PAGO SIPAC", "PAGO COPAC", "COSTO TERCERO", "PAGO UMAS Y DEDUCIBLES", "S/C ARREGLO ENTRE PARTICULARES", "S/C MENOR AL DEDUCIBLE", "IMPROCEDENTE", "S/C SIN PÓLIZA", "RECHAZO", "NO LOCALIZADO", "DIVERSOS", "CANCELADO 10 < NO FACTURAR"],
    responsabilidad: ["ASEGURADO", "TERCERO", "CORRESPONSABILIDAD", "PENDIENTE"],
    circunstancias: ["AGRAVAMIENTO DE DAÑO", "ALCANCE", "AMPLITUD Y/O AFLUENCIA", "APERTURA DE PUERTA", "ASESORÍA", "ATROPELLO", "BACHE", "CAÍDA DE OBJETOS", "CAMBIO DE CARRIL", "CARRIL DE CONTRA FLUJO", "CASH FLOW RECUPERACIÓN", "CIRCULABA A LA IZQUIERDA EN CRUCERO", "DE IGUAL AMPLITUD", "CIRCULABA SOBRE LA VÍA PRINCIPAL", "CIRCULABA SOBRE LA VÍA SECUNDARIA", "CITA POSTERIOR", "CORTE DE CIRCULACIÓN", "CUNETA", "DAÑOS OCASIONADOS POR LA CARGA", "DIVERSOS", "DUPLICADO", "ENTRE CARRILES", "ESTACIONADO", "EXCESO DE VELOCIDAD", "FALLA MECÁNICA", "INCORPORACIÓN", "INUNDACIÓN", "INVACIÓN DE CARRIL", "LIBERACIÒN DE VEHÍCULO", "MANIOBRAS PARA ESTACIONARSE", "NO LOCALIZADO", "NO TOMÉ EL EXTREMO", "OBJETO FIJO", "PAGO DE DAÑOS PAGO SIPAC/COPAC", "PARTES BAJAS", "PASADA DE ALTO", "PASES MÉDICOS", "PENDIENTE DECLARACIÓN", "PERDER EL CONTROL", "RECUPERACIÓN (RECUPERACIÓN,UMAS)", "RECUPERACIÓN COPAC/SIPAC", "RECUPERACIÓN DE VEHÍCULO POR ROBO", "REVERSA", "ROBO PARCIAL", "ROBO TOTAL", "ROTURA DE CRISTAL", "SALIDA DE CAMINO", "SALÍDA DE COCHERA", "SEMOVIENTE", "SENTIDO CONTRARIO", "SEÑAL PREVENTIVA", "SEÑAL RESTRICTIVA", "SIN COSTO", "TRASLADO", "VALE DE GRÚA", "VALET PARKING", "VANDALISMO", "VEHÍCULO RECUPERADO", "VIOLENCIA", "VISTA A LA DERECHA", "VOLANTE DE ADMISIÓN", "VOLANTE DE ADMISIÓN Y GRÚA", "VOLCADURA", "VUELTA A LA DERECHA", "VUELTA A LA IZQUIERDA", "VUELTA DESDE EL SEGUNDO CARRIL", "VUELTA EN U", "VUELTA PROHIBIDA", "GRANIZO", "DERRAPO", "OTRO"],
    improcedentes: ["OTRO", "CAMBIO DE CONDUCTOR", "COBERTURA NO AMPARADA (SEGURO DE LLANTAS Y RINES)", "DECLARACIÓN", "EXTENSIÓN DE RESPONSABILIDAD CIVIL", "FALLA MECÁNICA", "LICENCIA", "NO CONCUERDAN DAÑOS DE LOS AUTOMOVILES", "NO ES ASEGURADO", "NO HAY COLISIÓN", "PÓLIZA CANCELADA", "PÓLIZA LIMITADA", "PÓLIZA NO AMPARA DAÑOS", "PÓLIZA RECIENTE", "USO DISTINTO AL CONTRATADO", "PÓLIZA RC", "RECHAZO", "DESISTIMIENTO"]
  };

  const SUB_CATEGORIAS = {
    asegurado: ["MÉTODO CRONOS", "DAÑOS", "DUA ANVERSO", "DUA REVERSO", "PLACAS", "NÚMERO DE SERIE", "ODÓMETRO", "LICENCIA", "TARJETA CIRCULACIÓN", "IDENTIFICACIONES", "ENCUESTA SATISFACCIÓN", "VOLANTES", "OTROS DOCUMENTOS"],
    tercero: ["DOCUMENTOS", "VEHÍCULO TERCERO"]
  };

  // --- LÓGICA DE CAPTURA Y MULTITOMA (CON ROTAR Y GUARDAR/OTRA) ---
  const manejarCaptura = async (tipo) => {
    let result;
    const options = { quality: 0.5 }; // COMPRESIÓN Al 50%

    if (tipo === 'camara') {
      setSourceVisible(false);
      result = await ImagePicker.launchCameraAsync(options);
    } else if (tipo === 'galeria') {
      result = await ImagePicker.launchImageLibraryAsync(options);
    } else {
      // DRIVE / ARCHIVOS
      result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    }

    if (!result.canceled) {
      if (tipo === 'camara') {
        const uri = result.assets ? result.assets[0].uri : result.uri;
        setTempPhoto(uri);
        setTempRotation(0);
        setPreviewVisible(true);
      } else if (tipo === 'galeria') {
        const uri = result.assets[0].uri;
        setAttachments([...attachments, { id: Date.now(), uri, label: activeCategory, rotation: 0, type: 'image' }]);
        setSourceVisible(false);
      } else if (tipo === 'drive') {
        // DRIVE / ARCHIVOS - Visualizar antes de agregar
        const uri = result.assets ? result.assets[0].uri : result.uri;
        const name = result.assets ? result.assets[0].name : result.name;
        const mimeType = result.assets ? result.assets[0].mimeType : result.mimeType;
        setCurrentFilePreview({ id: Date.now(), uri, name, label: activeCategory, type: mimeType === 'application/pdf' ? 'pdf' : 'image', rotation: 0 });
        setSourceVisible(false);
        setFilePreviewVisible(true);
      }
    }
  };

  // Guardar multitoma (Listo u Otra)
  const guardarYContinuarMultitoma = (seguir) => {
    // Al guardar, aplicamos la rotación temporal que eligió el usuario en el modal
    setAttachments([...attachments, { id: Date.now(), uri: tempPhoto, label: activeCategory, rotation: tempRotation, type: 'image' }]);
    setPreviewVisible(false);
    if (seguir) {
      // Abre la cámara de nuevo inmediatamente
      setTimeout(() => manejarCaptura('camara'), 300);
    }
  };

  // Ver archivo en grande (visualizar)
  const verArchivoInGrande = async (uri) => {
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
  };

  // Limpiar y Salir (exit app)
  const limpiarYSalir = () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro de borrar todo y salir de la aplicación?", [
      { text: "No" },
      { text: "Sí", onPress: () => { 
        setDatos(ESTADO_INICIAL); 
        setAttachments([]); 
        BackHandler.exitApp(); // SALE DE LA APP
      } }
    ]);
  };

  // Enviar correo (con asunto final y compresión)
  const enviarReporteFinal = async () => {
    setLoading(true);
    try {
      if (!datos.reporte || !datos.siniestro) {
        Alert.alert("Atención", "Escribe el número de Reporte y Siniestro.");
        setLoading(false);
        return;
      }
      
      let loc = await Location.getCurrentPositionAsync({});
      const mapsUrl = `https://www.google.com/maps?q=${loc.coords.latitude},${loc.coords.longitude}`;
      
      // ASUNTO FINAL SOLICITADO
      const atencionText = datos.atencion.length > 0 ? datos.atencion.join(' ') : 'Sin atención';
      const asuntoFinal = `${datos.aseguradora} REPORTE ${datos.reporte} SINIESTRO ${datos.siniestro} ${atencionText}`;

      await MailComposer.composeAsync({
        recipients: ['tu-correo@ejemplo.com'], // Cambia esto
        subject: asuntoFinal,
        body: `REPORTE CRASH ASESORES\n\nUbicación: ${mapsUrl}\nFotos: ${attachments.length}`,
        attachments: attachments.map(a => a.uri),
      });
    } catch (e) { Alert.alert("Error", "No se pudo preparar el envío."); }
    setLoading(false);
  };

  // --- COMPONENTES DE FILAS (REUSABLES) ---
  const FilaDato = ({ label, valor, field, isInput = false }) => (
    <View style={styles.fila}>
      <Text style={styles.labelFila}>{label}:</Text>
      {isInput ? (
        <TextInput 
          style={styles.inputFila} 
          value={valor} 
          onChangeText={(t) => setDatos({...datos, [field]: t})} 
          keyboardType="numeric" placeholder="0000"
          returnKeyType="next"
          onSubmitEditing={() => refSiniestro.current.focus()}
        />
      ) : (
        <TouchableOpacity onPress={() => { setModalData({ title: label, options: LISTAS[field], field }); setModalVisible(true); }}>
          <Text style={styles.valorFila}>{valor}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const CarpetaFotos = ({ label, expanded, setExpanded, listado }) => (
    <View style={{marginTop: expanded ? 0 : 10}}>
      <TouchableOpacity 
        style={label === "FOTOS ASEGURADO" ? styles.btnVerde : styles.btnAzul} 
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpanded(!expanded); }}
      >
        <Text style={styles.btnT}>{label}</Text><Text style={{color:'white', fontWeight:'bold'}}>{expanded?'▲':'▼'}</Text>
      </TouchableOpacity>
      {expanded && listado.map((item, i) => {
        const count = attachments.filter(a=>a.label===item).length;
        return (
          <View key={i} style={styles.itemF}>
            <Text style={styles.itemFT}>{item}</Text>
            <View style={{flexDirection:'row', alignItems:'center'}}>
              {/* Ojo para revisar, badge verde para contador, cámara para tomar */}
              <TouchableOpacity onPress={() => setReviewVisible(true)}><Text style={{fontSize:20, marginRight:10}}>👁️</Text></TouchableOpacity>
              {count > 0 && <View style={styles.badge}><Text style={styles.badgeT}>{count}</Text></View>}
              <TouchableOpacity onPress={() => { setActiveCategory(item); setSourceVisible(true); }}><Text style={{fontSize:24, marginLeft:10}}>📷</Text></TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.contenedor}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        {/* BOTÓN CERRAR SESIÓN (EXIT) EN HEADER */}
        <TouchableOpacity onPress={limpiarYSalir}><Text style={{color:'red', fontWeight:'bold', fontSize:12}}>Cerrar Sesión</Text></TouchableOpacity>
        <Text style={styles.headerTexto}>CRASH ASESORES</Text>
        <View style={{width:50}}/>
      </View>
      
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* CARD DATOS - TECLADO NUMÉRICO Y TAB */}
        <View style={styles.card}>
          <FilaDato label="ASEGURADORA" valor={datos.aseguradora} field="aseguradora" />
          <FilaDato label="REPORTE" valor={datos.reporte} field="reporte" isInput />
          <FilaDato label="SINIESTRO" valor={datos.siniestro} field="siniestro" isInput />
          <FilaDato label="ATENCION" valor={datos.atencion.length + " Selecc."} field="atencion" />
          <FilaDato label="ACUERDOS" valor={datos.acuerdos} field="acuerdos" />
          <FilaDato label="RESPONSABILIDAD" valor={datos.responsabilidad} field="responsabilidad" />
          <FilaDato label="CIRCUNSTANCIAS" valor={datos.circunstancias} field="circunstancias" />
          <FilaDato label="IMPROCEDENTES" valor={datos.improcedentes} field="improcedentes" />
        </View>

        {/* ACORDEONES (ASEGURADO Y TERCERO CON MISMOS COMPONENTES) */}
        <CarpetaFotos label="FOTOS ASEGURADO" expanded={aseguradoExpanded} setExpanded={setAseguradoExpanded} listado={SUB_CATEGORIAS.asegurado} />
        <CarpetaFotos label="FOTOS TERCERO" expanded={terceroExpanded} setExpanded={setTerceroExpanded} listado={SUB_CATEGORIAS.tercero} />

        {/* BOTONES ACCIÓN */}
        <TouchableOpacity style={styles.btnAmarillo} onPress={enviarReporteFinal} disabled={loading}>
          {loading ? <ActivityIndicator color="#003366"/> : <Text style={styles.btnTEn}>📧 ENVIAR REPORTE FIN</Text>}
        </TouchableOpacity>
        
        <TouchableOpacity style={{marginTop:20, marginBottom:10}} onPress={limpiarYSalir}><Text style={{color:'#666', textAlign:'center', textDecorationLine:'underline'}}>🗑️ LIMPIAR REPORTE</Text></TouchableOpacity>
      </ScrollView>

      {/* --- MODAL CÁMARA PREVIEW (ROTAR, OTRA, LISTO) --- */}
      <Modal visible={previewVisible}>
        <View style={styles.preFondo}>
          <Text style={styles.revTitModal}>PREVISUALIZACIÓN CÁMARA</Text>
          <Image source={{uri: tempPhoto}} style={[styles.preImg, {transform: [{rotate: `${tempRotation}deg`}]}]} />
          <View style={styles.preBtns}>
            <TouchableOpacity style={styles.preBtn} onPress={() => setTempRotation((tempRotation+90)%360)}><Text style={styles.preBtnT}>ROTAR 🔄</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.preBtn, {backgroundColor:'#2d6a2d'}]} onPress={() => guardarYContinuarMultitoma(true)}><Text style={styles.preBtnT}>OTRA</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.preBtn, {backgroundColor:'#003366'}]} onPress={() => guardarYContinuarMultitoma(false)}><Text style={styles.preBtnT}>LISTO</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL REVISIÓN (FOTOS Y PDFs) --- */}
      <Modal visible={reviewVisible} animationType="slide">
        <View style={styles.revFondo}>
          <Text style={styles.revTit}>REVISAR / ROTAR / ELIMINAR</Text>
          <FlatList data={attachments} numColumns={2} keyExtractor={item => item.id.toString()} renderItem={({item}) => (
            <View style={styles.revBox}>
              {item.type === 'image' ? (
                <Image source={{uri: item.uri}} style={[styles.revImg, {transform: [{rotate: `${item.rotation}deg`}]}]} />
              ) : (
                <View style={[styles.revImg, {backgroundColor:'#eee', justifyContent:'center', alignItems:'center'}]}><Text style={{fontSize:40}}>📄</Text><Text style={{fontSize:10}}>PDF</Text></View>
              )}
              <Text numberOfLines={1} style={styles.revLabel}>{item.label}</Text>
              <View style={styles.revActions}>
                {item.type === 'image' && <TouchableOpacity onPress={() => setAttachments(attachments.map(a => a.id===item.id ? {...a, rotation: (a.rotation+90)%360}:a))}><Text>🔄</Text></TouchableOpacity>}
                <TouchableOpacity onPress={() => verArchivoInGrande(item.uri)}><Text>👁️</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setAttachments(attachments.filter(a=>a.id!==item.id))}><Text>🗑️</Text></TouchableOpacity>
              </View>
            </View>
          )} />
          <TouchableOpacity style={styles.btnCerrarRev} onPress={() => setReviewVisible(false)}><Text style={{color:'white', fontWeight:'bold'}}>GUARDAR Y CERRAR</Text></TouchableOpacity>
        </View>
      </Modal>

      {/* --- MODAL PREVISUALIZAR ARCHIVO (SOLICITADO EN IMAGEN) --- */}
      <Modal visible={filePreviewVisible} animationType="fade" transparent={true}>
        <View style={styles.mFondo}>
          <View style={styles.filePreviewCont}>
            <Text style={styles.mTit}>Visualizar Archivo</Text>
            {currentFilePreview?.type === 'image' ? (
              <Image source={{uri: currentFilePreview?.uri}} style={styles.filePreviewImg} />
            ) : (
              <View style={[styles.filePreviewImg, {backgroundColor:'#f0f0f0', justifyContent:'center', alignItems:'center'}]}>
                <Text style={{fontSize:60}}>📄</Text><Text style={{fontSize:12, fontWeight:'bold'}}>{currentFilePreview?.name}</Text>
              </View>
            )}
            <View style={styles.preBtnsRow}>
               <TouchableOpacity style={[styles.preBtn, {backgroundColor:'#003366'}]} onPress={() => { setAttachments([...attachments, currentFilePreview]); setFilePreviewVisible(false); Alert.alert("Éxito", "Adjuntado."); }}><Text style={styles.preBtnT}>Adjuntar</Text></TouchableOpacity>
               <TouchableOpacity style={[styles.preBtn, {backgroundColor:'#cc0000'}]} onPress={() => setFilePreviewVisible(false)}><Text style={styles.preBtnT}>Cancelar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL SELECTOR ORIGEN */}
      <Modal visible={sourceVisible} transparent={true}>
        <View style={styles.mFondo}>
          <View style={styles.mCont}>
            <Text style={styles.mTit}>Origen de archivo: {activeCategory}</Text>
            <TouchableOpacity style={styles.sBtn} onPress={() => manejarCaptura('camara')}><Text>📷 Cámara</Text></TouchableOpacity>
            <TouchableOpacity style={styles.sBtn} onPress={() => manejarCaptura('galeria')}><Text>🖼️ De Galería</Text></TouchableOpacity>
            <TouchableOpacity style={styles.sBtn} onPress={() => manejarCaptura('drive')}><Text>📁 De Drive / Archivos</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.sBtn, {backgroundColor:'#f8f8f8'}]} onPress={() => setSourceVisible(false)}><Text style={{color:'red'}}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SELECTOR LISTAS */}
      <Modal visible={modalVisible} transparent={true}>
        <View style={styles.mFondo}>
          <View style={styles.mCont}>
            <Text style={styles.mTit}>{modalData.title}</Text>
            <FlatList data={modalData.options} renderItem={({item}) => (
              <TouchableOpacity style={styles.itemL} onPress={() => {
                if(modalData.field==='atencion'){
                  const n = datos.atencion.includes(item)?datos.atencion.filter(x=>x!==item):[...datos.atencion, item];
                  setDatos({...datos, atencion:n});
                } else { setDatos({...datos, [modalData.field]:item}); setModalVisible(false); }
              }}>
                <Text>{item} {datos.atencion.includes(item)?'✅':''}</Text>
              </TouchableOpacity>
            )} />
            <TouchableOpacity style={styles.btnC} onPress={() => setModalVisible(false)}><Text style={{color:'white'}}>CERRAR</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#e9effb' },
  header: { backgroundColor: '#003366', paddingTop: 50, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  headerTexto: { color: 'white', fontWeight: 'bold', fontSize: 18, letterSpacing: 1 },
  scroll: { padding: 15 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 10, elevation: 4, marginBottom: 15 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  labelFila: { color: '#666', fontWeight: 'bold', fontSize: 11 },
  valorFila: { color: '#003366', fontWeight: 'bold', fontSize: 13 },
  inputFila: { color: '#003366', fontWeight: 'bold', textAlign: 'right', width: 120 },
  btnVerde: { backgroundColor: '#2d6a2d', padding: 15, borderRadius: 10, flexDirection:'row', justifyContent:'space-between', elevation: 2 },
  btnAzul: { backgroundColor: '#003366', padding: 15, borderRadius: 10, flexDirection:'row', justifyContent:'space-between', elevation: 2 },
  itemF: { backgroundColor:'white', padding:12, borderBottomWidth:1, borderBottomColor:'#eee', flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  itemFT: { fontSize:12, color:'#444', fontWeight:'500' },
  badge: { backgroundColor:'#4CD964', borderRadius:10, paddingHorizontal:6 },
  badgeT: { color:'white', fontSize:11, fontWeight:'bold' },
  btnAmarillo: { backgroundColor:'#ffcc00', padding:18, borderRadius:12, marginTop:20, alignItems:'center', elevation:3 },
  btnT: { color:'white', fontWeight:'bold', fontSize:14 },
  btnTEn: { color:'#003366', fontWeight:'bold', fontSize:16 },
  
  // Estilos de Previsialización (Multitoma)
  preFondo: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
  revTitModal: { fontSize: 16, color: 'white', fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  preImg: { width: '100%', height: '70%', resizeMode: 'contain' },
  preBtns: { flexDirection: 'row', justifyContent: 'space-around', padding: 20 },
  preBtn: { padding: 15, borderRadius: 10, width: width/3.5, alignItems: 'center', backgroundColor:'#4a5568' },
  preBtnT: { color: 'white', fontWeight: 'bold' },

  // Estilos de Revisión (Fotos y PDFs)
  revFondo: { flex: 1, backgroundColor: 'white', paddingTop: 50, padding: 10 },
  revTit: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color:'#003366' },
  revBox: { width: '48%', margin: '1%', backgroundColor: '#f9f9f9', padding: 8, borderRadius: 10, alignItems: 'center', borderWidth:1, borderColor:'#ddd' },
  revImg: { width: '100%', height: 110, borderRadius: 8 },
  revLabel: { fontSize: 9, marginTop: 5, fontWeight:'bold' },
  revActions: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 10 },
  btnCerrarRev: { backgroundColor: '#003366', padding: 20, borderRadius: 10, marginTop: 10, alignItems: 'center' },

  // Modal Visualizar Archivo
  filePreviewCont: { backgroundColor:'white', borderRadius:20, padding:15, width:'90%', alignItems:'center' },
  filePreviewImg: { width:'100%', height: width*0.8, borderRadius:10, marginBottom:15, resizeMode:'contain' },
  preBtnsRow: { flexDirection:'row', width:'100%', justifyContent:'space-around' },

  mFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  mCont: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '80%', width:'100%' },
  mTit: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color:'#003366' },
  sBtn: { padding:18, borderBottomWidth:1, borderBottomColor:'#eee', alignItems:'center' },
  itemL: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  btnC: { backgroundColor: '#003366', padding: 15, borderRadius: 10, marginTop: 10, alignItems: 'center' }
});
