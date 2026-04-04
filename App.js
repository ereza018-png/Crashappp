import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import * as Location from 'expo-location';
import * as Camera from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MailComposer from 'expo-mail-composer';

export default function App() {
  const [location, setLocation] = useState(null);
  const [attachments, setAttachments] = useState([]);

  // Pedir permisos al iniciar
  useEffect(() => {
    (async () => {
      await Location.requestForegroundPermissionsAsync();
      await Camera.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  // Función para Tomar Foto
  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5 });
    if (!result.canceled) {
      setAttachments([...attachments, result.assets[0].uri]);
    }
  };

  // Función para Galería
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.5 });
    if (!result.canceled) {
      setAttachments([...attachments, result.assets[0].uri]);
    }
  };

  // Función para Archivos (y Drive)
  const pickDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (!result.canceled) {
      setAttachments([...attachments, result.assets[0].uri]);
    }
  };

  // Función Enviar Todo
  const sendEmail = async () => {
    let loc = await Location.getCurrentPositionAsync({});
    const mapsUrl = `https://www.google.com/maps?q=${loc.coords.latitude},${loc.coords.longitude}`;

    const isAvailable = await MailComposer.isAvailableAsync();
    if (isAvailable) {
      await MailComposer.composeAsync({
        recipients: ['tu-correo@ejemplo.com'], // CAMBIA ESTO
        subject: 'Reporte de App Crash - Archivos Adjuntos',
        body: `Ubicación actual: ${mapsUrl}\n\nSe adjuntan fotos y archivos seleccionados.`,
        attachments: attachments,
      });
    } else {
      Alert.alert("Error", "No tienes una app de correo configurada");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Panel de Control</Text>
      
      <TouchableOpacity style={styles.btn} onPress={takePhoto}>
        <Text style={styles.btnText}>📸 Tomar Foto</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn} onPress={pickImage}>
        <Text style={styles.btnText}>🖼️ Abrir Galería</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn} onPress={pickDocument}>
        <Text style={styles.btnText}>📁 Adjuntar Archivo / Drive</Text>
      </TouchableOpacity>

      <View style={styles.previewContainer}>
        <Text>Archivos listos: {attachments.length}</Text>
      </View>

      <TouchableOpacity style={[styles.btn, styles.sendBtn]} onPress={sendEmail}>
        <Text style={styles.btnText}>📩 ENVIAR REPORTE</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.clearBtn} onPress={() => setAttachments([])}>
        <Text style={{color: 'red'}}>Limpiar todo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
  btn: { backgroundColor: '#007bff', padding: 15, borderRadius: 10, width: '100%', marginBottom: 15, alignItems: 'center' },
  sendBtn: { backgroundColor: '#28a745', marginTop: 20 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  previewContainer: { marginVertical: 10 },
  clearBtn: { marginTop: 20 }
});
