import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';
import { MESSAGES } from '../../constants/messages';

import { auth } from '../../config/firebaseConfig';
import { getUserProfile } from '../../services/authService';
import {
  updateProfileName,
  updateProfileBirthDate,
  updateProfilePhoto,
} from '../../services/profileService';

export default function ProfileScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [role, setRole] = useState('user');
  const [birthDate, setBirthDate] = useState('');

  const formatBirthDateInput = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const loadProfile = async () => {
    try {
      if (!auth.currentUser) return;

      const profile = await getUserProfile(auth.currentUser.uid);

      if (profile) {
        setUserName(profile.nome || auth.currentUser.displayName || '');
        setEmail(profile.email || auth.currentUser.email || '');
        setPhotoURL(profile.photoURL || auth.currentUser.photoURL || '');
        setRole(profile.role || 'user');
        setBirthDate(profile.birthDate || '');
      } else {
        setUserName(auth.currentUser.displayName || '');
        setEmail(auth.currentUser.email || '');
        setPhotoURL(auth.currentUser.photoURL || '');
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      Alert.alert('Erro', MESSAGES.GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Precisamos acessar sua galeria.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled) return;

      setSaving(true);

      const uri = result.assets[0].uri;
      const downloadURL = await updateProfilePhoto(auth.currentUser.uid, uri);
      setPhotoURL(downloadURL);

      Alert.alert('Sucesso', 'Foto de perfil atualizada.');
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a foto.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveName = async () => {
    const cleanName = userName.trim();

    if (!cleanName) {
      Alert.alert('Atenção', 'Digite um nome válido.');
      return;
    }

    try {
      setSaving(true);
      await updateProfileName(auth.currentUser.uid, cleanName);
      Alert.alert('Sucesso', 'Nome atualizado.');
    } catch (error) {
      console.error('Erro ao salvar nome:', error);
      Alert.alert('Erro', MESSAGES.GENERIC_ERROR);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBirthDate = async () => {
    const cleanBirthDate = birthDate.trim();

    if (!cleanBirthDate) {
      Alert.alert('Atenção', 'Digite uma data de nascimento válida.');
      return;
    }

    try {
      setSaving(true);
      await updateProfileBirthDate(auth.currentUser.uid, cleanBirthDate);
      Alert.alert('Sucesso', 'Data de nascimento atualizada.');
    } catch (error) {
      console.error('Erro ao salvar data de nascimento:', error);
      Alert.alert('Erro', MESSAGES.GENERIC_ERROR);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isTablet && styles.contentTablet]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.iconBtn}>
          <Ionicons name="menu-outline" size={30} color={COLORS.WHITE} />
        </TouchableOpacity>

        <Text style={[styles.title, isTablet && styles.titleTablet]}>Meu Perfil</Text>

        <View style={{ width: 30 }} />
      </View>

      <View style={styles.avatarContainer}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-circle-outline" size={110} color="#666" />
          </View>
        )}

        <TouchableOpacity style={styles.cameraBtn} onPress={pickImage} disabled={saving}>
          <Ionicons name="camera-outline" size={20} color={COLORS.BLACK} />
        </TouchableOpacity>
      </View>

      {role === 'admin' ? (
        <View style={styles.adminBadge}>
          <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.BLACK} />
          <Text style={styles.adminText}>Perfil admin</Text>
        </View>
      ) : (
        <Text style={styles.userText}>Perfil usuário</Text>
      )}

      <View style={styles.formCard}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={[styles.input, isTablet && styles.inputTablet]}
          value={userName}
          onChangeText={setUserName}
          placeholder="Digite seu nome"
          placeholderTextColor="#666"
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.BLACK} /> : <Text style={styles.saveText}>SALVAR NOME</Text>}
        </TouchableOpacity>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={[styles.input, styles.readOnlyInput, isTablet && styles.inputTablet]}
          value={email}
          editable={false}
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>Data de nascimento</Text>
        <TextInput
          style={[styles.input, isTablet && styles.inputTablet]}
          value={birthDate}
          onChangeText={(text) => setBirthDate(formatBirthDateInput(text))}
          placeholder="DD/MM/AAAA"
          placeholderTextColor="#666"
          keyboardType="number-pad"
          maxLength={10}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBirthDate} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.BLACK} /> : <Text style={styles.saveText}>SALVAR DATA</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: COLORS.BLACK, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: COLORS.BLACK },
  content: { padding: 20, paddingBottom: 30 },
  contentTablet: { maxWidth: 520, width: '100%', alignSelf: 'center' },
  header: { marginTop: 50, marginBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBtn: { padding: 4 },
  title: { color: COLORS.WHITE, fontSize: 22, fontWeight: 'bold' },
  titleTablet: { fontSize: 26 },
  avatarContainer: { alignItems: 'center', marginBottom: 12, position: 'relative' },
  avatar: { width: 130, height: 130, borderRadius: 65, backgroundColor: COLORS.DARK, borderWidth: 2, borderColor: COLORS.PRIMARY },
  avatarPlaceholder: { width: 130, height: 130, borderRadius: 65, backgroundColor: COLORS.DARK, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.PRIMARY },
  cameraBtn: { position: 'absolute', bottom: 0, right: '35%', backgroundColor: COLORS.PRIMARY, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  adminBadge: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.PRIMARY, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, marginBottom: 14 },
  adminText: { color: COLORS.BLACK, fontWeight: 'bold' },
  userText: { alignSelf: 'center', color: COLORS.GRAY, marginBottom: 14 },
  formCard: { backgroundColor: '#0B0B0B', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#1A1A1A' },
  label: { color: COLORS.GRAY, marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: COLORS.DARK, color: COLORS.WHITE, padding: 16, borderRadius: 12, marginBottom: 10 },
  inputTablet: { paddingVertical: 18, fontSize: 17 },
  readOnlyInput: { opacity: 0.7 },
  saveBtn: { backgroundColor: COLORS.PRIMARY, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  saveText: { color: COLORS.BLACK, fontWeight: 'bold' },
});