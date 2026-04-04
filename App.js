import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import * as Camera from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MailComposer from 'expo-mail-composer';

export default function App() {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      await Location.requestForegroundPermissionsAsync();
      await Camera.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
    if (!result.canceled) {
      setAttachments([...attachments, result.assets[0].uri]);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, quality: 0.7 });
    if (!result.canceled) {
      setAttachments([...attachments, result.assets[0].uri]);
    }
  };

  const pickDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
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
          recipients: ['tu-correo@ejemplo.com'], // CAMBIA ESTO POR TU CORREO
          subject: 'Reporte Completo - App Crash',
          body: `Ubicación del reporte:\n${mapsUrl}\n\nSe adjuntan ${attachments.length} archivos (Fotos/Documentos).`,
          attachments: attachments,
        });
      } else {
        Alert.alert("Error", "No hay una app de correo configurada en este celular.");
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo obtener la ubicación o enviar el correo.");
    }
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sistema de Reportes</Text>
      
      <TouchableOpacity style={styles.btn} onPress={takePhoto}>
        <Text style={styles.btnText}>📸 Tomar Foto</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn} onPress={pickImage}>
        <Text style={styles.btnText}>🖼️ Abrir Galería</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn} onPress={pickDocument}>
        <Text style={styles.btnText}>📁 Adjuntar Archivo / Drive</Text>
      </TouchableOpacity>

      <View style={styles.counter}>
        <Text style={styles.counterText}>Archivos listos: {attachments.length}</Text>
        {attachments.length > 0 && (
          <TouchableOpacity onPress={() => setAttachments([])}>
            <Text style={{color: 'red', marginTop: 10}}>🗑️ Borrar lista</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.btn, styles.sendBtn, loading && {opacity: 0.5}]} 
        onPress={sendEmail}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>📩 ENVIAR TODO</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 40, color: '#333' },
  btn: { backgroundColor: '#4A90E2', padding: 18, borderRadius: 12, width: '100%', marginBottom: 15, alignItems: 'center', elevation: 3 },
  sendBtn: { backgroundColor: '#28A745', marginTop: 30 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  counter: { marginVertical: 20, alignItems: 'center' },
  counterText: { fontSize: 16, color: '#666' }
});
