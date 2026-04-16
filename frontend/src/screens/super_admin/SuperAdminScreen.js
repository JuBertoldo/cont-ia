import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import {
  getAllEmpresas,
  deleteEmpresa,
  getAllUsersGlobal,
} from '../../services/superAdminService';
import {
  subscribeAllTickets,
  TICKET_STATUS,
  createSupportInvite,
  getSupportInvites,
  deleteSupportInvite,
} from '../../services/supportService';
import { formatDateTime } from '../../utils/formatDate';

const TABS = [
  { key: 'empresas', label: 'Empresas', icon: 'business-outline' },
  { key: 'chamados', label: 'Chamados', icon: 'headset-outline' },
  { key: 'suporte', label: 'Equipe Suporte', icon: 'shield-checkmark-outline' },
];

export default function SuperAdminScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('empresas');
  const [empresas, setEmpresas] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const unsubRef = useRef(null);

  // Convites de suporte
  const [invites, setInvites] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteNome, setInviteNome] = useState('');
  const [savingInvite, setSavingInvite] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, users] = await Promise.all([
        getAllEmpresas(),
        getAllUsersGlobal(),
      ]);
      setEmpresas(emps);
      setTotalUsers(users.length);
    } catch (e) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInvites = useCallback(async () => {
    try {
      const list = await getSupportInvites();
      setInvites(list);
    } catch (_) {}
  }, []);

  useEffect(() => {
    load();
    loadInvites();
    unsubRef.current = subscribeAllTickets(
      list => setTickets(list),
      () => {},
    );
    return () => unsubRef.current?.();
  }, [load, loadInvites]);

  const handleCreateInvite = async () => {
    if (!inviteEmail.trim() || !inviteNome.trim()) {
      Alert.alert('Atenção', 'Preencha o e-mail e o nome do técnico.');
      return;
    }
    setSavingInvite(true);
    try {
      await createSupportInvite({ email: inviteEmail, nome: inviteNome });
      setInviteEmail('');
      setInviteNome('');
      await loadInvites();
      Alert.alert(
        'Convite criado!',
        `Convite enviado para ${inviteEmail.trim().toLowerCase()}.`,
      );
    } catch (e) {
      Alert.alert('Erro', e.message);
    } finally {
      setSavingInvite(false);
    }
  };

  const handleDeleteInvite = invite => {
    Alert.alert('Remover convite', `Remover convite de ${invite.email}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSupportInvite(invite.email);
            await loadInvites();
          } catch (e) {
            Alert.alert('Erro', e.message);
          }
        },
      },
    ]);
  };

  const pendingTickets = tickets.filter(t => t.status === 'aberto').length;

  const handleDelete = empresa => {
    Alert.alert(
      'Excluir empresa',
      `Excluir permanentemente "${empresa.nome}"?\n\nEsta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(empresa.id);
            try {
              await deleteEmpresa(empresa.id);
              setEmpresas(prev => prev.filter(e => e.id !== empresa.id));
            } catch (e) {
              Alert.alert('Erro', e.message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const renderEmpresa = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate(ROUTES.SUPER_ADMIN_COMPANY, { empresa: item })
      }
      activeOpacity={0.8}
    >
      <View style={styles.cardInfo}>
        <Ionicons name="business-outline" size={22} color={COLORS.PRIMARY} />
        <View style={styles.cardText}>
          <Text style={styles.cardName}>{item.nome}</Text>
          <Text style={styles.cardCode}>Código: {item.codigo}</Text>
        </View>
      </View>
      {deletingId === item.id ? (
        <ActivityIndicator size="small" color="#B00020" />
      ) : (
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={styles.iconBtn}
        >
          <Ionicons name="trash-outline" size={20} color="#B00020" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderTicket = ({ item }) => {
    const st = TICKET_STATUS[item.status] || TICKET_STATUS.aberto;
    const dt = item.createdAt
      ? formatDateTime(item.createdAt)
      : { date: '-', time: '-' };
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate(ROUTES.SUPER_ADMIN_TICKET, { ticket: item })
        }
        activeOpacity={0.8}
      >
        <View style={styles.ticketHeader}>
          <Text style={styles.ticketNumero}>
            {item.numero || 'CONTIA-????'}
          </Text>
          <View style={[styles.statusDot, { backgroundColor: st.color }]} />
        </View>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.titulo}
        </Text>
        <Text style={styles.cardCode}>
          {item.empresaNome} · {st.label}
        </Text>
        <Text style={styles.cardSub} numberOfLines={1}>
          {item.descricao}
        </Text>
        <Text style={styles.cardDate}>
          {dt.date} às {dt.time}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>Painel do Sistema</Text>
        <TouchableOpacity onPress={load}>
          <Ionicons name="refresh-outline" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Stats globais */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="business-outline" size={24} color={COLORS.PRIMARY} />
          <Text style={styles.statValue}>{empresas.length}</Text>
          <Text style={styles.statLabel}>Empresas</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="people-outline" size={24} color={COLORS.PRIMARY} />
          <Text style={styles.statValue}>{totalUsers}</Text>
          <Text style={styles.statLabel}>Usuários</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons
            name="headset-outline"
            size={24}
            color={pendingTickets > 0 ? '#f59e0b' : COLORS.PRIMARY}
          />
          <Text
            style={[
              styles.statValue,
              pendingTickets > 0 && { color: '#f59e0b' },
            ]}
          >
            {pendingTickets}
          </Text>
          <Text style={styles.statLabel}>Abertos</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsRow}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? COLORS.BLACK : COLORS.GRAY}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
              {tab.key === 'chamados' && pendingTickets > 0
                ? ` (${pendingTickets})`
                : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && activeTab !== 'suporte' ? (
        <ActivityIndicator
          size="large"
          color={COLORS.PRIMARY}
          style={{ marginTop: 40 }}
        />
      ) : activeTab === 'suporte' ? (
        <ScrollView contentContainerStyle={styles.list}>
          {/* Formulário novo convite */}
          <View style={styles.inviteForm}>
            <Text style={styles.inviteFormTitle}>Novo convite de acesso</Text>
            <TextInput
              style={styles.inviteInput}
              placeholder="E-mail do técnico"
              placeholderTextColor={COLORS.GRAY}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.inviteInput}
              placeholder="Nome do técnico"
              placeholderTextColor={COLORS.GRAY}
              value={inviteNome}
              onChangeText={setInviteNome}
            />
            <TouchableOpacity
              style={[styles.inviteBtn, savingInvite && { opacity: 0.6 }]}
              onPress={handleCreateInvite}
              disabled={savingInvite}
            >
              {savingInvite ? (
                <ActivityIndicator color={COLORS.BLACK} size="small" />
              ) : (
                <>
                  <Ionicons
                    name="send-outline"
                    size={16}
                    color={COLORS.BLACK}
                  />
                  <Text style={styles.inviteBtnText}>Criar convite</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Lista de convites existentes */}
          <Text style={styles.inviteListTitle}>
            Convites ({invites.length})
          </Text>
          {invites.length === 0 ? (
            <Text style={styles.empty}>Nenhum convite criado.</Text>
          ) : (
            invites.map(inv => (
              <View key={inv.id} style={styles.inviteCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inviteName}>{inv.nome}</Text>
                  <Text style={styles.inviteEmail}>{inv.email}</Text>
                  <View
                    style={[
                      styles.inviteStatus,
                      inv.usado && styles.inviteStatusUsed,
                    ]}
                  >
                    <Text style={styles.inviteStatusText}>
                      {inv.usado ? '✓ Utilizado' : '⏳ Aguardando cadastro'}
                    </Text>
                  </View>
                </View>
                {!inv.usado && (
                  <TouchableOpacity onPress={() => handleDeleteInvite(inv)}>
                    <Ionicons name="trash-outline" size={20} color="#B00020" />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={activeTab === 'empresas' ? empresas : tickets}
          keyExtractor={i => i.id}
          renderItem={activeTab === 'empresas' ? renderEmpresa : renderTicket}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {activeTab === 'empresas'
                ? 'Nenhuma empresa cadastrada.'
                : 'Nenhum chamado.'}
            </Text>
          }
        />
      )}
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
    marginBottom: 16,
  },
  title: { color: COLORS.WHITE, fontSize: 20, fontWeight: 'bold' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.DARK,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { color: COLORS.WHITE, fontSize: 26, fontWeight: 'bold' },
  statLabel: { color: COLORS.GRAY, fontSize: 11 },
  tabsRow: { marginBottom: 10 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.DARK,
    borderWidth: 1,
    borderColor: '#333',
  },
  tabActive: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY },
  tabText: { color: COLORS.GRAY, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: COLORS.BLACK },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  card: {
    backgroundColor: COLORS.DARK,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.PRIMARY,
  },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardText: { flex: 1 },
  cardName: { color: COLORS.WHITE, fontWeight: 'bold', fontSize: 15, flex: 1 },
  cardCode: {
    color: COLORS.PRIMARY,
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  cardSub: { color: COLORS.GRAY, fontSize: 12, marginTop: 4 },
  cardDate: { color: '#444', fontSize: 11, marginTop: 6 },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ticketNumero: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  iconBtn: { padding: 8 },
  empty: { color: COLORS.GRAY, textAlign: 'center', marginTop: 40 },
  inviteForm: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  inviteFormTitle: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  inviteInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
    color: COLORS.WHITE,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 14,
  },
  inviteBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  inviteBtnText: { color: COLORS.BLACK, fontWeight: 'bold' },
  inviteListTitle: {
    color: COLORS.GRAY,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  inviteCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  inviteName: { color: COLORS.WHITE, fontWeight: '600', fontSize: 14 },
  inviteEmail: { color: COLORS.GRAY, fontSize: 12, marginTop: 2 },
  inviteStatus: {
    marginTop: 6,
    backgroundColor: '#1a2a1a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  inviteStatusUsed: { backgroundColor: '#1a1a2a' },
  inviteStatusText: { color: COLORS.PRIMARY, fontSize: 11 },
});
