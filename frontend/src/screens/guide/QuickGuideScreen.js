import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../constants/colors';
import { auth } from '../../config/firebaseConfig';
import { getUserProfile } from '../../services/authService';
import { getEmpresaById } from '../../services/empresaService';

const GUIDE_ADMIN = [
  {
    icon: 'home-outline',
    titulo: 'Dashboard',
    desc: 'Na tela inicial você vê o total de contagens, itens contados e usuários da sua empresa. O gráfico mostra as contagens dos últimos 7 dias de toda a equipe.',
  },
  {
    icon: 'camera-outline',
    titulo: 'Nova Contagem',
    desc: 'Toque em "Nova Contagem" no menu lateral ou no botão da tela inicial. Fotografe os itens, veja o resultado detectado e confirme para salvar.',
  },
  {
    icon: 'list-outline',
    titulo: 'Histórico de Contagens',
    desc: 'Acesse pelo menu lateral. Você vê todas as contagens da empresa. Use os filtros de período e a busca para encontrar registros específicos. Toque em "Exportar" para gerar CSV.',
  },
  {
    icon: 'warning-outline',
    titulo: 'Contestar uma contagem',
    desc: 'No histórico, contagens de outros usuários têm um botão amarelo "Contestar". Use para registrar divergências com justificativa — o registro fica marcado mas não é apagado.',
    color: '#f59e0b',
  },
  {
    icon: 'people-outline',
    titulo: 'Gerenciar Usuários',
    desc: 'Menu lateral → Gerenciar Usuários. Aqui você aprova novos cadastros, promove usuários a admin ou revoga acessos. Usuários pendentes aparecem com alerta na tela inicial.',
  },
  {
    icon: 'key-outline',
    titulo: 'Código da empresa',
    desc: 'Seu código único aparece na tela de Perfil. Compartilhe esse código com novos funcionários para que eles possam se cadastrar na sua empresa.',
    color: COLORS.PRIMARY,
  },
  {
    icon: 'headset-outline',
    titulo: 'Abrir um chamado',
    desc: 'Menu lateral → Suporte / Chamados (ou Perfil → Suporte). Abra um chamado para reportar problemas, sugerir melhorias ou solicitar configurações. Você receberá a resposta no próprio app.',
  },
];

const GUIDE_USER = [
  {
    icon: 'home-outline',
    titulo: 'Dashboard',
    desc: 'Na tela inicial você vê suas contagens realizadas e o gráfico dos últimos 7 dias.',
  },
  {
    icon: 'camera-outline',
    titulo: 'Fazer uma contagem',
    desc: 'Toque em "Nova Contagem". Fotografe os itens com a câmera ou selecione da galeria. O app identifica e conta automaticamente. Revise o resultado e confirme para salvar.',
  },
  {
    icon: 'location-outline',
    titulo: 'GPS e local',
    desc: 'Na tela de contagem, o GPS é capturado automaticamente. Você também pode digitar o local manualmente (ex: "Almoxarifado A, Prateleira 3").',
  },
  {
    icon: 'list-outline',
    titulo: 'Histórico',
    desc: 'Menu lateral → Histórico de Contagens. Veja suas contagens com filtros de período e busca. Exporte em CSV quando precisar.',
  },
  {
    icon: 'person-outline',
    titulo: 'Perfil',
    desc: 'Menu lateral → Meu Perfil. Atualize seu nome e foto. Aqui também fica o link para suporte e a política de privacidade.',
  },
  {
    icon: 'headset-outline',
    titulo: 'Precisa de ajuda?',
    desc: 'Menu lateral → Suporte / Chamados. Abra um chamado descrevendo o problema ou dúvida. O administrador do sistema irá responder pelo app.',
  },
];

export default function QuickGuideScreen({ navigation }) {
  const [role, setRole] = useState('user');
  const [codigoEmpresa, setCodigoEmpresa] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!auth.currentUser) return;
      const profile = await getUserProfile(auth.currentUser.uid);
      setRole(profile?.role || 'user');
      if (profile?.empresaId && profile?.role === 'admin') {
        const emp = await getEmpresaById(profile.empresaId);
        setCodigoEmpresa(emp?.codigo || '');
      }
    };
    load();
  }, []);

  const isAdmin = role === 'admin' || role === 'super_admin';
  const guia = isAdmin ? GUIDE_ADMIN : GUIDE_USER;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>Guia Rápido</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badgeRow}>
          <Ionicons
            name={isAdmin ? 'shield-checkmark-outline' : 'person-outline'}
            size={16}
            color={COLORS.BLACK}
          />
          <Text style={styles.badgeText}>
            {isAdmin ? 'Perfil Admin' : 'Perfil Usuário'}
          </Text>
        </View>
        <Text style={styles.intro}>
          Guia das principais funcionalidades do Cont.IA para o seu perfil.
        </Text>

        {guia.map((item, idx) => (
          <View key={idx} style={styles.card}>
            <View
              style={[
                styles.iconBox,
                { backgroundColor: (item.color || COLORS.PRIMARY) + '22' },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={24}
                color={item.color || COLORS.PRIMARY}
              />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{item.titulo}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}

        {/* Destaque do código da empresa para admin */}
        {isAdmin && !!codigoEmpresa && (
          <View style={styles.codeCard}>
            <Ionicons name="key-outline" size={20} color={COLORS.PRIMARY} />
            <View style={styles.codeInfo}>
              <Text style={styles.codeLabel}>Seu código de empresa</Text>
              <Text style={styles.codeValue}>{codigoEmpresa}</Text>
              <Text style={styles.codeHint}>
                Compartilhe com novos funcionários no cadastro
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeBtnText}>Entendi, vamos lá!</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BLACK },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: { color: COLORS.WHITE, fontSize: 20, fontWeight: 'bold' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.PRIMARY,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  badgeText: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 13 },
  intro: { color: COLORS.GRAY, fontSize: 14, lineHeight: 22, marginBottom: 20 },
  card: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: { flex: 1 },
  cardTitle: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 4,
  },
  cardDesc: { color: COLORS.GRAY, fontSize: 13, lineHeight: 20 },
  codeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.DARK,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  codeInfo: { flex: 1 },
  codeLabel: { color: COLORS.GRAY, fontSize: 12, marginBottom: 4 },
  codeValue: {
    color: COLORS.PRIMARY,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginBottom: 4,
  },
  codeHint: { color: COLORS.GRAY, fontSize: 12 },
  closeBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  closeBtnText: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 15 },
});
