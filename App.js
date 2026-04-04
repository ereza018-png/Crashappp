import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  TextInput, Modal, Alert, Image, Dimensions, ActivityIndicator, Keyboard, Linking
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const MAX_SIZE_BYTES = 24.5 * 1024 * 1024;
const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) return;
  if (data) {
    const { locations } = data;
    console.log('GPS Fondo:', locations[0].coords);
  }
});

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const reporteInputRef = useRef(null);
  const siniestroInputRef = useRef(null);

  const [aseguradora, setAseguradora] = useState('Seleccionar');
  const [atencion, setAtencion] = useState('Seleccionar');
  const [reporteNum, setReporteNum] = useState('');
  const [siniestroNum, setSiniestroNum] = useState('');
  const [acuerdo, setAcuerdo] = useState('Seleccionar');
  const [responsabilidad, setResponsabilidad] = useState('Seleccionar');
  const [circunstancia, setCircunstancia] = useState('Seleccionar');
  const [improcedente, setImprocedente] = useState('N/A');

  const [evidencias, setEvidencias] = useState({});
  const [pdfs, setPdfs] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showAsegurado, setShowAsegurado] = useState(false);
  const [showTercero, setShowTercero] = useState(false);
  const [modalGeneric, setModalGeneric] = useState({ visible: false, title: '', options: [], setter: null });
  const [modalVisor, setModalVisor] = useState({ visible: false, folder: '', sub: '' });
  const [cameraActive, setCameraActive] = useState(false);
  const [currentFolder, setCurrentFolder] = useState('');
  const [currentSubFolder, setCurrentSubFolder] = useState('');
  const [tempPhoto, setTempPhoto] = useState(null);
  const [rotation, setRotation] = useState(0);

  // LISTAS
  const listaAseguradoras = ["HDI", "EL ÁGUILA", "GEN DE SEG", "ALLIANZ", "ANA SEGUROS", "CHUBB", "QUALITAS", "AXA", "GNP", "OTRAS"];
  const opcionesAtencion = ["COMPLEMENTARIA", "SINIESTRO SIN PÓLIZA", "DIVERSOS", "KM", "PEAJE"];
  const opcionesResponsabilidad = ["ASEGURADO", "TERCERO", "CORRESPONSABILIDAD", "PENDIENTE"];
  const opcionesAcuerdos = ["COBRO SIPAC", "COBRO COPAC", "RECUPERACIÓN EFECTIVO", "RECUPERACIÓN TDD", "RECUPERACIÓN GOA", "RECUPERACIÓN MODULO", "COSTO ASEGURADO", "CRISTAL", "SEGURO DE RINES Y LLANTAS", "ROBO PARCIAL", "ROBO TOTAL", "JURÍDICO", "PLAN PISO", "CASH FLOW", "INVESTIGACIÓN", "COMPLEMENTO", "PAGO SIPAC", "PAGO COPAC", "COSTO TERCERO", "PAGO UMAS Y DEDUCIBLES", "S/C ARREGLO ENTRE PARTICULARES", "S/C MENOR AL DEDUCIBLE", "IMPROCEDENTE", "S/C SIN PÓLIZA", "RECHAZO", "NO LOCALIZADO", "DIVERSOS", "CANCELADO 10< NO FACTURAR"];
  const opcionesCircunstancias = ["AGRAVAMIENTO DE DAÑO", "ALCANCE", "AMPLITUD Y/O AFLUENCIA", "APERTURA DE PUERTA", "ASESORÍA", "ATROPELLO", "BACHE", "CAÍDA DE OBJETOS", "CAMBIO DE CARRIL", "CARRIL DE CONTRA FLUJO", "CASH FLOW RECUPERACIÓN", "CIRCULABA A LA IZQUIERDA EN CRUCERO", "DE IGUAL AMPLITUD", "CIRCULABA SOBRE LA VÍA PRINCIPAL", "CIRCULABA SOBRE LA VÍA SECUNDARIA", "CITA POSTERIOR", "CORTE DE CIRCULACIÓN", "CUNETA", "DAÑOS OCASIONADOS POR LA CARGA", "DIVERSOS", "DUPLICADO", "ENTRE CARRILES", "ESTACIONADO", "EXCESO DE VELOCIDAD", "FALLA MECÁNICA", "INCORPORACIÓN", "INUNDACIÓN", "INVACIÓN DE CARRIL", "LIBERACIÒN DE VEHÍCULO", "MANIOBRAS PARA ESTACIONARSE", "NO LOCALIZADO", "NO TOMÉ EL EXTREMO", "OBJETO FIJO", "PAGO DE DAÑOS PAGO SIPAC/COPAC", "PARTES BAJAS", "PASADA DE ALTO", "PASES MÉDICOS", "PENDIENTE DECLARACIÓN", "PERDER EL CONTROL", "RECUPERACIÓN (RECUPERACIÓN,UMAS)", "RECUPERACIÓN COPAC/SIPAC", "RECUPERACIÓN DE VEHÍCULO POR ROBO", "REVERSA", "ROBO PARCIAL", "ROBO TOTAL", "ROTURA DE CRISTAL", "SALIDA DE CAMINO", "SALÍDA DE COCHERA", "SEMOVIENTE", "SENTIDO CONTRARIO", "SEÑAL PREVENTIVA", "SEÑAL RESTRICTIVA", "SIN COSTO", "TRASLADO", "VALE DE GRÚA", "VALET PARKING", "VANDALISMO", "VEHÍCULO RECUPERADO", "VIOLENCIA", "VISTA A LA DERECHA", "VOLANTE DE ADMISIÓN", "VOLANTE DE ADMISIÓN Y GRÚA", "VOLCADURA", "VUELTA A LA DERECHA", "VUELTA A LA IZQUIERDA", "VUELTA DESDE EL SEGUNDO CARRIL", "VUELTA EN U", "VUELTA PROHIBIDA", "GRANIZO", "DERRAPO", "OTRO"];
  const opcionesImprocedentes = ["N/A", "CAMBIO DE CONDUCTOR", "COBERTURA NO AMPARADA (SEGURO DE LLANTAS Y RINES)", "DECLARACIÓN", "EXTENSIÓN DE RESPONSABILIDAD CIVIL", "FALLA MECÁNICA", "LICENCIA", "NO CONCUERDAN DAÑOS DE LOS AUTOMOVILES", "NO ES ASEGURADO", "NO HAY COLISIÓN", "PÓLIZA CANCELADA", "PÓLIZA LIMITADA", "PÓLIZA NO AMPARA DAÑOS", "PÓLIZA RECIENTE", "USO DISTINTO AL CONTRATADO", "PÓLIZA RC", "RECHAZO", "DESISTIMIENTO"];

  const subAsegurado = ["MÉTODO DE CRONOS", "DAÑOS", "DUA ANVERSO", "DUA REVERSO", "PLACAS", "NÚMERO DE SERIE", "ODÓMETRO", "LICENCIA", "TARJETA DE CIRCULACIÓN", "IDENTIFICACIONES", "ENCUESTA"];
  const subTercero = ["DOCUMENTOS", "PROCEDIMIENTO CRONOS", "VEHÍCULO TERCERO"];

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus === 'granted') {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced, timeInterval: 15000,
          foregroundService: { notificationTitle: "Crash Asesores", notificationBody: "Localizador activo." },
        });
      }
      await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 }, (loc) => setLocation(loc.coords));
    })();
  }, []);

  const cerrarSesion = () => {
    Alert.alert("Salir", "¿Reiniciar formulario?", [{ text: "No" }, { text: "Sí", onPress: () => {
      setAseguradora('Seleccionar'); setAtencion('Seleccionar'); setReporteNum(''); setSiniestroNum('');
      setAcuerdo('Seleccionar'); setResponsabilidad('Seleccionar'); setCircunstancia('Seleccionar');
      setImprocedente('N/A'); setEvidencias({}); setPdfs([]); setShowAsegurado(false); setShowTercero(false);
    }}]);
  };

  const seleccionarDeGaleria = async (folder, sub) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.3 });
    if (!res.canceled) {
      const key = `${folder}_${sub}`;
      const newF = res.assets.map(a => ({ uri: a.uri, id: Math.random().toString() }));
      setEvidencias(prev => ({ ...prev, [key]: [...(prev[key] || []), ...newF] }));
    }
  };

  const adjuntarPDFs = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: true });
      if (!res.canceled) setPdfs(prev => [...prev, ...res.assets]);
    } catch (err) { Alert.alert("Error", "No se pudo abrir archivos."); }
  };

  const processAndSave = async (isMulti) => {
    try {
      const manip = await ImageManipulator.manipulateAsync(tempPhoto, [{ rotate: rotation }, { resize: { width: 800 } }], { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG });
      const key = `${currentFolder}_${currentSubFolder}`;
      setEvidencias(prev => ({ ...prev, [key]: [...(prev[key] || []), { uri: manip.uri, id: Date.now().toString() }] }));
      setRotation(0);
      if (isMulti) setTempPhoto(null); else { setCameraActive(false); setTempPhoto(null); }
    } catch (e) { Alert.alert("Error", "Fallo al guardar."); }
  };

  // --- FUNCIÓN DE ENVÍO REFORZADA ---
  const enviarReporte = async () => {
    if (aseguradora === 'Seleccionar' || atencion === 'Seleccionar' || !reporteNum) {
      Alert.alert("Campos Incompletos", "Aseguradora, Atención y Reporte son obligatorios."); return;
    }

    setLoading(true);
    let totalSize = 0;
    let finalAttachments = [];

    try {
      // 1. Verificar si MailComposer es posible
      const isMailAvailable = await MailComposer.isAvailableAsync();

      const tempDir = FileSystem.cacheDirectory + 'mail_prep/';
      const dirInfo = await FileSystem.getInfoAsync(tempDir);
      if (dirInfo.exists) await FileSystem.deleteAsync(tempDir);
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });

      // Fotos
      for (const folder of ['ASEGURADO', 'TERCERO']) {
        const subs = folder === 'ASEGURADO' ? subAsegurado : subTercero;
        for (const s of subs) {
          const files = evidencias[`${folder}_${s}`] || [];
          for (let i = 0; i < files.length; i++) {
            const info = await FileSystem.getInfoAsync(files[i].uri);
            totalSize += info.size;
            const dest = `${tempDir}${folder}_${s.replace(/ /g,'_')}_${i+1}.jpg`;
            await FileSystem.copyAsync({ from: files[i].uri, to: dest });
            const contentUri = await FileSystem.getContentUriAsync(dest);
            finalAttachments.push(contentUri);
          }
        }
      }

      // PDFs
      for (let i = 0; i < pdfs.length; i++) {
        const infoPdf = await FileSystem.getInfoAsync(pdfs[i].uri);
        totalSize += infoPdf.size;
        const destPdf = `${tempDir}PDF_ADJUNTO_${i+1}.pdf`;
        await FileSystem.copyAsync({ from: pdfs[i].uri, to: destPdf });
        const contentUriPdf = await FileSystem.getContentUriAsync(destPdf);
        finalAttachments.push(contentUriPdf);
      }

      if (totalSize > MAX_SIZE_BYTES) {
        throw new Error(`Expediente muy pesado (${(totalSize/1048576).toFixed(2)}MB). Máximo 24.5MB.`);
      }

      const subject = `${aseguradora} REPORTE ${reporteNum} SINIESTRO ${siniestroNum || 'N/A'} ATENCIÓN ${atencion}`.toUpperCase();
      const bodyText = `REPORTE DE SINIESTRO\n\nGPS: ${location ? `${location.latitude},${location.longitude}` : 'N/D'}\nAcuerdo: ${acuerdo}\nResp: ${responsabilidad}\nCircunstancia: ${circunstancia}\nImp: ${improcedente}`;

      // SI FALLA MAILCOMPOSER, USAR LINKING (PLAN B)
      if (!isMailAvailable) {
        const mailtoUrl = `mailto:reportes@crashasesores.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
        await Linking.openURL(mailtoUrl);
      } else {
        // Enviar con MailComposer (Solo si hay adjuntos se incluye la propiedad)
        const mailOptions = {
          recipients: ['reportes@crashasesores.com'],
          subject: subject,
          body: bodyText,
        };

        if (finalAttachments.length > 0) {
          mailOptions.attachments = finalAttachments;
        }

        const result = await MailComposer.composeAsync(mailOptions);
        if (result.status === 'failed') throw new Error("El sistema de correo rechazó la solicitud.");
      }

    } catch (e) {
      Alert.alert("Aviso de Envío", "Si el correo no se abrió automáticamente, asegúrate de tener Gmail instalado y configurado.");
      console.log(e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderFila = (item, folder) => {
    const key = `${folder}_${item}`;
    const count = evidencias[key]?.length || 0;
    return (
      <View key={item} style={styles.listItem}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => { setCurrentFolder(folder); setCurrentSubFolder(item); setCameraActive(true); }}>
          <Text style={styles.listText}>{item}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => seleccionarDeGaleria(folder, item)}><Text style={{fontSize: 22}}>🖼️</Text></TouchableOpacity>
        {count > 0 && (
          <TouchableOpacity style={styles.badge} onPress={() => setModalVisor({ visible: true, folder, sub: item })}>
            <Text style={styles.badgeText}>{count}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (!permission?.granted) return <View style={styles.center}><TouchableOpacity onPress={requestPermission} style={styles.mainBtn}><Text style={styles.whiteTxt}>HABILITAR CÁMARA</Text></TouchableOpacity></View>;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={cerrarSesion} style={styles.logoutBtn}><Text style={styles.whiteTxtTiny}>SALIR</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>CRASH ASESORES</Text>
          <TouchableOpacity onPress={() => { setEvidencias({}); setPdfs([]); }} style={styles.cleanBtn}><Text style={styles.whiteTxtTiny}>LIMPIAR</Text></TouchableOpacity>
        </View>

        {loading && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#004381" /><Text style={{marginTop:10, fontWeight:'bold'}}>Abriendo Correo...</Text></View>}

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => setModalGeneric({visible:true, title:"ASEGURADORA", options:listaAseguradoras, setter:setAseguradora})}><Text style={styles.label}>ASEGURADORA:</Text><Text style={styles.valBlue}>{aseguradora}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={() => setModalGeneric({visible:true, title:"ATENCIÓN", options:opcionesAtencion, setter:setAtencion})}><Text style={styles.label}>ATENCIÓN:</Text><Text style={styles.valBlue}>{atencion}</Text></TouchableOpacity>
            <View style={styles.row}><Text style={styles.label}>N° REPORTE:</Text><TextInput ref={reporteInputRef} style={styles.input} value={reporteNum} onChangeText={setReporteNum} keyboardType="numeric" placeholder="0000" returnKeyType="next" onSubmitEditing={() => siniestroInputRef.current?.focus()} /></View>
            <View style={styles.row}><Text style={styles.label}>N° SINIESTRO:</Text><TextInput ref={siniestroInputRef} style={styles.input} value={siniestroNum} onChangeText={setSiniestroNum} keyboardType="numeric" placeholder="0000" returnKeyType="done" onSubmitEditing={() => Keyboard.dismiss()} /></View>
            <TouchableOpacity style={styles.row} onPress={() => setModalGeneric({visible:true, title:"ACUERDO", options:opcionesAcuerdos, setter:setAcuerdo})}><Text style={styles.label}>ACUERDO:</Text><Text style={styles.valBlue}>{acuerdo}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={() => setModalGeneric({visible:true, title:"RESPONSABILIDAD", options:opcionesResponsabilidad, setter:setResponsabilidad})}><Text style={styles.label}>RESPONSABILIDAD:</Text><Text style={styles.valBlue}>{responsabilidad}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={() => setModalGeneric({visible:true, title:"CIRCUNSTANCIA", options:opcionesCircunstancias, setter:setCircunstancia})}><Text style={styles.label}>CIRCUNSTANCIA:</Text><Text style={styles.valBlue}>{circunstancia}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={() => setModalGeneric({visible:true, title:"IMPROCEDENTE", options:opcionesImprocedentes, setter:setImprocedente})}><Text style={styles.label}>IMPROCEDENTE:</Text><Text style={styles.valBlue}>{improcedente}</Text></TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.pdfBtn} onPress={adjuntarPDFs}>
            <Text style={styles.whiteTxtBold}>📄 ADJUNTAR PDFS ({pdfs.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.catBtn, {backgroundColor: '#2E7D32', marginTop: 15}]} onPress={() => setShowAsegurado(!showAsegurado)}><Text style={styles.whiteTxtBold}>FOTOS ASEGURADO</Text></TouchableOpacity>
          {showAsegurado && <View style={styles.listContainer}>{subAsegurado.map(i => renderFila(i, 'ASEGURADO'))}</View>}

          <TouchableOpacity style={[styles.catBtn, {backgroundColor: '#004381', marginTop: 10}]} onPress={() => setShowTercero(!showTercero)}><Text style={styles.whiteTxtBold}>FOTOS TERCERO</Text></TouchableOpacity>
          {showTercero && <View style={styles.listContainer}>{subTercero.map(i => renderFila(i, 'TERCERO'))}</View>}

          <TouchableOpacity style={styles.sendBtn} onPress={enviarReporte} disabled={loading}><Text style={styles.sendBtnText}>ENVIAR EXPEDIENTE</Text></TouchableOpacity>
        </ScrollView>

        <Modal visible={modalGeneric.visible} transparent animationType="fade">
          <View style={styles.overlay}><View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{modalGeneric.title}</Text>
            <ScrollView style={{maxHeight: 350}}>{modalGeneric.options.map(o => (
              <TouchableOpacity key={o} style={styles.mItem} onPress={() => { modalGeneric.setter(o); setModalGeneric({...modalGeneric, visible: false}); }}>
                <Text style={styles.mItemText}>{o}</Text>
              </TouchableOpacity>
            ))}</ScrollView>
            <TouchableOpacity style={styles.mClose} onPress={() => setModalGeneric({...modalGeneric, visible: false})}><Text style={styles.whiteTxt}>CERRAR</Text></TouchableOpacity>
          </View></View>
        </Modal>

        <Modal visible={modalVisor.visible} transparent animationType="slide">
          <View style={styles.overlay}><View style={[styles.modalBox, {width: '95%', maxHeight: '85%'}]}>
            <Text style={styles.modalTitle}>VISOR: {modalVisor.sub}</Text>
            <ScrollView contentContainerStyle={styles.vScroll}>
              {(evidencias[`${modalVisor.folder}_${modalVisor.sub}`] || []).map((f, idx) => (
                <View key={f.id} style={styles.vItem}>
                  <Image source={{ uri: f.uri }} style={styles.vImg} />
                  <View style={styles.vRow}>
                    <TouchableOpacity onPress={async () => {
                      const res = await ImageManipulator.manipulateAsync(f.uri, [{ rotate: 90 }], { compress: 0.6 });
                      const key = `${modalVisor.folder}_${modalVisor.sub}`;
                      const l = [...evidencias[key]]; l[idx] = { ...f, uri: res.uri };
                      setEvidencias({ ...evidencias, [key]: l });
                    }} style={styles.vBtnRot}><Text style={styles.whiteTxtTiny}>ROTAR</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      const key = `${modalVisor.folder}_${modalVisor.sub}`;
                      const nL = evidencias[key].filter((_, i) => i !== idx);
                      setEvidencias({...evidencias, [key]: nL});
                      if (nL.length === 0) setModalVisor({visible: false});
                    }} style={styles.vBtnDel}><Text style={styles.whiteTxtTiny}>X</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.mClose} onPress={() => setModalVisor({visible:false})}><Text style={styles.whiteTxt}>VOLVER</Text></TouchableOpacity>
          </View></View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  header: { backgroundColor: '#004381', padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  cleanBtn: { backgroundColor: '#D32F2F', padding: 6, borderRadius: 4 },
  logoutBtn: { backgroundColor: '#333
