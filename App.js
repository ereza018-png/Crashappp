import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal, FlatList, BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system';

// --- 📋 LISTADOS ---
const ASEGURADORAS = ["GNP", "AXA", "QUÁLITAS", "CHUBB", "HDI", "GENERAL DE SEGUROS", "MAPFRE", "OTRA"];
const LISTA_ATENCION = ["PRESENCIAL", "TELEFÓNICA", "REMOTA"];
const LISTA_ACUERDOS = ["CONVENIO", "PASE MÉDICO", "REPARACIÓN", "PAGO DAÑOS"];
const LISTA_RESPONSABILIDAD = ["CLIENTE", "TERCERO", "50/50", "POR DETERMINAR"];
const LISTA_CIRCUNSTANCIAS = ["CRUCERO", "ALCANCE", "ESTACIONADO", "INVASIÓN CARRIL"];
const LISTA_IMPROCEDENTES = ["NO", "POR ALCOHOL", "FALTA DOCUMENTOS", "FUERA DE COBERTURA"];
const ORDEN_FOTOS = ["DUA ANVERSO", "DUA REVERSO", "ENCUESTA", "VOLANTES", "SERIE", "ODÓMETRO", "LICENCIA", "TARJETA", "IDENTIFICACIONES", "DAÑOS", "MÉTODO CRONOS", "TERCERO"];

const URL_ACCESO = "https://raw.githubusercontent.com/ereza018-png/Crashappp/main/acceso.json";

export default function App() {
  const [loadingSeg, setLoadingSeg] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [perfil, setPerfil] = useState({ id: "", nombre: "" });
  const [inputID, setInputID] = useState("");
  const [datos, setDatos] = useState({ aseguradora: 'Seleccionar', reporte: '', siniestro: '', atencion: 'Seleccionar', acuerdos: 'Seleccionar', responsabilidad: 'Seleccionar', circunstancias: 'Seleccionar', improcedentes: 'Seleccionar' });
  const [attachments, setAttachments] = useState([]);
  const [modalList, setModalList] = useState({ visible: false, data: [], campo: '' });

  useEffect(() => { 
    (async () => {
      await Location.requestForegroundPermissionsAsync();
      await ImagePicker.requestCameraPermissionsAsync();
      checarAcceso();
    })();
  }, []);

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
    } catch (e) { console.log("Offline"); }
    setLoadingSeg(false);
  };

  const login = async () => {
    if (!inputID) return Alert.alert("Aviso", "Escribe tu ID");
    setLoadingSeg(true);
    try {
      const res = await fetch(URL_ACCESO + '?t=' + new Date().getTime());
      const config = await res.json();
      const user = config.usuarios_autorizados.find(u => u.id === inputID.toUpperCase().trim());
      if (user) {
        await AsyncStorage.setItem('@perfil', JSON.stringify(user));
        setPerfil(user); setAutorizado(true);
      } else { Alert.alert("Error", "ID no autorizado."); }
    } catch (e) { Alert.alert("Error", "Sin conexión."); }
    setLoadingSeg(false);
  };

  const tomarFoto = async (categoria) => {
    try {
      let result = await ImagePicker.launchCameraAsync({ quality: 0.4 });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const destino = FileSystem.cacheDirectory + `${categoria}.jpg`;
        await FileSystem.copyAsync({ from: uri, to: destino });
        setAttachments([...attachments, { uri: destino, label: categoria }]);
      }
    } catch (e) { Alert.alert("Error", "Cámara falló."); }
  };

  const enviarReporte = async () => {
    if (datos.aseguradora === 'Seleccionar' || !datos.reporte) return Alert.alert("Error", "Faltan datos.");
    const loc = await Location.getCurrentPositionAsync({});
    const maps = `https://www.google.com/maps?q=${loc.coords.latitude},${loc.coords.longitude}`;
    
    await MailComposer.composeAsync({
      recipients: ['tu-correo@ejemplo.com'], // CAMBIA ESTO
      subject: `REPORTE: ${datos.aseguradora} - ${datos.reporte}`,
      body: `AJUSTADOR: ${perfil.nombre}\nASEGURADORA: ${datos.aseguradora}\nREPORTE: ${datos.reporte}\nUBICACIÓN: ${maps}`,
      attachments: attachments.map(a => a.uri)
    });
  };

  if (loadingSeg) return <View style={styles.centrado}><ActivityIndicator size="large" color="#003366" /></View>;
  if (!autorizado) return (
    <View style={styles.bloqueo}>
      <Text style={styles.loginTit}>CRASH ASESORES</Text>
      <TextInput style={styles.inputLogin} placeholder="ID AJUSTADOR" value={inputID} onChangeText={setInputID} autoCapitalize="characters" />
      <TouchableOpacity style={styles.btnLog} onPress={login}><Text style={{fontWeight:'bold'}}>ENTRAR</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.userT}>{perfil.nombre}</Text><TouchableOpacity onPress={async () => { await AsyncStorage.clear(); BackHandler.exitApp(); }}><Text style={{color:'red'}}>SALIR</Text></TouchableOpacity></View>
      <ScrollView contentContainerStyle={{padding: 20}}>
        <Text style={styles.label}>Aseguradora:</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setModalList({visible:true, data:ASEGURADORAS, campo:'aseguradora'})}><Text>{datos.aseguradora}</Text></TouchableOpacity>
        
        <Text style={styles.label}>No. Reporte:</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={datos.reporte} onChangeText={(t)=>setDatos({...datos, reporte:t})} />
        
        <Text style={styles.label}>No. Siniestro:</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={datos.siniestro} onChangeText={(t)=>setDatos({...datos, siniestro:t})} />

        <Text style={styles.label}>Atención:</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setModalList({visible:true, data:LISTA_ATENCION, campo:'atencion'})}><Text>{datos.atencion}</Text></TouchableOpacity>

        <Text style={styles.titSec}>FOTOGRAFÍAS</Text>
        <View style={styles.grid}>
          {ORDEN_FOTOS.map((cat, i) => (
            <TouchableOpacity key={i} style={[styles.btnFoto, attachments.find(a=>a.label===cat) && {backgroundColor:'#c3e6cb'}]} onPress={() => tomarFoto(cat)}>
              <Text style={{fontSize:9, fontWeight:'bold'}}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.btnEnviar} onPress={enviarReporte}><Text style={{color:'white', fontWeight:'bold'}}>ENVIAR TODO</Text></TouchableOpacity>
      </ScrollView>

      <Modal visible={modalList.visible} transparent animationType="fade">
        <View style={styles.modalC}><View style={styles.modalI}>
          <FlatList data={modalList.data} renderItem={({item})=>(
            <TouchableOpacity style={styles.item} onPress={()=>{setDatos({...datos, [modalList.campo]:item}); setModalList({visible:false, data:[], campo:''})}}><Text>{item}</Text></TouchableOpacity>
          )} />
          <TouchableOpacity onPress={()=>setModalList({visible:false, data:[], campo:''})}><Text style={{color:'red', textAlign:'center', marginTop:10}}>CERRAR</Text></TouchableOpacity>
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
  inputLogin: { backgroundColor: 'white', width: '80%', padding: 15, borderRadius: 10, textAlign: 'center' },
  btnLog: { backgroundColor: '#ffcc00', padding: 15, borderRadius: 10, marginTop: 20, width: '80%', alignItems: 'center' },
  header: { backgroundColor: '#003366', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between' },
  userT: { color: 'white', fontWeight: 'bold' },
  label: { fontWeight: 'bold', marginTop: 15 },
  input: { backgroundColor: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  picker: { backgroundColor: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  titSec: { fontSize: 18, fontWeight: 'bold', marginTop: 25, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  btnFoto: { backgroundColor: '#e1e8ee', width: '48%', padding: 15, borderRadius: 10, marginBottom: 10, alignItems: 'center' },
  btnEnviar: { backgroundColor: '#28a745', padding: 20, borderRadius: 15, marginVertical: 30, alignItems: 'center' },
  modalC: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalI: { backgroundColor: 'white', width: '80%', maxHeight: '60%', borderRadius: 15, padding: 20 },
  item: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' }
});
