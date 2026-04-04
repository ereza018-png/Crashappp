import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal, FlatList, StatusBar, Image, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing'; // Para visualizar PDFs

const { width } = Dimensions.get('window');

export default function App() {
  // --- ESTADOS DE DATOS ---
  const [datos, setDatos] = useState({
    aseguradora: 'Seleccionar', reporte: '', siniestro: '', atencion: [],
    acuerdos: 'Seleccionar', responsabilidad: 'Seleccionar', circunstancias: 'Seleccionar', improcedentes: 'Seleccionar'
  });

  const [attachments, setAttachments] = useState([]); // Array de {id, uri, label, type, rotation}
  const [loading, setLoading] = useState(false);
  
  // --- ESTADOS DE INTERFAZ ---
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({ title: '', options: [], field: '' });
  const [aseguradoExpanded, setAseguradoExpanded] = useState(true);
  const [terceroExpanded, setTerceroExpanded] = useState(false);

  // --- ESTADOS DE CÁMARA Y REVISIÓN ---
  const [previewVisible, setPreviewVisible] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [currentLabel, setCurrentLabel] = useState('');
  const [rotation, setRotation] = useState(0);
  const [reviewVisible, setReviewVisible] = useState(false);

  useEffect(() => {
    (async () => {
      await Location.requestForegroundPermissionsAsync();
      await ImagePicker.requestCameraPermissionsAsync();
    })();
  }, []);

  // --- TODOS LOS LISTADOS PROPORCIONADOS ---
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

  // --- LÓGICA DE ARCHIVOS ---
  const abrirCamara = async (label) => {
    let result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      setCurrentPhoto(result.assets[0].uri);
      setCurrentLabel(label);
      setRotation(0);
      setPreviewVisible(true);
    }
  };

  const guardarFoto = (seguir) => {
    setAttachments([...attachments, { id: Date.now(), uri: currentPhoto, label: currentLabel, type: 'image', rotation: rotation }]);
    setPreviewVisible(false);
    if (seguir) abrirCamara(currentLabel);
  };

  const adjuntarPDF = async () => {
    let result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (!result.canceled) {
      setAttachments([...attachments, { id: Date.now(), uri: result.assets[0].uri, label: 'PDF ADJUNTO', type: 'pdf', rotation: 0 }]);
      Alert.alert("Éxito", "PDF agregado correctamente.");
    }
  };

  const verArchivo = async (item) => {
    if (item.type === 'pdf' || item.type === 'image') {
      await Sharing.shareAsync(item.uri); // Esto abre el visor del sistema
    }
  };

  const rotarEnRevision = (id) => {
    setAttachments(attachments.map(a => a.id === id ? { ...a, rotation: (a.rotation + 90) % 360 } : a));
  };

  const eliminarArchivo = (id) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  // --- COMPONENTES ---
  const FilaDato = ({ label, valor, onPress, isInput = false }) => (
    <View style={styles.fila}>
      <Text style={styles.labelFila}>{label}:</Text>
      {isInput ? (
        <TextInput style={styles.inputFila} value={valor} onChangeText={(t) => setDatos({...datos, [label.toLowerCase()]: t})} keyboardType="numeric" placeholder="0000" />
      ) : (
        <TouchableOpacity onPress={onPress}><Text style={styles.valorFila}>{valor}</Text></TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.contenedor}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}><Text style={styles.headerTexto}>CRASH ASESORES</Text></View>
      
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* FORMULARIO */}
        <View style={styles.card}>
          <FilaDato label="ASEGURADORA" valor={datos.aseguradora} onPress={() => { setModalData({ title: 'ASEGURADORAS', options: LISTAS.aseguradora, field: 'aseguradora' }); setModalVisible(true); }} />
          <FilaDato label="REPORTE" valor={datos.reporte} isInput />
          <FilaDato label="SINIESTRO" valor={datos.siniestro} isInput />
          <FilaDato label="ATENCION" valor={datos.atencion.length + " Selecc."} onPress={() => { setModalData({ title: 'ATENCIÓN', options: LISTAS.atencion, field: 'atencion' }); setModalVisible(true); }} />
          <FilaDato label="ACUERDOS" valor={datos.acuerdos} onPress={() => { setModalData({ title: 'ACUERDOS', options: LISTAS.acuerdos, field: 'acuerdos' }); setModalVisible(true); }} />
          <FilaDato label="RESPONSABILIDAD" valor={datos.responsabilidad} onPress={() => { setModalData({ title: 'RESPONSABILIDAD', options: LISTAS.responsabilidad, field: 'responsabilidad' }); setModalVisible(true); }} />
          <FilaDato label="CIRCUNSTANCIAS" valor={datos.circunstancias} onPress={() => { setModalData({ title: 'CIRCUNSTANCIAS', options: LISTAS.circunstancias, field: 'circunstancias' }); setModalVisible(true); }} />
          <FilaDato label="IMPROCEDENTES" valor={datos.improcedentes} onPress={() => { setModalData({ title: 'IMPROCEDENTES', options: LISTAS.improcedentes, field: 'improcedentes' }); setModalVisible(true); }} />
        </View>

        {/* FOTOS ASEGURADO */}
        <TouchableOpacity style={styles.btnVerdeHeader} onPress={() => setAseguradoExpanded(!aseguradoExpanded)}>
          <Text style={styles.btnTextoCard}>FOTOS ASEGURADO</Text><Text style={{color:'white'}}>{aseguradoExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {aseguradoExpanded && (
          <View style={styles.cardDesplegada}>
            {SUB_CATEGORIAS.asegurado.map((item, idx) => {
              const count = attachments.filter(a => a.label === item).length;
              return (
                <View key={idx} style={styles.itemFoto}>
                  <Text style={styles.textoItemFoto}>{item}</Text>
                  <View style={{flexDirection:'row', alignItems:'center'}}>
                    {count > 0 && <TouchableOpacity onPress={() => setReviewVisible(true)}><View style={styles.badge}><Text style={styles.badgeText}>{count}</Text></View></TouchableOpacity>}
                    <TouchableOpacity onPress={() => abrirCamara(item)}><Text style={{fontSize: 24, marginLeft: 12}}>📷</Text></TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* FOTOS TERCERO */}
        <TouchableOpacity style={[styles.btnAzulHeader, {marginTop:10}]} onPress={() => setTerceroExpanded(!terceroExpanded)}>
          <Text style={styles.btnTextoCard}>FOTOS TERCERO</Text><Text style={{color:'white'}}>{terceroExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {terceroExpanded && (
          <View style={styles.cardDesplegada}>
            {SUB_CATEGORIAS.tercero.map((item, idx) => (
              <View key={idx} style={styles.itemFoto}>
                <Text style={styles.textoItemFoto}>{item}</Text>
                <TouchableOpacity onPress={() => abrirCamara(item)}><Text style={{fontSize: 24}}>📷</Text></TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* BOTONES ACCION */}
        <TouchableOpacity style={styles.btnRojo} onPress={adjuntarPDF}>
          <View style={{flexDirection:'row', alignItems:'center'}}>
            <View style={styles.iconDoc}><Text>📄</Text></View>
            <View><Text style={styles.btnTextoCard}>ADJUNTAR ARCHIVOS (PDF)</Text></View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnAmarillo} onPress={() => setReviewVisible(true)}>
          <Text style={styles.btnTextoEnviar}>📩 REVISAR Y ENVIAR CORREO</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={{marginTop:15}} onPress={() => setAttachments([])}><Text style={{color:'#999', textAlign:'center'}}>LIMPIAR TODO</Text></TouchableOpacity>
      </ScrollView>

      {/* --- MODAL REVISIÓN (PDF + ROTAR + ELIMINAR) --- */}
      <Modal visible={reviewVisible} animationType="slide">
        <View style={styles.modalRevFondo}>
          <Text style={styles.revTitulo}>REVISAR / ELIMINAR / ROTAR</Text>
          <FlatList
            data={attachments}
            numColumns={2}
            keyExtractor={item => item.id.toString()}
            renderItem={({item}) => (
              <View style={styles.revBox}>
                {item.type === 'image' ? (
                  <Image source={{uri: item.uri}} style={[styles.revImg, {transform: [{rotate: `${item.rotation}deg`}]}]} />
                ) : (
                  <View style={[styles.revImg, styles.pdfPlaceholder]}><Text style={{fontSize:40}}>📄</Text><Text style={{fontSize:10}}>PDF</Text></View>
                )}
                <Text numberOfLines={1} style={styles.revLabel}>{item.label}</Text>
                <View style={styles.revBotonesRow}>
                   {item.type === 'image' && <TouchableOpacity style={styles.revBtnAction} onPress={() => rotarEnRevision(item.id)}><Text>🔄</Text></TouchableOpacity>}
                   <TouchableOpacity style={styles.revBtnAction} onPress={() => verArchivo(item)}><Text>👁️</Text></TouchableOpacity>
                   <TouchableOpacity style={[styles.revBtnAction, {backgroundColor:'#ff4444'}]} onPress={() => eliminarArchivo(item.id)}><Text>🗑️</Text></TouchableOpacity>
                </View>
              </View>
            )}
          />
          <TouchableOpacity style={styles.btnFinalEnviar} onPress={() => { setReviewVisible(false); Alert.alert("Listo", "Presiona Enviar Correo en la pantalla principal."); }}>
            <Text style={{color:'white', fontWeight:'bold'}}>GUARDAR Y VOLVER</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* MODAL CÁMARA PREVIEW (ROTAR AL TOMAR) */}
      <Modal visible={previewVisible}>
        <View style={styles.previewFondo}>
          <Image source={{uri: currentPhoto}} style={[styles.previewImg, {transform: [{rotate: `${rotation}deg`}]}]} />
          <View style={styles.previewBotones}>
            <TouchableOpacity style={styles.btnCam} onPress={() => setRotation(rotation + 90)}><Text style={styles.btnCamTexto}>ROTAR</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btnCam, {backgroundColor:'#2d6a2d'}]} onPress={() => guardarFoto(true)}><Text style={styles.btnCamTexto}>OTRA</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btnCam, {backgroundColor:'#003366'}]} onPress={() => guardarFoto(false)}><Text style={styles.btnCamTexto}>LISTO</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SELECTORES (HDI, ACUERDOS, ETC) */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.mFondo}>
          <View style={styles.mCont}>
            <Text style={styles.mTit}>{modalData.title}</Text>
            <FlatList data={modalData.options} renderItem={({item}) => (
              <TouchableOpacity style={styles.mItem} onPress={() => {
                if(modalData.field === 'atencion') {
                  const n = datos.atencion.includes(item) ? datos.atencion.filter(i => i!==item) : [...datos.atencion, item];
                  setDatos({...datos, atencion: n});
                } else { setDatos({...datos, [modalData.field]: item}); setModalVisible(false); }
              }}>
                <Text style={styles.mTxt}>{item} {datos.atencion.includes(item) ? '✅' : ''}</Text>
              </TouchableOpacity>
            )} />
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.mCerrar}><Text style={{color:'white'}}>CERRAR</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#e9effb' },
  header: { backgroundColor: '#003366', paddingTop: 50, paddingBottom: 15, alignItems: 'center' },
  headerTexto: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  scroll: { padding: 15 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 10, elevation: 5, marginBottom: 15 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'center' },
  labelFila: { color: '#666', fontWeight: 'bold', fontSize: 11, flex: 1 },
  valorFila: { color: '#003366', fontWeight: 'bold', fontSize: 14 },
  inputFila: { color: '#003366', fontWeight: 'bold', fontSize: 14, textAlign: 'right', flex: 1 },
  btnVerdeHeader: { backgroundColor: '#2d6a2d', padding: 15, borderTopLeftRadius: 12, borderTopRightRadius: 12, flexDirection: 'row', justifyContent: 'space-between' },
  btnAzulHeader: { backgroundColor: '#003366', padding: 15, borderTopLeftRadius: 12, borderTopRightRadius: 12, flexDirection: 'row', justifyContent: 'space-between' },
  cardDesplegada: { backgroundColor: 'white', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: 10, marginBottom: 5 },
  itemFoto: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  textoItemFoto: { fontSize: 12, color: '#444', fontWeight:'500' },
  badge: { backgroundColor: '#4CD964', borderRadius: 10, paddingHorizontal: 6 },
  badgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  btnRojo: { backgroundColor: '#c62828', padding: 15, borderRadius: 12, marginTop: 15 },
  btnAmarillo: { backgroundColor: '#ffcc00', padding: 18, borderRadius: 12, marginTop: 15, alignItems: 'center' },
  btnTextoCard: { color: 'white', fontWeight: 'bold' },
  btnTextoEnviar: { color: '#003366', fontWeight: 'bold' },
  iconDoc: { backgroundColor: 'white', padding: 5, borderRadius: 5, marginRight: 10 },
  
  // Revisión
  modalRevFondo: { flex: 1, backgroundColor: 'white', paddingTop: 50, padding: 10 },
  revTitulo: { fontSize: 18, fontWeight: 'bold', color: '#003366', textAlign: 'center', marginBottom: 20 },
  revBox: { width: '48%', margin: '1%', backgroundColor: '#f9f9f9', borderRadius: 10, padding: 8, alignItems: 'center', borderWidth:1, borderColor:'#ddd' },
  revImg: { width: '100%', height: 110, borderRadius: 8 },
  pdfPlaceholder: { backgroundColor: '#eee', justifyContent: 'center' },
  revLabel: { fontSize: 9, marginTop: 5, fontWeight:'bold' },
  revBotonesRow: { flexDirection: 'row', marginTop: 8, justifyContent: 'space-around', width: '100%' },
  revBtnAction: { backgroundColor: '#eee', padding: 6, borderRadius: 5 },
  btnFinalEnviar: { backgroundColor: '#003366', padding: 20, borderRadius: 10, marginTop: 10, alignItems: 'center' },

  previewFondo: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
  previewImg: { width: '100%', height: '70%', resizeMode: 'contain' },
  previewBotones: { flexDirection: 'row', justifyContent: 'space-around', padding: 20 },
  btnCam: { backgroundColor: '#4a5568', padding: 15, borderRadius: 10, width: width/3.5, alignItems: 'center' },
  btnCamTexto: { color: 'white', fontWeight: 'bold' },

  mFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  mCont: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '80%' },
  mTit: { fontSize: 16, fontWeight: 'bold', textAlign:'center', marginBottom: 15 },
  mItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  mTxt: { fontSize: 13 },
  mCerrar: { backgroundColor: '#003366', padding: 12, borderRadius: 10, marginTop: 10, alignItems: 'center' }
});
