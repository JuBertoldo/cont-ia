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
  Switch,
  useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';

import { COLORS } from '../../constants/colors';
import { MESSAGES } from '../../constants/messages';
import { auth } from '../../config/firebaseConfig';
import { getUserProfile } from '../../services/authService';
import {
  updateProfileName,
  updateProfilePhoto,
} from '../../services/profileService';
import { getEmpresaById } from '../../services/empresaService';
import {
  ativarPushNotifications,
  desativarPushNotifications,
} from '../../services/notificationService';

export default function ProfileScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [role, setRole] = useState('user');
  const [matricula, setMatricula] = useState('');
  const [empresa, setEmpresa] = useState(null);
  const [pushAtivo, setPushAtivo] = useState(false);

  const loadProfile = async () => {
    try {
      if (!auth.currentUser) return;
      const profile = await getUserProfile(auth.currentUser.uid);
      if (profile) {
        setUserName(profile.nome || auth.currentUser.displayName || '');
        setEmail(profile.email || auth.currentUser.email || '');
        setPhotoURL(profile.photoURL || auth.currentUser.photoURL || '');
        setRole(profile.role || 'user');
        setMatricula(profile.matricula || '');
        setPushAtivo(profile.notificacoesHabilitadas === true);

        if (profile.empresaId) {
          const emp = await getEmpresaById(profile.empresaId);
          setEmpresa(emp);
        }
      } else {
        setUserName(auth.currentUser.displayName || '');
        setEmail(auth.currentUser.email || '');
        setPhotoURL(auth.currentUser.photoURL || '');
      }
    } catch (error) {
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
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
        selectionLimit: 1,
      });
      if (result.didCancel || !result.assets?.[0]?.uri) return;
      setSaving(true);
      const uri = result.assets[0].uri;
      const downloadURL = await updateProfilePhoto(auth.currentUser.uid, uri);
      setPhotoURL(downloadURL);
      Alert.alert('Sucesso', 'Foto de perfil atualizada.');
    } catch {
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
    } catch {
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={[styles.title, isTablet && styles.titleTablet]}>
          Meu Perfil
        </Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-circle-outline" size={110} color="#666" />
          </View>
        )}
        <TouchableOpacity
          style={styles.cameraBtn}
          onPress={pickImage}
          disabled={saving}
        >
          <Ionicons name="camera-outline" size={20} color={COLORS.BLACK} />
        </TouchableOpacity>
      </View>

      {role === 'super_admin' ? (
        <View style={[styles.adminBadge, { backgroundColor: '#9333ea' }]}>
          <Ionicons name="globe-outline" size={18} color={COLORS.WHITE} />
          <Text style={[styles.adminText, { color: COLORS.WHITE }]}>
            Super Admin
          </Text>
        </View>
      ) : role === 'admin' ? (
        <View style={styles.adminBadge}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={COLORS.BLACK}
          />
          <Text style={styles.adminText}>Perfil admin</Text>
        </View>
      ) : (
        <Text style={styles.userText}>Perfil usuário</Text>
      )}

      {/* Dados pessoais */}
      <View style={styles.formCard}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={[styles.input, isTablet && styles.inputTablet]}
          value={userName}
          onChangeText={setUserName}
          placeholder="Digite seu nome"
          placeholderTextColor="#666"
        />
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSaveName}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.BLACK} />
          ) : (
            <Text style={styles.saveText}>SALVAR NOME</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={[
            styles.input,
            styles.readOnlyInput,
            isTablet && styles.inputTablet,
          ]}
          value={email}
          editable={false}
        />

        {!!matricula && (
          <>
            <Text style={styles.label}>Matrícula</Text>
            <TextInput
              style={[
                styles.input,
                styles.readOnlyInput,
                isTablet && styles.inputTablet,
              ]}
              value={matricula}
              editable={false}
            />
          </>
        )}
      </View>

      {/* Empresa */}
      {empresa && (
        <View style={styles.empresaCard}>
          <Ionicons name="business-outline" size={20} color={COLORS.PRIMARY} />
          <View style={styles.empresaInfo}>
            <Text style={styles.empresaNome}>{empresa.nome}</Text>
            {role === 'admin' && (
              <View style={styles.codigoRow}>
                <Text style={styles.codigoLabel}>Código de acesso: </Text>
                <Text style={styles.codigoCodigo}>{empresa.codigo}</Text>
                <Text style={styles.codigoHint}>
                  {' '}
                  (compartilhe com novos usuários)
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Notificações push */}
      <View style={styles.pushRow}>
        <View style={styles.pushInfo}>
          <Ionicons
            name="notifications-outline"
            size={20}
            color={COLORS.PRIMARY}
          />
          <View>
            <Text style={styles.pushLabel}>Notificações push</Text>
            <Text style={styles.pushHint}>
              {pushAtivo
                ? 'Ativas no seu celular'
                : 'Só notificações no app (sininho)'}
            </Text>
          </View>
        </View>
        <Switch
          value={pushAtivo}
          onValueChange={async value => {
            setPushAtivo(value);
            if (value) {
              const ok = await ativarPushNotifications();
              if (!ok) {
                setPushAtivo(false);
                Alert.alert(
                  'Push indisponível',
                  'Instale o módulo de push e configure as permissões nas configurações do telefone.',
                );
              }
            } else {
              await desativarPushNotifications();
            }
          }}
          trackColor={{ false: '#333', true: COLORS.PRIMARY + '88' }}
          thumbColor={pushAtivo ? COLORS.PRIMARY : '#555'}
        />
      </View>

      <View style={styles.versionBlock}>
        <Text style={styles.version}>Cont.IA v1.0.0</Text>
        <Text style={styles.tagline}>
          Contagem e identificação visual instantânea para o seu negócio
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.BLACK,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: { flex: 1, backgroundColor: COLORS.BLACK },
  content: { padding: 20, paddingBottom: 40 },
  contentTablet: { maxWidth: 520, width: '100%', alignSelf: 'center' },
  header: {
    marginTop: 50,
    marginBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBtn: { padding: 4 },
  title: { color: COLORS.WHITE, fontSize: 22, fontWeight: 'bold' },
  titleTablet: { fontSize: 26 },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.DARK,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  avatarPlaceholder: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.DARK,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: COLORS.PRIMARY,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: 14,
  },
  adminText: { color: COLORS.BLACK, fontWeight: 'bold' },
  userText: { alignSelf: 'center', color: COLORS.GRAY, marginBottom: 14 },
  formCard: {
    backgroundColor: '#0B0B0B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    marginBottom: 16,
  },
  label: { color: COLORS.GRAY, marginBottom: 8, marginTop: 10 },
  input: {
    backgroundColor: COLORS.DARK,
    color: COLORS.WHITE,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  inputTablet: { paddingVertical: 18, fontSize: 17 },
  readOnlyInput: { opacity: 0.6 },
  saveBtn: {
    backgroundColor: COLORS.PRIMARY,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveText: { color: COLORS.BLACK, fontWeight: 'bold' },
  empresaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.DARK,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.PRIMARY,
  },
  empresaInfo: { flex: 1 },
  empresaNome: { color: COLORS.WHITE, fontWeight: 'bold', fontSize: 15 },
  codigoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    alignItems: 'center',
  },
  codigoLabel: { color: COLORS.GRAY, fontSize: 12 },
  codigoCodigo: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 2,
  },
  codigoHint: { color: COLORS.GRAY, fontSize: 11 },
  linksCard: {
    backgroundColor: COLORS.DARK,
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  linkText: { color: COLORS.WHITE, fontSize: 14, flex: 1 },
  linkDivider: { height: 1, backgroundColor: '#222', marginHorizontal: 16 },
  pushRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  pushInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  pushLabel: { color: COLORS.WHITE, fontSize: 14, fontWeight: '600' },
  pushHint: { color: COLORS.GRAY, fontSize: 11, marginTop: 2 },
  versionBlock: { alignItems: 'center', marginTop: 'auto', paddingTop: 16 },
  version: { color: '#333', fontSize: 12, textAlign: 'center' },
  tagline: { color: '#222', fontSize: 11, textAlign: 'center', marginTop: 4 },
});
