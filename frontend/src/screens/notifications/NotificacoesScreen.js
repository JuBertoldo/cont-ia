import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import { auth } from '../../config/firebaseConfig';
import {
  subscribeNotificacoes,
  marcarComoLida,
  marcarTodasComoLidas,
  NOTIF_TIPOS,
} from '../../services/notificationService';
import { formatDateTime } from '../../utils/formatDate';

const TIPO_CONFIG = {
  [NOTIF_TIPOS.NOVO_USUARIO]: {
    icon: 'person-add-outline',
    color: '#3b82f6',
    rota: ROUTES.ADMIN_USERS,
  },
  [NOTIF_TIPOS.CHAMADO_ABERTO]: {
    icon: 'headset-outline',
    color: '#f59e0b',
    rota: ROUTES.SUPPORT_TICKETS,
  },
  [NOTIF_TIPOS.TICKET_ATUALIZADO]: {
    icon: 'refresh-circle-outline',
    color: '#8b5cf6',
    rota: ROUTES.SUPPORT,
  },
  [NOTIF_TIPOS.TICKET_RESPONDIDO]: {
    icon: 'chatbubble-outline',
    color: '#22c55e',
    rota: ROUTES.SUPPORT,
  },
};

function NotifCard({ item, onPress }) {
  const config = TIPO_CONFIG[item.tipo] ?? {
    icon: 'notifications-outline',
    color: COLORS.GRAY,
  };
  const dt = item.createdAt
    ? formatDateTime(item.createdAt)
    : { date: '-', time: '-' };

  return (
    <TouchableOpacity
      style={[styles.card, !item.lida && styles.cardNaoLida]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      <View
        style={[styles.iconCircle, { backgroundColor: config.color + '22' }]}
      >
        <Ionicons name={config.icon} size={22} color={config.color} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.titulo, !item.lida && styles.tituloNaoLido]}>
          {item.titulo}
        </Text>
        <Text style={styles.corpo} numberOfLines={2}>
          {item.corpo}
        </Text>
        <Text style={styles.data}>
          {dt.date} às {dt.time}
        </Text>
      </View>
      {!item.lida && <View style={styles.badgeDot} />}
    </TouchableOpacity>
  );
}

export default function NotificacoesScreen({ navigation }) {
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeNotificacoes(
      uid,
      list => {
        setNotificacoes(list);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [uid]);

  const handlePress = async item => {
    if (!item.lida) await marcarComoLida(item.id);
    const config = TIPO_CONFIG[item.tipo];
    if (config?.rota) navigation.navigate(config.rota);
  };

  const handleMarcarTodas = async () => {
    if (uid) await marcarTodasComoLidas(uid);
  };

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Notificações</Text>
          {naoLidas > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{naoLidas}</Text>
            </View>
          )}
        </View>
        {naoLidas > 0 && (
          <TouchableOpacity onPress={handleMarcarTodas}>
            <Text style={styles.marcarTodas}>Ler todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notificacoes}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <NotifCard item={item} onPress={handlePress} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons
                name="notifications-off-outline"
                size={52}
                color={COLORS.GRAY}
              />
              <Text style={styles.emptyText}>Nenhuma notificação.</Text>
            </View>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: COLORS.WHITE, fontSize: 20, fontWeight: 'bold' },
  badge: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: COLORS.BLACK, fontSize: 11, fontWeight: 'bold' },
  marcarTodas: { color: COLORS.PRIMARY, fontSize: 13 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardNaoLida: {
    borderColor: COLORS.PRIMARY + '44',
    backgroundColor: '#0a1a0a',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: { flex: 1 },
  titulo: {
    color: COLORS.GRAY,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 3,
  },
  tituloNaoLido: { color: COLORS.WHITE, fontWeight: '700' },
  corpo: { color: COLORS.GRAY, fontSize: 13, lineHeight: 18 },
  data: { color: '#444', fontSize: 11, marginTop: 5 },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.PRIMARY,
    marginTop: 4,
  },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: COLORS.GRAY },
});
