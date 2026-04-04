import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MailComposer from 'expo-mail-composer';

export default function App() {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      await Location.requestForegroundPermissionsAsync();
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled) {
      setAttachments([...attachments, result.assets[0].uri]);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (!result.canceled) {
      setAttachments([...attachments, result.assets[0].uri]);
    }
  };

  const pickDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (!result.canceled) {
      setAttachments([...attachments, result.assets[0].uri]);
    }
  };

  const sendEmail = async () => {
    setLoading(true);
    try {
      let loc = await Location.getCurrentPositionAsync({});
      const mapsUrl = `https://www.google.com/maps?q=${loc.coords.latitude},${loc.coords.longitude}`;

      const isAvailable = await MailComposer.isAvailableAsync();
      if (isAvailable) {
        await MailComposer.composeAsync({
          recipients: ['tu-correo@ejemplo.com'], // CAMBIA ESTO
          subject: 'Reporte App Crash - Datos Completos',
          body: `Ubicación:\n${mapsUrl}\n\nArchivos adjuntos: ${attachments.length}`,
          attachments: attachments,
        });
      } else {
        Alert.alert("Error", "Configura una app de correo (Gmail/Outlook)");
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo procesar el envío");
    }
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sistema de Reportes</Text>
      <TouchableOpacity style={styles.btn} onPress={takePhoto}><Text style={styles.txt}>📸 Cámara</Text></TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={pickImage}><Text style={styles.txt}>🖼️ Galería</Text></TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={pickDocument}><Text style={styles.txt}>📁 Archivos / Drive</Text></TouchableOpacity>
      <View style={{marginVertical: 20}}><Text>Adjuntos: {attachments.length}</Text></View>
      <TouchableOpacity style={[styles.btn, styles.send, loading && {opacity: 0.5}]} onPress={sendEmail} disabled={loading}>
        {loading ? <ActivityIndicator color="white"/> : <Text style={styles.txt}>📩 ENVIAR REPORTE</Text>}
      </TouchableOpacity>
      {attachments.length > 0 && <TouchableOpacity onPress={() => setAttachments([])}><Text style={{color:'red', marginTop:20}}>Limpiar todo</Text></TouchableOpacity>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
  btn: { backgroundColor: '#007AFF', padding: 18, borderRadius: 10, width: '100%', marginBottom: 15, alignItems: 'center' },
  send: { backgroundColor: '#28A745', marginTop: 10 },
  txt: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
  
