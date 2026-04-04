import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, StatusBar } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as MailComposer from 'expo-mail-composer';

export default function App() {
  // Campos de Texto
  const [aseguradora, setAseguradora] = useState('');
  const [reporte, setReporte] = useState('');
  const [siniestro, setSiniestro] = useState('');
  const [atencion, setAtencion] = useState('');
  const [acuerdos, setAcuerdos] = useState('');
  const [responsabilidad, setResponsabilidad] = useState('');
  const [circunstancias, setCircunstancias] = useState('');
  const [improcedentes, setImprocedentes] = useState('');

  // Manejo de fotos y carga
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      await Location.requestForegroundPermissionsAsync();
      await ImagePicker.requestCameraPermissionsAsync();
    })();
  }, []);

  const takePhoto = async (label) => {
    let result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled) {
      setAttachments([...attachments, { uri: result.assets[0].uri, label: label }]);
    }
  };

  const sendEmail = async () => {
    if (!reporte || !siniestro) {
      Alert.alert("Atención", "Por favor completa el número de reporte y siniestro.");
      return;
    }

    setLoading(true);
    try {
      let loc = await Location.getCurrentPositionAsync({});
      const mapsUrl = `https://www.google.com/maps?q=${loc.coords.latitude},${loc.coords.longitude}`;

      const isAvailable = await MailComposer.isAvailableAsync();
      if (isAvailable) {
        await MailComposer.composeAsync({
          recipients: ['tu-correo@ejemplo.com'], // CAMBIA ESTO
          subject: `REPORTE: ${reporte} - ${aseguradora}`,
          body: `DETALLES DEL SINIESTRO\n\n` +
                `ASEGURADORA: ${aseguradora}\n` +
                `REPORTE: ${reporte}\n` +
                `SINIESTRO: ${siniestro}\n` +
                `ATENCIÓN: ${atencion}\n` +
                `ACUERDOS: ${acuerdos}\n` +
                `RESPONSABILIDAD: ${responsabilidad}\n` +
                `CIRCUNSTANCIAS: ${circunstancias}\n` +
                `IMPROCEDENTES: ${improcedentes}\n\n` +
                `UBICACIÓN: ${mapsUrl}\n\n` +
                `Total de fotos adjuntas: ${attachments.length}`,
          attachments: attachments.map(a => a.uri),
        });
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo preparar el envío.");
    }
    setLoading(false);
  };

  const PhotoRow = ({ label }) => {
    const count = attachments.filter(a => a.label === label).length;
    return (
      <TouchableOpacity style={styles.photoRow} onPress={() => takePhoto(label)}>
        <Text style={styles.photoLabel}>{label}</Text>
        <View style={styles.photoRight}>
          {count > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{count}</Text></View>}
          <Text style={{fontSize: 18, marginLeft: 10}}>👁️</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.main}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}><Text style={styles.headerTitle}>CRASH ASESORES</Text></View>
      
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.inputRow}><Text style={styles.label}>ASEGURADORA:</Text><TextInput style={styles.input} value={aseguradora} onChangeText={setAseguradora} placeholder="Seleccionar" /></View>
          <View style={styles.inputRow}><Text style={styles.label}>REPORTE:</Text><TextInput style={styles.input} value={reporte} onChangeText={setReporte} keyboardType="numeric" placeholder="0000" /></View>
          <View style={styles.inputRow}><Text style={styles.label}>SINIESTRO:</Text><TextInput style={styles.input} value={siniestro} onChangeText={setSiniestro} keyboardType="numeric" placeholder="0000" /></View>
          <View style={styles.inputRow}><Text style={styles.label}>ATENCIÓN:</Text><TextInput style={styles.input} value={atencion} onChangeText={setAtencion} placeholder="0 Selecc." /></View>
          <View style={styles.inputRow}><Text style={styles.label}>ACUERDOS:</Text><TextInput style={styles.input} value={acuerdos} onChangeText={setAcuerdos} placeholder="Seleccionar" /></View>
          <View style={styles.inputRow}><Text style={styles.label}>RESPONSABILIDAD:</Text><TextInput style={styles.input} value={responsabilidad} onChangeText={setResponsabilidad} placeholder="Seleccionar" /></View>
          <View style={styles.inputRow}><Text style={styles.label}>CIRCUNSTANCIAS:</Text><TextInput style={styles.input} value={circunstancias} onChangeText={setCircunstancias} placeholder="Seleccionar" /></View>
          <View style={styles.inputRow}><Text style={styles.label}>IMPROCEDENTES:</Text><TextInput style={styles.input} value={improcedentes} onChangeText={setImprocedentes} placeholder="Seleccionar" /></View>
        </View>

        <View style={styles.greenHeader}><Text style={styles.greenText}>FOTOS ASEGURADO</Text></View>
        <View style={styles.photoCard}>
          <PhotoRow label="MÉTODO DE CRONOS" />
          <PhotoRow label="DAÑOS" />
          <PhotoRow label="DUA ANVERSO" />
          <PhotoRow label="DUA REVERSO" />
          <PhotoRow label="PLACAS" />
          <PhotoRow label="NÚMERO DE SERIE" />
          <PhotoRow label="ODÓMETRO" />
        </View>

        <TouchableOpacity style={styles.sendBtn} onPress={sendEmail} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>📩 ENVIAR REPORTE</Text>}
        </TouchableOpacity>
        
        {attachments.length > 0 && (
          <TouchableOpacity onPress={() => setAttachments([])} style={{marginTop: 15}}>
            <Text style={{color: 'red', textAlign: 'center'}}>Limpiar todas las fotos</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: '#f2f2f2' },
  header: { backgroundColor: '#003366', paddingVertical: 20, paddingTop: 50, alignItems: 'center' },
  headerTitle: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  scroll: { padding: 15 },
  card: { backgroundColor: 'white', borderRadius: 10, padding: 10, elevation: 4, marginBottom: 20 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  label: { color: '#666', fontWeight: 'bold', fontSize: 13, flex: 1 },
  input: { color: '#003366', fontWeight: 'bold', textAlign: 'right', flex: 1 },
  greenHeader: { backgroundColor: '#2d6a2d', padding: 12, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  greenText: { color: 'white', fontWeight: 'bold' },
  photoCard: { backgroundColor: 'white', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, paddingHorizontal: 15, elevation: 2 },
  photoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  photoLabel: { fontSize: 14, color: '#333', fontWeight: '500' },
  photoRight: { flexDirection: 'row', alignItems: 'center' },
  badge: { backgroundColor: '#4CD964', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  sendBtn: { backgroundColor: '#003366', padding: 18, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  sendText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
