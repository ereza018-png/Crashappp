import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal, FlatList, BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system';

// --- 📋 CONFIGURACIÓN DE LISTADOS ---
const ASEGURADORAS = ["GNP", "AXA", "QUÁLITAS", "CHUBB", "HDI", "GENERAL DE SEGUROS", "MAPFRE", "OTRA"];
const LISTA_ATENCION = ["PRESENCIAL", "TELEFÓNICA", "REMOTA"];
const LISTA_ACUERDOS = ["CONVENIO", "PASE MÉDICO", "REPARACIÓN", "PAGO DAÑOS"];
const LISTA_RESPONSABILIDAD = ["CLIENTE", "TERCERO", "50/50", "POR DETERMINAR"];
const LISTA_CIRCUNSTANCIAS = ["CRUCERO", "ALCANCE", "ESTACIONADO", "INVASIÓN CARRIL"];
const LISTA_IMPROCEDENTES = ["NO", "POR ALCOHOL", "FALTA DOCUMENTOS", "FUERA DE COBERTURA"];
const ORDEN_FOTOS = ["DUA ANVERSO", "DUA REVERSO", "ENCUESTA", "VOLANTES", "SERIE", "ODÓMETRO", "LICENCIA", "TARJETA", "IDENTIFICACIONES", "DAÑOS", "MÉTODO CRONOS", "TERCERO"];

const URL_ACCESO = "https://raw.githubusercontent.com/ereza018-png/Crashappp/main/acceso.json";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [perfil, setPerfil] = useState({ id: "", nombre: "" });
  const [inputID, setInputID] = useState("");
  const [datos, setDatos] = useState({ aseguradora: 'Seleccionar', reporte: '', siniestro: '', atencion: 'Seleccionar', acuerdos: 'Seleccionar', responsabilidad: 'Seleccionar', circunstancias: 'Seleccionar', improcedentes: 'Seleccionar' });
  const [attachments, setAttachments] = useState([]);
  const [modalList, setModalList] = useState({ visible: false, data: [], campo: '' });

  useEffect(() => { checarAcceso(); }, []);

  const checarAcceso = async () => {
    try {
      const pLocal = await AsyncStorage.getItem('@perfil');
      const res = await fetch(URL_ACCESO + '?t=' + new Date().getTime());
      const config = await res.json();
      if (pLocal) {
        const p = JSON.parse(pLocal);
        const validado = config.usuarios_autorizados.find(u => u.id === p.id);
        if (validado) { setPerfil(validado); setAutorizado(true); }
      }
    } catch (e) { console.log("Offline Mode"); }
    setLoading(false);
  };

  const login = async () => {
    if (!inputID) return Alert.alert("Aviso", "Ingresa tu ID de Ajustador.");
    setLoading(true);
    try {
      const res = await fetch(URL_ACCESO + '?t=' + new Date().getTime());
      const config = await res.json();
      const user = config.usuarios_autorizados.find(u => u.id === inputID.toUpperCase().trim());
      if (user) {
        await AsyncStorage.setItem('@perfil', JSON.stringify(user));
        setPerfil(user); setAutorizado(true);
      } else { Alert.alert("Error", "ID no autorizado en el sistema."); }
    } catch (e) { Alert.alert("Error", "Revisa tu conexión a internet."); }
    setLoading(false);
  };

  const tomarFoto = async (categoria) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert("Error", "Permiso de cámara denegado.");
    
    let result = await ImagePicker.launchCameraAsync({ quality: 0.4, allowsEditing: false });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAttachments([...attachments, { uri, label: categoria }]);
    }
  };

  const enviarReporte = async () => {
    if (datos.aseguradora === 'Seleccionar' || !datos.reporte) return Alert.alert("Faltan datos", "Aseguradora y Reporte son obligatorios.");
    
    let mapsUrl = "No disponible";
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      mapsUrl = `https://www.google.com/maps?q=${loc.coords.latitude},${loc.coords.longitude}`;
    }

    const cuerpo = `REPORTE CRASH ASESORES\n\n` +
      `AJUSTADOR: ${perfil.nombre}\nASEGURADORA: ${datos.aseguradora}\n` +
      `REPORTE: ${datos.reporte}\nSINIESTRO: ${datos.siniestro}\n` +
      `ATENCIÓN: ${datos.atencion}\nRESPONSABILIDAD: ${datos.responsabilidad}\n` +
      `UBICACIÓN: ${mapsUrl}`;

    const mailDisponible = await MailComposer.isAvailableAsync();
    if (!mailDisponible) return Alert.alert("Error", "No hay app de correo configurada.");

    await MailComposer.composeAsync({
      recipients: ['tu-correo-aqui@gmail.com'], // CAMBIA POR TU CORREO
      subject: `REP: ${datos.reporte} - ${datos.aseguradora}`,
      body: cuerpo,
      attachments: attachments.map(a => a.uri)
    });
  };

  if (loading) return <View style={styles.centrado}><ActivityIndicator size="large" color="#003366" /></View>;
  if (!autorizado) return (
    <View style={styles.bloqueo}>
      <Text style={styles.loginTit}>CRASH ASESORES</Text>
      <TextInput style={styles.inputLogin} placeholder="ID AJUSTADOR" value={inputID} onChangeText={setInputID} autoCapitalize="characters" />
      <TouchableOpacity style={styles.btnLog} onPress={login}><Text style={{fontWeight:'bold', color: '#003366'}}>INGRESAR</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.userT}>{perfil.nombre}</Text><TouchableOpacity onPress={async () => { await AsyncStorage.clear(); BackHandler.exitApp(); }}><Text style={{color:'red', fontWeight:'bold'}}>SALIR</Text></TouchableOpacity></View>
      <ScrollView contentContainerStyle={{padding: 20}}>
        
        <Text style={styles.label}>Aseguradora:</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setModalList({visible:true, data:ASEGURADORAS, campo:'aseguradora'})}><Text>{datos.aseguradora}</Text></TouchableOpacity>
        
        <Text style={styles.label}>No. Reporte:</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={datos.reporte} onChangeText={(t)=>setDatos({...datos, reporte:t})} />
        
        <Text style={styles.label}>No. Siniestro:</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={datos.siniestro} onChangeText={(t)=>setDatos({...datos, siniestro:t})} />

        <Text style={styles.label}>Atención:</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setModalList({visible:true, data:LISTA_ATENCION, campo:'atencion'})}><Text>{datos.atencion}</Text></TouchableOpacity>

        <Text style={styles.label}>Responsabilidad:</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setModalList({visible:true, data:LISTA_RESPONSABILIDAD, campo:'responsabilidad'})}><Text>{datos.responsabilidad}</Text></TouchableOpacity>

        <Text style={styles.titSec}>FOTOGRAFÍAS</Text>
        <View style={styles.grid}>
          {ORDEN_FOTOS.map((cat, i) => (
            <TouchableOpacity key={i} style={[styles.btnFoto, attachments.find(a=>a.label===cat) && {backgroundColor:'#c3e6cb'}]} onPress={() => tomarFoto(cat)}>
              <Text style={{fontSize:9, fontWeight:'bold', textAlign: 'center'}}>{cat}</Text>
              {attachments.find(a=>a.label===cat) && <Text>✅</Text>}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.btnEnviar} onPress={enviarReporte}><Text style={{color:'white', fontWeight:'bold'}}>ENVIAR REPORTE</Text></TouchableOpacity>
      </ScrollView>

      <Modal visible={modalList.visible} transparent animationType="slide">
        <View style={styles.modalC}><View style={styles.modalI}>
          <FlatList data={modalList.data} keyExtractor={(item)=>item} renderItem={({item})=>(
            <TouchableOpacity style={styles.item} onPress={()=>{setDatos({...datos, [modalList.campo]:item}); setModalList({visible:false, data:[], campo:''})}}><Text style={{textAlign: 'center'}}>{item}</Text></TouchableOpacity>
          )} />
          <TouchableOpacity onPress={()=>setModalList({visible:false, data:[], campo:''})}><Text style={{color:'red', textAlign:'center', marginTop:15}}>CERRAR</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f6' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bloqueo: { flex: 1, backgroundColor: '#003366', justifyContent: 'center', alignItems: 'center' },
  loginTit: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  inputLogin: { backgroundColor: 'white', width: '80%', padding: 15, borderRadius: 10, textAlign: 'center', fontSize: 18 },
  btnLog: { backgroundColor: '#ffcc00', padding: 15, borderRadius: 10, marginTop: 20, width: '80%', alignItems: 'center' },
  header: { backgroundColor: '#003366', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between' },
  userT: { color: 'white', fontWeight: 'bold' },
  label: { fontWeight: 'bold', marginTop: 15, color: '#333' },
  input: { backgroundColor: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginTop: 5 },
  picker: { backgroundColor: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginTop: 5 },
  titSec: { fontSize: 18, fontWeight: 'bold', marginTop: 30, textAlign: 'center', color: '#003366' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
  btnFoto: { backgroundColor: '#e1e8ee', width: '48%', padding: 15, borderRadius: 10, marginBottom: 10, alignItems: 'center', justifyContent: 'center' },
  btnEnviar: { backgroundColor: '#28a745', padding: 20, borderRadius: 15, marginVertical: 30, alignItems: 'center' },
  modalC: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalI: { backgroundColor: 'white', width: '85%', maxHeight: '70%', borderRadius: 20, padding: 20 },
  item: { padding: 18, borderBottomWidth: 1, borderBottomColor: '#eee' }
});
