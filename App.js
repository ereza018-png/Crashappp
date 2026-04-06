import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, Modal, FlatList, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system';

// --- PALETA DE COLORES ---
const THEME = {
  primary: '#003366', // Azul oscuro corporativo
  secondary: '#0066CC', // Azul más claro para elementos activos
  accent: '#FFCC00', // Dorado para el botón principal
  bg: '#FFF',
  bgGray: '#FAFAFA',
  border: '#CCC',
  text: 'black',
  textLight: '#888',
  white: 'white'
};

const LISTAS = {
  aseguradoras: ["HDI", "EL ÁGUILA", "GEN DE SEG", "ALLIANZ", "ANA SEGUROS", "CHUBB", "ZURICH", "MOMENTO", "OTRA"],
  atencion: ["COMPLEMENTARIA", "SIN PÓLIZA", "DIVERSOS", "KM", "PEAJE"],
  acuerdos: ["COBRO SIPAC", "COBRO COPAC", "RECUPERACIÓN EFECTIVO", "RECUPERACIÓN TDD", "RECUPERACIÓN GOA", "RECUPERACIÓN MODULO", "COSTO ASEGURADO", "CRISTAL", "SEGURO DE RINES Y LLANTAS", "ROBO PARCIAL", "ROBO TOTAL", "JURÍDICO", "PLAN PISO", "CASH FLOW", "INVESTIGACIÓN", "COMPLEMENTO", "PAGO SIPAC", "PAGO COPAC", "COSTO TERCERO", "PAGO UMAS Y DEDUCIBLES", "S/C ARREGLO ENTRE PARTICULARES", "S/C MENOR AL DEDUCIBLE", "IMPROCEDENTE", "S/C SIN PÓLIZA", "RECHAZO", "NO LOCALIZADO", "DIVERSOS", "CANCELADO 10 < NO FACTURAR"],
  responsabilidad: ["ASEGURADO", "TERCERO", "CORRESPONSABILIDAD"],
  circunstancias: ["ALCANCE", "PASADA DE ALTO", "INVASIÓN DE CARRIL", "REVERSA", "ESTACIONADO", "CAMBIO DE CARRIL", "SENTIDO CONTRARIO", "OTRO"]
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
  const [loading, setLoading] = useState(false);
  const refSiniestro = useRef(); 

  const [datos, setDatos] = useState({
    aseguradora: '', reporte: '', siniestro: '', atencion: [], acuerdo: '', 
    responsabilidad: '', circunstancias: ''
  });
  const [attachments, setAttachments] = useState([]);
  const [modalVisible, setModalVisible] = useState({ visible: false, tipo: '', datos: [] });
  const [searchText, setSearchText] = useState(''); // Estado para el buscador

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
      const config = res.ok ? await res.json() : null;
      const pLocal = await AsyncStorage.getItem('@perfil');
      if (config && pLocal) {
        const p = JSON.parse(pLocal);
        if (config.usuarios_autorizados.find(u => u.id === p.id)) {
          setPerfil(p); setAutorizado(true);
        }
      }
    } catch (e) { console.log("Error de conexión", e); }
  };

  const login = async () => {
    setLoading(true);
    try {
      const res = await fetch(URL_ACCESO);
      const config = await res.json();
      const user = config.usuarios_autorizados.find(u => u.id === inputID.trim().toUpperCase());
      if (user) {
        await AsyncStorage.setItem('@perfil', JSON.stringify(user));
        setPerfil(user); setAutorizado(true);
      } else { Alert.alert("Error", "ID No Autorizado"); }
    } catch (e) { Alert.alert("Error", "Sin Conexión"); }
    setLoading(false);
  };

  const abrirSelector = (tipo, lista) => {
    setSearchText(''); // Limpiamos el buscador al abrir
    setModalVisible({ visible: true, tipo, datos: lista });
  };

  const seleccionarOpcion = (item) => {
    const { tipo } = modalVisible;
    if (tipo === 'atencion') {
      let at = [...datos.atencion];
      at.includes(item) ? at = at.filter(x => x !== item) : at.push(item);
      setDatos({ ...datos, atencion: at });
    } else {
      setDatos({ ...datos, [tipo]: item });
      setModalVisible({ visible: false, tipo: '', datos: [] });
    }
  };

  const manejarImagen = async (tipo, cat) => {
    const opciones = { quality: 0.3 };
    const res = tipo === 'camara' ? await ImagePicker.launchCameraAsync(opciones) : await ImagePicker.launchImageLibraryAsync(opciones);
    if (!res.canceled) {
      const hoy = new Date();
      const fecha = `${hoy.getDate()}-${hoy.getMonth() + 1}-${hoy.getFullYear()}_${hoy.getHours()}${hoy.getMinutes()}`;
      const aseg = datos.aseguradora ? datos.aseguradora : 'SIN_ASEGURADORA';
      const rep = datos.reporte ? datos.reporte : 'SIN_REPORTE';
      const nombreFinal = `${aseg}_REP_${rep}_${cat}_${fecha}.jpg`.replace(/\s+/g, '_').toUpperCase();
      const destino = RUTA_RESPALDO + nombreFinal;
      await FileSystem.copyAsync({ from: res.assets[0].uri, to: destino });
      setAttachments([...attachments, { uri: destino, label: cat }]);
    }
  };

  const enviarReporte = async () => {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) return Alert.alert("Error", "No tienes una App de correo configurada en el celular.");
    if (!datos.aseguradora || !datos.reporte || !datos.siniestro) return Alert.alert("Faltan Datos", "Llena Aseguradora, Reporte y Siniestro.");
    
    const asunto = `${datos.aseguradora} reporte ${datos.reporte} siniestro ${datos.siniestro} atencion ${datos.atencion.join(' ')}`.toUpperCase();
    const ordenadas = [...attachments].sort((a, b) => ORDEN_FOTOS.indexOf(a.label) - ORDEN_FOTOS.indexOf(b.label));

    try {
      await MailComposer.composeAsync({
        recipients: ['reportes@crashasesores.com'],
        subject: asunto,
        body: `REPORTE: ${perfil.nombre}\n\nAcuerdo: ${datos.acuerdo}\nResponsabilidad: ${datos.responsabilidad}\nCircunstancias: ${datos.circunstancias}`,
        attachments: ordenadas.map(f => f.uri)
      });
    } catch (e) {
      Alert.alert("Error", "No se pudo abrir la aplicación de correo.");
    }
  };

  // --- RENDERIZADO DE COMPONENTES REUTILIZABLES ---
  const renderDropdown = (label, value, tipo, lista) => (
    <View style={styles.dropdownContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => abrirSelector(tipo, lista)}>
        <Text style={value ? styles.dropText : styles.dropTextPlaceholder}>
          {value || `Seleccionar ${label.toLowerCase()}...`}
        </Text>
        <Text style={styles.dropIcon}>▼</Text> 
      </TouchableOpacity>
    </View>
  );

  if (!autorizado) return (
    <View style={styles.loginPage}>
      <Text style={styles.loginTitle}>CRASH ASESORES</Text>
      <TextInput style={styles.loginInput} placeholder="ID AJUSTADOR" value={inputID} onChangeText={setInputID} keyboardType="numeric" />
      {loading ? <ActivityIndicator size="large" color="#FFCC00" style={{marginTop:20}} /> : <TouchableOpacity style={styles.loginBtn} onPress={login}><Text style={{fontWeight:'bold'}}>ENTRAR</Text></TouchableOpacity>}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={{ color: THEME.white, fontWeight: 'bold' }}>{perfil.nombre}</Text>
        <TouchableOpacity onPress={() => setAutorizado(false)}><Text style={{ color: 'red', fontWeight:'bold' }}>SALIR</Text></TouchableOpacity>
      </View>

      <ScrollView style={{ padding: 20 }}>
        <Text style={styles.sectionT}>DATOS PRINCIPALES</Text>
        {renderDropdown('ASEGURADORA', datos.aseguradora, 'aseguradora', LISTAS.aseguradoras)}

        <Text style={styles.label}>NÚMERO DE REPORTE</Text>
        <TextInput style={styles.input} keyboardType="numeric" returnKeyType="next" onSubmitEditing={() => refSiniestro.current.focus()} onChangeText={v => setDatos({ ...datos, reporte: v })} />

        <Text style={styles.label}>NÚMERO DE SINIESTRO</Text>
        <TextInput ref={refSiniestro} style={styles.input} keyboardType="numeric" onChangeText={v => setDatos({ ...datos, siniestro: v })} />

        <Text style={styles.sectionT}>INFORMACIÓN ADICIONAL</Text>
        {renderDropdown('ATENCIÓN (Checklist Múltiple)', datos.atencion.length > 0 ? datos.atencion.join(', ') : '', 'atencion', LISTAS.atencion)}
        {renderDropdown('ACUERDO', datos.acuerdo, 'acuerdo', LISTAS.acuerdos)}
        {renderDropdown('RESPONSABILIDAD', datos.responsabilidad, 'responsabilidad', LISTAS.responsabilidad)}
        {renderDropdown('CIRCUNSTANCIAS', datos.circunstancias, 'circunstancias', LISTAS.circunstancias)}

        <Text style={styles.sectionT}>FOTOGRAFÍAS ORDENADAS</Text>
        {ORDEN_FOTOS.map(cat => (
          <View key={cat} style={styles.catRow}>
            <Text style={{ fontSize: 10, width: '48%' }}>{cat}</Text>
            <View style={{flexDirection:'row'}}>
              <TouchableOpacity onPress={() => manejarImagen('camara', cat)} style={styles.btnCam}><Text>📷</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => manejarImagen('galeria', cat)} style={styles.btnCam}><Text>🖼️</Text></TouchableOpacity>
            </View>
            <Text style={{ fontSize:14, color: THEME.secondary, fontWeight: 'bold' }}>{attachments.filter(a => a.label === cat).length || ""}</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.btnEnviar} onPress={enviarReporte}><Text style={{ fontWeight: 'bold', color: THEME.primary }}>ENVIAR REPORTE</Text></TouchableOpacity>
        <View style={{height: 100}} />
      </ScrollView>

      {/* --- MODAL PARA BUSCADOR Y LISTA (DISEÑO PREMIUM) --- */}
      <Modal visible={modalVisible.visible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCont}>
            <Text style={styles.modalTitle}>Seleccione {modalVisible.tipo}</Text>
            
            {/* 🔍 BARRA DE BÚSQUEDA INTEGRADA DENTRO DEL MODAL */}
            <View style={styles.modalSearchContainer}>
              <Text style={styles.modalSearchIcon}>🔍</Text>
              <TextInput 
                style={styles.modalSearchInput}
                placeholder="Buscar..."
                value={searchText}
                onChangeText={setSearchText}
                autoFocus={true}
              />
            </View>

            {/* LISTA FILTRADA EN TIEMPO REAL */}
            <FlatList
              data={modalVisible.datos.filter(item => item.toUpperCase().includes(searchText.toUpperCase()))}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.item, datos.atencion.includes(item) && {backgroundColor:'#E0F7FA'}, datos.aseguradora === item && {backgroundColor:'#EEE'}, datos.acuerdo === item && {backgroundColor:'#EEE'}]} onPress={() => seleccionarOpcion(item)}>
                  <Text>{item} {datos.atencion.includes(item) || datos.aseguradora === item || datos.acuerdo === item ? "✅" : ""}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.btnClose} onPress={() => setModalVisible({ visible: false, tipo: '', datos: [] })}>
              <Text style={{ color: THEME.white, fontWeight:'bold' }}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  header: { backgroundColor: THEME.primary, paddingTop: 50, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionT: { fontWeight: 'bold', color: THEME.primary, marginTop: 25, fontSize: 13, borderBottomWidth: 1.5, borderColor: '#EEE', paddingBottom: 5 },
  dropdownContainer: { marginTop: 15 },
  label: { fontWeight: 'bold', color: THEME.primary, marginBottom: 5 },
  input: { borderBottomWidth: 1.5, borderColor: THEME.primary, padding: 8, marginBottom: 5, fontSize: 16 },
  
  // Estilo de los nuevos botones de despliegue
  pickerBtn: { padding: 15, borderWidth: 1, borderColor: THEME.border, borderRadius: 8, marginTop: 5, backgroundColor: THEME.bgGray, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropText: { fontSize: 15 },
  dropTextPlaceholder: { fontSize: 15, color: THEME.textLight },
  dropIcon: { fontSize: 12, color: THEME.textLight },

  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderColor: '#EEE' },
  btnCam: { padding: 10, backgroundColor: '#F0F0F0', borderRadius: 8, marginLeft: 5 },
  btnEnviar: { backgroundColor: THEME.accent, padding: 22, borderRadius: 15, alignItems: 'center', marginTop: 30, marginBottom: 50 },
  
  // --- ESTILOS DEL MODAL DE BÚSQUEDA ---
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modalCont: { backgroundColor: THEME.white, margin: 20, borderRadius: 12, padding: 20, maxHeight: '85%', shadowColor: THEME.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 10 },
  modalTitle: { fontWeight: 'bold', fontSize: 20, marginBottom: 20, textAlign: 'center', color: THEME.primary },
  
  // Barra de búsqueda dentro del modal
  modalSearchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: THEME.border, borderRadius: 8, backgroundColor: THEME.bgGray, marginBottom: 15, paddingHorizontal: 15 },
  modalSearchIcon: { fontSize: 16, color: THEME.textLight, marginRight: 10 },
  modalSearchInput: { flex: 1, padding: 12, fontSize: 16 },

  item: { padding: 18, borderBottomWidth: 1, borderColor: '#EEE' },
  btnClose: { backgroundColor: THEME.primary, padding: 18, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  loginPage: { flex: 1, backgroundColor: THEME.primary, justifyContent: 'center', alignItems: 'center' },
  loginTitle: { color: THEME.white, fontSize: 28, fontWeight: 'bold', marginBottom: 30 },
  loginInput: { backgroundColor: THEME.white, width: '85%', padding: 18, borderRadius: 12, textAlign: 'center', fontSize: 20, marginBottom: 10 },
  loginBtn: { backgroundColor: THEME.accent, padding: 18, borderRadius: 12, marginTop: 10, width: '85%', alignItems: 'center' }
});
