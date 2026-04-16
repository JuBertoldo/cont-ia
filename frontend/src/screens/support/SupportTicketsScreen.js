import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import {
  subscribeAllTickets,
  TICKET_STATUS,
  TICKET_SLA,
  getSlaInfo,
} from '../../services/supportService';
import { formatDateTime } from '../../utils/formatDate';

const STATUS_FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'aberto', label: 'Abertos' },
  { key: 'em_andamento', label: 'Em andamento' },
  { key: 'aguardando_cliente', label: 'Aguardando' },
  { key: 'resolvido', label: 'Resolvidos' },
];

function SlaChip({ deadline, label }) {
  const info = getSlaInfo(deadline);
  if (!info) return null;
  return (
    <View style={[slaStyles.chip, { backgroundColor: info.color + '22' }]}>
      <View style={[slaStyles.dot, { backgroundColor: info.color }]} />
      <Text style={[slaStyles.text, { color: info.color }]}>
        {label}: {info.label}
      </Text>
    </View>
  );
}

const slaStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: '600' },
});

export default function SupportTicketsScreen({ navigation }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const unsubRef = useRef(null);

  useEffect(() => {
    unsubRef.current = subscribeAllTickets(
      list => {
        setTickets(list);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsubRef.current?.();
  }, []);

  const filtered = tickets.filter(t => {
    const matchStatus = statusFilter === 'todos' || t.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.titulo?.toLowerCase().includes(q) ||
      t.empresaNome?.toLowerCase().includes(q) ||
      t.numero?.toLowerCase().includes(q) ||
      t.adminNome?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const renderItem = ({ item }) => {
    const st = TICKET_STATUS[item.status] ?? TICKET_STATUS.aberto;
    const sla = TICKET_SLA[item.tipo] ?? TICKET_SLA.outro;
    const dt = item.createdAt
      ? formatDateTime(item.createdAt)
      : { date: '-', time: '-' };

    const isAguardandoCliente = item.status === 'aguardando_cliente';
    const isAberto = item.status === 'aberto';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate(ROUTES.SUPER_ADMIN_TICKET, { ticket: item })
        }
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <Text style={styles.numero}>{item.numero ?? 'CONTIA-????'}</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: sla.prioridadeColor },
              ]}
            />
            <Text style={styles.priority}>{sla.prioridade}</Text>
            <View
              style={[styles.statusBadge, { backgroundColor: st.color + '22' }]}
            >
              <Text style={[styles.statusText, { color: st.color }]}>
                {st.label}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.titulo} numberOfLines={1}>
          {item.titulo}
        </Text>
        <Text style={styles.empresa}>
          {item.empresaNome} · {item.adminNome}
        </Text>

        {/* SLA chips */}
        {isAberto && !item.primeiraRespostaAt && (
          <SlaChip deadline={item.slaRespostaSuporteAt} label="Resposta" />
        )}
        {isAguardandoCliente && (
          <SlaChip deadline={item.slaRespostaClienteAt} label="Cliente" />
        )}
        {item.status !== 'resolvido' && (
          <SlaChip deadline={item.slaResolucaoAt} label="Resolução" />
        )}

        {item.reaberturas > 0 && (
          <Text style={styles.reaberturas}>↩ Reaberto {item.reaberturas}x</Text>
        )}

        <Text style={styles.date}>
          {dt.date} às {dt.time}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chamados</Text>
        <Text style={styles.count}>
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Busca */}
      <View style={styles.searchRow}>
        <Ionicons
          name="search-outline"
          size={16}
          color={COLORS.GRAY}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por número, empresa, solicitante..."
          placeholderTextColor={COLORS.GRAY}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.GRAY} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros de status */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersRow}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {STATUS_FILTERS.map(f => {
          const isActive = statusFilter === f.key;
          const st = TICKET_STATUS[f.key];
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setStatusFilter(f.key)}
            >
              {st && (
                <View style={[styles.chipDot, { backgroundColor: st.color }]} />
              )}
              <Text
                style={[styles.chipText, isActive && styles.chipTextActive]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={COLORS.PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhum chamado encontrado.</Text>
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
    marginBottom: 12,
  },
  title: { color: COLORS.WHITE, fontSize: 22, fontWeight: 'bold' },
  count: { color: COLORS.GRAY, fontSize: 13 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  searchInput: { flex: 1, color: COLORS.WHITE, fontSize: 13 },
  filtersRow: { marginBottom: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
  },
  chipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { color: COLORS.GRAY, fontSize: 12 },
  chipTextActive: { color: COLORS.BLACK, fontWeight: 'bold' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  numero: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priorityDot: { width: 7, height: 7, borderRadius: 4 },
  priority: { color: COLORS.GRAY, fontSize: 11 },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  titulo: {
    color: COLORS.WHITE,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 3,
  },
  empresa: { color: COLORS.GRAY, fontSize: 12, marginBottom: 2 },
  reaberturas: { color: '#f59e0b', fontSize: 11, marginTop: 4 },
  date: { color: '#444', fontSize: 11, marginTop: 6 },
  empty: { color: COLORS.GRAY, textAlign: 'center', marginTop: 40 },
});
