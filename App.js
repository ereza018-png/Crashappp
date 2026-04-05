import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal, FlatList, StatusBar, Image, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

const ESTADO_INICIAL = {
  aseguradora: 'Seleccionar', reporte: '', siniestro: '', atencion: [],
  acuerdos: 'Seleccionar', responsabilidad: 'Seleccionar', circunstancias: 'Seleccionar', improcedentes: 'Seleccionar'
};

export default function App() {
  const refSiniestro = useRef();
  const [datos, setDatos] = useState(ESTADO_INICIAL);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modales
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({ title: '', options: [], field: '' });
  const [sourceVisible, setSourceVisible] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  
  // Multitoma
  const [activeCategory, setActiveCategory] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [tempPhoto, setTempPhoto] = useState(null);

  // Acordeones
  const [aseguradoExpanded, setAseguradoExpanded] = useState(true);
  const [terceroExpanded, setTerceroExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      await Location.requestForegroundPermissionsAsync();
      await ImagePicker.requestCameraPermissionsAsync();
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

  // --- LÓGICA DE CAPTURA Y MULTITOMA ---
  const manejarCaptura = async (tipo) => {
    let result;
    const options = { quality: 0.5 }; // COMPRESIÓN 50%

    if (tipo === 'camara') {
      result = await ImagePicker.launchCameraAsync(options);
    } else if (tipo === 'galeria') {
      result = await ImagePicker.launchImageLibraryAsync(options);
    } else {
      result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    }

    if (!result.canceled) {
      const uri = result.assets ? result.assets[0].uri : result.uri;
      if (tipo === 'camara') {
        setTempPhoto(uri);
        setPreviewVisible(true);
      } else {
        setAttachments([...attachments, { id: Date.now(), uri, label: activeCategory, rotation: 0, type: tipo === 'pdf' ? 'pdf' : 'image' }]);
        setSourceVisible(false);
      }
    }
  };

  const guardarYContinuar = (seguir) => {
    setAttachments([...attachments, { id: Date.now(), uri: tempPhoto, label: activeCategory, rotation: 0, type: 'image' }]);
    setPreviewVisible(false);
    if (seguir) manejarCaptura('camara');
    else setSourceVisible(false);
  };

  const verArchivo = async (uri) => {
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
  };

  const limpiarTodo = () => {
    Alert.alert("Limpiar reporte", "¿Estás seguro de borrar todos los datos y fotos?", [
      { text: "No" },
      { text: "Sí", onPress: () => { setDatos(ESTADO_INICIAL); setAttachments([]); } }
    ]);
  };

  const enviarReporte = async () => {
    setLoading(true);
    try {
      let loc = await Location.getCurrentPositionAsync({});
      const mapsUrl = `https://www.google.com/maps?q=${loc.coords.latitude},${loc.coords.longitude}`;
      
      const asunto = `${datos.aseguradora} REPORTE ${datos.reporte} SINIESTRO ${datos.siniestro} ${datos.atencion.join(' ')}`;

      await MailComposer.composeAsync({
        recipients: ['tu-correo@ejemplo.com'],
        subject: asunto,
        body: `REPORTE CRASH\n\nUbicación: ${mapsUrl}\nFotos: ${attachments.length}`,
        attachments: attachments.map(a => a.uri),
      });
    } catch (e) { Alert.alert("Error", "No se pudo enviar."); }
    setLoading(false);
  };

  // --- COMPONENTES ---
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
          onSubmitEditing={() => field === 'reporte' && refSiniestro.current.focus()}
          ref={field === 'siniestro' ? refSiniestro : null}
        />
      ) : (
        <TouchableOpacity onPress={() => { setModalData({ title: label, options: LISTAS[field], field }); setModalVisible(true); }}>
          <Text style={styles.valorFila}>{valor}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.contenedor}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={limpiarTodo}><Text style={{color:'white'}}>Cerrar Sesión</Text></TouchableOpacity>
        <Text style={styles.headerTexto}>CRASH ASESORES</Text>
        <View style={{width:60}}/>
      </View>
      
      <ScrollView contentContainerStyle={styles.scroll}>
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

        {/* ACORDEONES */}
        <TouchableOpacity style={styles.btnVerde} onPress={() => setAseguradoExpanded(!aseguradoExpanded)}>
          <Text style={styles.btnT}>FOTOS ASEGURADO</Text><Text style={{color:'white'}}>{aseguradoExpanded?'▲':'▼'}</Text>
        </TouchableOpacity>
        {aseguradoExpanded && SUB_CATEGORIAS.asegurado.map((item, i) => (
          <View key={i} style={styles.itemF}>
            <Text style={styles.itemFT}>{item}</Text>
            <View style={{flexDirection:'row', alignItems:'center'}}>
              <TouchableOpacity onPress={() => setReviewVisible(true)}><Text style={{fontSize:20, marginRight:10}}>👁️</Text></TouchableOpacity>
              {attachments.filter(a=>a.label===item).length > 0 && <View style={styles.badge}><Text style={styles.badgeT}>{attachments.filter(a=>a.label===item).length}</Text></View>}
              <TouchableOpacity onPress={() => { setActiveCategory(item); setSourceVisible(true); }}><Text style={{fontSize:24, marginLeft:10}}>📷</Text></TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity style={[styles.btnAzul, {marginTop:10}]} onPress={() => setTerceroExpanded(!terceroExpanded)}>
          <Text style={styles.btnT}>FOTOS TERCERO</Text><Text style={{color:'white'}}>{terceroExpanded?'▲':'▼'}</Text>
        </TouchableOpacity>
        {terceroExpanded && SUB_CATEGORIAS.tercero.map((item, i) => (
          <View key={i} style={styles.itemF}>
            <Text style={styles.itemFT}>{item}</Text>
            <TouchableOpacity onPress={() => { setActiveCategory(item); setSourceVisible(true); }}><Text style={{fontSize:24}}>📷</Text></TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.btnAmarillo} onPress={enviarReporte} disabled={loading}>
          {loading ? <ActivityIndicator color="#003366"/> : <Text style={styles.btnTEn}>📧 ENVIAR REPORTE COMPLETO</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={{marginTop:20}} onPress={limpiarTodo}><Text style={{color:'#666', textAlign:'center'}}>🗑️ LIMPIAR REPORTE</Text></TouchableOpacity>
      </ScrollView>

      {/* MODAL MULTITOMA PREVIEW */}
      <Modal visible={previewVisible}>
        <View style={styles.preFondo}>
          <Image source={{uri: tempPhoto}} style={styles.preImg} />
          <View style={styles.preBtns}>
            <TouchableOpacity style={[styles.preBtn, {backgroundColor:'#2d6a2d'}]} onPress={() => guardarYContinuar(true)}><Text style={styles.preBtnT}>OTRA</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.preBtn, {backgroundColor:'#003366'}]} onPress={() => guardarYContinuar(false)}><Text style={styles.preBtnT}>LISTO</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL REVISIÓN (ROTAR, ELIMINAR, VER) */}
      <Modal visible={reviewVisible} animationType="slide">
        <View style={styles.revFondo}>
          <Text style={styles.revTit}>REVISAR / ROTAR / ELIMINAR</Text>
          <FlatList data={attachments} numColumns={2} renderItem={({item}) => (
            <View style={styles.revBox}>
              <Image source={{uri: item.uri}} style={[styles.revImg, {transform: [{rotate: `${item.rotation}deg`}]}]} />
              <Text numberOfLines={1} style={styles.revLabel}>{item.label}</Text>
              <View style={styles.revActions}>
                <TouchableOpacity onPress={() => setAttachments(attachments.map(a => a.id===item.id ? {...a, rotation: (a.rotation+90)%360}:a))}><Text>🔄</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => verArchivo(item.uri)}><Text>👁️</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setAttachments(attachments.filter(a=>a.id!==item.id))}><Text>🗑️</Text></TouchableOpacity>
              </View>
            </View>
          )} />
          <TouchableOpacity style={styles.btnCerrarRev} onPress={() => setReviewVisible(false)}><Text style={{color:'white', fontWeight:'bold'}}>GUARDAR Y CERRAR</Text></TouchableOpacity>
        </View>
      </Modal>

      {/* SELECTOR DE ORIGEN */}
      <Modal visible={sourceVisible} transparent={true}>
        <View style={styles.mFondo}>
          <View style={styles.mCont}>
            <Text style={styles.mTit}>{activeCategory}</Text>
            <TouchableOpacity style={styles.sBtn} onPress={() => manejarCaptura('camara')}><Text>📷 Cámara</Text></TouchableOpacity>
            <TouchableOpacity style={styles.sBtn} onPress={() => manejarCaptura('galeria')}><Text>🖼️ Galería</Text></TouchableOpacity>
            <TouchableOpacity style={styles.sBtn} onPress={() => manejarCaptura('pdf')}><Text>📁 Archivos / Drive</Text></TouchableOpacity>
            <TouchableOpacity style={styles.sBtn} onPress={() => setSourceVisible(false)}><Text style={{color:'red'}}>Cancelar</Text></TouchableOpacity>
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
  headerTexto: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  scroll: { padding: 15 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 10, elevation: 4, marginBottom: 15 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  labelFila: { color: '#666', fontWeight: 'bold', fontSize: 11 },
  valorFila: { color: '#003366', fontWeight: 'bold', fontSize: 13 },
  inputFila: { color: '#003366', fontWeight: 'bold', textAlign: 'right', width: 120 },
  btnVerde: { backgroundColor: '#2d6a2d', padding: 15, borderRadius: 10, flexDirection:'row', justifyContent:'space-between' },
  btnAzul: { backgroundColor: '#003366', padding: 15, borderRadius: 10, flexDirection:'row', justifyContent:'space-between' },
  itemF: { backgroundColor:'white', padding:12, borderBottomWidth:1, borderBottomColor:'#eee', flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  itemFT: { fontSize:12, color:'#444', fontWeight:'500' },
  badge: { backgroundColor:'#4CD964', borderRadius:10, paddingHorizontal:6 },
  badgeT: { color:'white', fontSize:11, fontWeight:'bold' },
  btnAmarillo: { backgroundColor:'#ffcc00', padding:18, borderRadius:12, marginTop:20, alignItems:'center' },
  btnT: { color:'white', fontWeight:'bold' },
  btnTEn: { color:'#003366', fontWeight:'bold', fontSize:16 },
  
  preFondo: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
  preImg: { width: '100%', height: '70%', resizeMode: 'contain' },
  preBtns: { flexDirection: 'row', justifyContent: 'space-around', padding: 20 },
  preBtn: { padding: 15, borderRadius: 10, width: width/2.5, alignItems: 'center' },
  preBtnT: { color: 'white', fontWeight: 'bold' },

  revFondo: { flex: 1, backgroundColor: 'white', paddingTop: 50, padding: 10 },
  revTit: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color:'#003366' },
  revBox: { width: '48%', margin: '1%', backgroundColor: '#f9f9f9', padding: 8, borderRadius: 10, alignItems: 'center', borderWidth:1, borderColor:'#ddd' },
  revImg: { width: '100%', height: 110, borderRadius: 8 },
  revLabel: { fontSize: 9, marginTop: 5, fontWeight:'bold' },
  revActions: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 10 },
  btnCerrarRev: { backgroundColor: '#003366', padding: 20, borderRadius: 10, marginTop: 10, alignItems: 'center' },

  mFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
  mCont: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '80%' },
  mTit: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color:'#003366' },
  sBtn: { padding:18, borderBottomWidth:1, borderBottomColor:'#eee', alignItems:'center' },
  itemL: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  btnC: { backgroundColor: '#003366', padding: 15, borderRadius: 10, marginTop: 10, alignItems: 'center' }
});
