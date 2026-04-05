import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal, FlatList, StatusBar, Image, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

export default function App() {
  // --- REFS PARA EL "TAB" (SALTAR CAMPOS) ---
  const refSiniestro = useRef();

  // --- ESTADOS ---
  const [datos, setDatos] = useState({
    aseguradora: 'Seleccionar', reporte: '', siniestro: '', atencion: [],
    acuerdos: 'Seleccionar', responsabilidad: 'Seleccionar', circunstancias: 'Seleccionar', improcedentes: 'Seleccionar'
  });
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({ title: '', options: [], field: '' });
  
  const [sourceVisible, setSourceVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  
  const [reviewVisible, setReviewVisible] = useState(false);
  const [aseguradoExpanded, setAseguradoExpanded] = useState(true);
  const [terceroExpanded, setTerceroExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      await Location.requestForegroundPermissionsAsync();
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  // --- LISTADOS ---
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

  // --- LÓGICA DE CAPTURA CON COMPRESIÓN ---
  const manejarCaptura = async (tipo) => {
    let result;
    const options = { quality: 0.5, allowsEditing: false }; // COMPRESIÓN AL 50%

    if (tipo === 'camara') {
      result = await ImagePicker.launchCameraAsync(options);
    } else if (tipo === 'galeria') {
      result = await ImagePicker.launchImageLibraryAsync(options);
    } else {
      result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    }

    if (!result.canceled) {
      const uri = result.assets ? result.assets[0].uri : result.uri;
      setAttachments([...attachments, { id: Date.now(), uri, label: activeCategory, rotation: 0 }]);
      setSourceVisible(false);
    }
  };

  const enviarReporte = async () => {
    setLoading(true);
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Error", "Configura una cuenta de correo en tu celular.");
        setLoading(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      const mapsUrl = `https://www.google.com/maps?q=${loc.coords.latitude},${loc.coords.longitude}`;
      
      // CONFIGURACIÓN DEL ASUNTO SOLICITADA
      const listaAtencion = datos.atencion.join(' ');
      const asuntoFinal = `${datos.aseguradora} REPORTE ${datos.reporte} SINIESTRO ${datos.siniestro} ${listaAtencion}`;

      await MailComposer.composeAsync({
        recipients: ['tu-correo@ejemplo.com'], // CAMBIA ESTO
        subject: asuntoFinal,
        body: `REPORTE CRASH ASESORES\n\nReporte: ${datos.reporte}\nSiniestro: ${datos.siniestro}\nUbicación: ${mapsUrl}\n\nArchivos enviados: ${attachments.length}`,
        attachments: attachments.map(a => a.uri),
      });
    } catch (e) { Alert.alert("Error", "Falla al enviar correo."); }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}><Text style={styles.headerText}>CRASH ASESORES</Text></View>
      
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => { setModalData({ title: 'ASEGURADORA', options: LISTAS.aseguradora, field: 'aseguradora' }); setModalVisible(true); }}>
            <Text style={styles.label}>ASEGURADORA:</Text><Text style={styles.valAzul}>{datos.aseguradora}</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <Text style={styles.label}>REPORTE:</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              placeholder="0000"
              returnKeyType="next"
              onSubmitEditing={() => refSiniestro.current.focus()}
              onChangeText={(t) => setDatos({...datos, reporte: t})}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>SINIESTRO:</Text>
            <TextInput 
              ref={refSiniestro}
              style={styles.input} 
              keyboardType="numeric" 
              placeholder="0000"
              onChangeText={(t) => setDatos({...datos, siniestro: t})}
            />
          </View>

          <TouchableOpacity style={styles.row} onPress={() => { setModalData({ title: 'ATENCIÓN', options: LISTAS.atencion, field: 'atencion' }); setModalVisible(true); }}>
            <Text style={styles.label}>ATENCIÓN:</Text><Text style={styles.valAzul}>{datos.atencion.length} Selecc.</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btnVerde} onPress={() => setAseguradoExpanded(!aseguradoExpanded)}>
          <Text style={styles.btnT}>FOTOS ASEGURADO</Text><Text style={{color:'white'}}>{aseguradoExpanded?'▲':'▼'}</Text>
        </TouchableOpacity>
        {aseguradoExpanded && SUB_CATEGORIAS.asegurado.map((item, i) => (
          <View key={i} style={styles.photoItem}>
            <Text style={styles.pText}>{item}</Text>
            <View style={{flexDirection:'row'}}>
              {attachments.filter(a=>a.label===item).length > 0 && <View style={styles.badge}><Text style={styles.bText}>{attachments.filter(a=>a.label===item).length}</Text></View>}
              <TouchableOpacity onPress={() => { setActiveCategory(item); setSourceVisible(true); }}><Text style={{fontSize:24, marginLeft:10}}>📷</Text></TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity style={[styles.btnAzul, {marginTop:10}]} onPress={() => setTerceroExpanded(!terceroExpanded)}>
          <Text style={styles.btnT}>FOTOS TERCERO</Text><Text style={{color:'white'}}>{terceroExpanded?'▲':'▼'}</Text>
        </TouchableOpacity>
        {terceroExpanded && SUB_CATEGORIAS.tercero.map((item, i) => (
          <View key={i} style={styles.photoItem}>
            <Text style={styles.pText}>{item}</Text>
            <TouchableOpacity onPress={() => { setActiveCategory(item); setSourceVisible(true); }}><Text style={{fontSize:24}}>📷</Text></TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.btnAmarillo} onPress={enviarReporte} disabled={loading}>
          {loading ? <ActivityIndicator color="#003366"/> : <Text style={styles.btnTEn}>📧 ENVIAR REPORTE COMPLETO</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* SELECTOR DE ORIGEN */}
      <Modal visible={sourceVisible} transparent={true} animationType="fade">
        <View style={styles.mFondo}>
          <View style={styles.mCont}>
            <Text style={styles.mTit}>Origen de archivo: {activeCategory}</Text>
            <TouchableOpacity style={styles.sBtn} onPress={() => manejarCaptura('camara')}><Text>📷 Tomar Foto</Text></TouchableOpacity>
            <TouchableOpacity style={styles.sBtn} onPress={() => manejarCaptura('galeria')}><Text>🖼️ De Galería</Text></TouchableOpacity>
            <TouchableOpacity style={styles.sBtn} onPress={() => manejarCaptura('drive')}><Text>📁 De Drive / Archivos</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.sBtn, {backgroundColor:'#f8f8f8'}]} onPress={() => setSourceVisible(false)}><Text style={{color:'red'}}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SELECTORES DE LISTAS */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.mFondo}>
          <View style={styles.mCont}>
            <Text style={styles.mTit}>{modalData.title}</Text>
            <FlatList data={modalData.options} renderItem={({item}) => (
              <TouchableOpacity style={styles.item} onPress={() => {
                if(modalData.field === 'atencion'){
                  const n = datos.atencion.includes(item) ? datos.atencion.filter(x=>x!==item) : [...datos.atencion, item];
                  setDatos({...datos, atencion: n});
                } else { setDatos({...datos, [modalData.field]: item}); setModalVisible(false); }
              }}>
                <Text>{item} {datos.atencion.includes(item)?'✅':''}</Text>
              </TouchableOpacity>
            )} />
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.close}><Text style={{color:'white'}}>CERRAR</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { backgroundColor: '#003366', paddingTop: 50, paddingBottom: 15, alignItems: 'center' },
  headerText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  scroll: { padding: 15 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 10, elevation: 4, marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  label: { color: '#666', fontWeight: 'bold', fontSize: 11 },
  valAzul: { color: '#003366', fontWeight: 'bold' },
  input: { color: '#003366', fontWeight: 'bold', textAlign: 'right', width: 120 },
  btnVerde: { backgroundColor: '#2d6a2d', padding: 15, borderRadius: 10, flexDirection:'row', justifyContent:'space-between' },
  btnAzul: { backgroundColor: '#003366', padding: 15, borderRadius: 10, flexDirection:'row', justifyContent:'space-between' },
  photoItem: { backgroundColor:'white', padding:12, borderBottomWidth:1, borderBottomColor:'#eee', flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  pText: { fontSize:12, color:'#444' },
  badge: { backgroundColor:'#4CD964', borderRadius:10, paddingHorizontal:6 },
  btnAmarillo: { backgroundColor:'#ffcc00', padding:18, borderRadius:12, marginTop:20, alignItems:'center', elevation:3 },
  btnT: { color:'white', fontWeight:'bold' },
  btnTEn: { color:'#003366', fontWeight:'bold', fontSize:16 },
  mFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
  mCont: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '80%' },
  mTit: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color:'#003366' },
  sBtn: { padding:18, borderBottomWidth:1, borderBottomColor:'#eee', alignItems:'center' },
  item: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  close: { backgroundColor: '#003366', padding: 15, borderRadius: 10, marginTop: 10, alignItems: 'center' }
});
