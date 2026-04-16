import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../constants/colors';
import { translateLabel } from '../../utils/labelTranslation';
import {
  getScansParaDataset,
  getDatasetStats,
  validarScan,
  rejeitarScan,
} from '../../services/superAdminService';
import { formatDateTime } from '../../utils/formatDate';

const STATUS_FILTERS = [
  {
    key: 'pendente',
    label: 'Pendentes',
    icon: 'time-outline',
    color: '#f59e0b',
  },
  {
    key: 'validado',
    label: 'Validados',
    icon: 'checkmark-circle-outline',
    color: '#22c55e',
  },
  {
    key: 'rejeitado',
    label: 'Rejeitados',
    icon: 'close-circle-outline',
    color: '#ef4444',
  },
  { key: 'todos', label: 'Todos', icon: 'list-outline', color: COLORS.GRAY },
];

/**
 * Monta a lista de labels para validação com base nos dados do scan.
 * Prioridade: correções do usuário > detecções com alta confiança.
 */
function montarLabelsParaValidar(scan) {
  if (scan.correcoes?.length > 0) {
    return scan.correcoes.map(c => ({
      label: c.labelCorrigido || c.labelOriginal,
      labelOriginal: c.labelOriginal,
      bbox: c.bbox || [],
      confidence: c.confianca || 0,
      source: 'correcao_usuario',
    }));
  }

  const deteccoes = (scan.detections || scan.itens || [])
    .filter(d => (d.confidence ?? d.confiancaMedia ?? 0) >= 0.6)
    .map(d => ({
      label: d.label,
      labelOriginal: d.label,
      bbox: d.bbox || [],
      confidence: d.confidence ?? d.confiancaMedia ?? 0,
      source: 'yolo',
    }));

  return deteccoes;
}

function ScanCard({ item, onValidar, onRejeitar, saving }) {
  const [fotoExpanded, setFotoExpanded] = useState(false);
  const [labelsEditados, setLabelsEditados] = useState(() =>
    montarLabelsParaValidar(item),
  );
  const [editandoIdx, setEditandoIdx] = useState(null);
  const [editText, setEditText] = useState('');

  const dt = item.createdAt
    ? formatDateTime(item.createdAt)
    : { date: '-', time: '-' };
  const jaValidado = item.statusDataset === 'validado';
  const jaRejeitado = item.statusDataset === 'rejeitado';

  const iniciarEdicao = (idx, labelAtual) => {
    setEditandoIdx(idx);
    setEditText(labelAtual);
  };

  const confirmarEdicao = () => {
    const nome = editText.trim();
    if (nome && editandoIdx !== null) {
      setLabelsEditados(prev =>
        prev.map((l, i) =>
          i === editandoIdx ? { ...l, label: nome, editadoPorAdmin: true } : l,
        ),
      );
    }
    setEditandoIdx(null);
  };

  const cancelarEdicao = () => setEditandoIdx(null);

  return (
    <View style={styles.card}>
      {/* Status badge */}
      {(jaValidado || jaRejeitado) && (
        <View
          style={[
            styles.statusBadge,
            jaValidado ? styles.badgeValidado : styles.badgeRejeitado,
          ]}
        >
          <Ionicons
            name={jaValidado ? 'checkmark-circle' : 'close-circle'}
            size={13}
            color={jaValidado ? '#22c55e' : '#ef4444'}
          />
          <Text
            style={[
              styles.statusBadgeText,
              { color: jaValidado ? '#22c55e' : '#ef4444' },
            ]}
          >
            {jaValidado ? 'Validado' : 'Rejeitado'}
          </Text>
        </View>
      )}

      {/* Foto */}
      <TouchableOpacity
        onPress={() => setFotoExpanded(e => !e)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: item.fotoUrl }}
          style={[styles.foto, fotoExpanded && styles.fotoExpanded]}
          resizeMode="cover"
        />
        <View style={styles.fotoHint}>
          <Ionicons
            name={fotoExpanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="#fff"
          />
          <Text style={styles.fotoHintText}>
            {fotoExpanded ? 'Diminuir' : 'Ampliar foto'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Metadados */}
      <View style={styles.meta}>
        <Text style={styles.metaEmpresa}>
          {item.empresaNome || item.empresaId || '—'}
        </Text>
        <Text style={styles.metaDate}>
          {dt.date} às {dt.time}
        </Text>
        {item.usuarioNome ? (
          <Text style={styles.metaUser}>por {item.usuarioNome}</Text>
        ) : null}
      </View>

      {/* Labels para validar / editar */}
      <Text style={styles.labelsTitle}>
        {labelsEditados.length > 0
          ? `${labelsEditados.length} objeto${
              labelsEditados.length !== 1 ? 's' : ''
            } — toque para editar o nome:`
          : 'Nenhum objeto detectado com confiança suficiente'}
      </Text>

      {labelsEditados.length > 0 ? (
        <View style={styles.labelsContainer}>
          {labelsEditados.map((l, i) => {
            const isEditing = editandoIdx === i;
            const foiCorrigido =
              l.source === 'correcao_usuario' || l.editadoPorAdmin;

            if (isEditing) {
              return (
                <View key={i} style={styles.editRow}>
                  <TextInput
                    style={styles.editInput}
                    value={editText}
                    onChangeText={setEditText}
                    autoFocus
                    placeholder="Nome correto do objeto..."
                    placeholderTextColor="#555"
                    onSubmitEditing={confirmarEdicao}
                  />
                  <TouchableOpacity
                    onPress={confirmarEdicao}
                    style={styles.editBtn}
                  >
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={COLORS.PRIMARY}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={cancelarEdicao}
                    style={styles.editBtn}
                  >
                    <Ionicons name="close" size={20} color={COLORS.GRAY} />
                  </TouchableOpacity>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={i}
                style={[styles.chip, foiCorrigido && styles.chipCorrigido]}
                onPress={() => iniciarEdicao(i, l.label)}
                activeOpacity={0.7}
              >
                <View style={styles.chipContent}>
                  <Text style={styles.chipLabel}>{l.label}</Text>
                  {l.labelOriginal && l.labelOriginal !== l.label && (
                    <Text style={styles.chipOriginal}>
                      era: {translateLabel(l.labelOriginal)}
                    </Text>
                  )}
                  <Text style={styles.chipConf}>
                    {Math.round((l.confidence ?? 0) * 100)}%
                  </Text>
                </View>
                <Ionicons
                  name="pencil-outline"
                  size={12}
                  color={foiCorrigido ? COLORS.PRIMARY : COLORS.GRAY}
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={styles.noLabels}>
          Confiança abaixo de 60% — recomendado rejeitar.
        </Text>
      )}

      {/* Ações */}
      {!jaValidado && !jaRejeitado ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btnRejeitar, saving && { opacity: 0.5 }]}
            onPress={() => onRejeitar(item.id)}
            disabled={saving}
          >
            <Ionicons name="close" size={18} color="#ef4444" />
            <Text style={styles.btnRejeitarText}>Rejeitar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btnValidar,
              (saving || labelsEditados.length === 0) && { opacity: 0.5 },
            ]}
            onPress={() => onValidar(item.id, labelsEditados)}
            disabled={saving || labelsEditados.length === 0}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.BLACK} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={COLORS.BLACK} />
                <Text style={styles.btnValidarText}>Validar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.btnDesfazer}
          onPress={() =>
            Alert.alert(
              'Desfazer?',
              'Isso tornará o scan pendente novamente.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Desfazer', onPress: () => onRejeitar(item.id, true) },
              ],
            )
          }
        >
          <Text style={styles.btnDesfazerText}>Desfazer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ValidacaoDatasetScreen({ navigation }) {
  const [filtro, setFiltro] = useState('pendente');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stats, setStats] = useState(null);
  const [saving, setSaving] = useState(false);

  const carregarStats = useCallback(async () => {
    try {
      const s = await getDatasetStats();
      setStats(s);
    } catch (_) {}
  }, []);

  const carregar = useCallback(async (status, cursor = null) => {
    if (!cursor) setLoading(true);
    try {
      const result = await getScansParaDataset(status, cursor);
      setItems(prev => (cursor ? [...prev, ...result.items] : result.items));
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (e) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    carregarStats();
    carregar(filtro);
  }, [filtro, carregar, carregarStats]);

  const handleValidar = async (id, labels) => {
    setSaving(true);
    try {
      await validarScan(id, labels);
      setItems(prev =>
        prev.map(i =>
          i.id === id
            ? { ...i, statusDataset: 'validado', labelsValidados: labels }
            : i,
        ),
      );
      carregarStats();
    } catch (e) {
      Alert.alert('Erro', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRejeitar = async (id, desfazer = false) => {
    setSaving(true);
    try {
      if (desfazer) {
        await validarScan(id, []); // limpa — volta a pendente via statusDataset='pendente'
        // Na prática, marcar como pendente:
        const { updateDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../../config/firebaseConfig');
        await updateDoc(doc(db, 'inventario', id), {
          statusDataset: 'pendente',
          labelsValidados: [],
          validadoPor: null,
          validadoEm: null,
        });
        setItems(prev =>
          prev.map(i =>
            i.id === id ? { ...i, statusDataset: 'pendente' } : i,
          ),
        );
      } else {
        await rejeitarScan(id);
        setItems(prev =>
          prev.map(i =>
            i.id === id ? { ...i, statusDataset: 'rejeitado' } : i,
          ),
        );
      }
      carregarStats();
    } catch (e) {
      Alert.alert('Erro', e.message);
    } finally {
      setSaving(false);
    }
  };

  const carregarMais = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    carregar(filtro, lastDoc);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>Dataset de Treino</Text>
        <TouchableOpacity
          onPress={() => {
            carregarStats();
            carregar(filtro);
          }}
        >
          <Ionicons name="refresh-outline" size={24} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: '#f59e0b' }]}>
              {stats.pendentes}
            </Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: '#22c55e' }]}>
              {stats.validados}
            </Text>
            <Text style={styles.statLabel}>Validados</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: '#ef4444' }]}>
              {stats.rejeitados}
            </Text>
            <Text style={styles.statLabel}>Rejeitados</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total c/ foto</Text>
          </View>
        </View>
      )}

      {/* Aviso de prontidão para treino */}
      {stats && stats.validados >= 100 && (
        <View style={styles.readyBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
          <Text style={styles.readyText}>
            {stats.validados} imagens validadas — pronto para exportar e
            treinar!
          </Text>
        </View>
      )}
      {stats && stats.validados < 100 && (
        <View style={styles.waitBanner}>
          <Ionicons name="time-outline" size={16} color="#f59e0b" />
          <Text style={styles.waitText}>
            {stats.validados}/100 imagens validadas para o primeiro treino
          </Text>
        </View>
      )}

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersRow}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {STATUS_FILTERS.map(f => {
          const isActive = filtro === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                isActive && { backgroundColor: f.color, borderColor: f.color },
              ]}
              onPress={() => setFiltro(f.key)}
            >
              <Ionicons
                name={f.icon}
                size={13}
                color={isActive ? COLORS.BLACK : COLORS.GRAY}
              />
              <Text
                style={[
                  styles.filterText,
                  isActive && { color: COLORS.BLACK, fontWeight: 'bold' },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Lista */}
      {loading ? (
        <ActivityIndicator color={COLORS.PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <ScanCard
              item={item}
              onValidar={handleValidar}
              onRejeitar={handleRejeitar}
              saving={saving}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={carregarMais}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={COLORS.PRIMARY} /> : null
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="images-outline" size={52} color={COLORS.GRAY} />
              <Text style={styles.emptyText}>
                {filtro === 'pendente'
                  ? 'Nenhum scan pendente.\nTodos já foram validados!'
                  : 'Nenhum item nesta categoria.'}
              </Text>
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
    marginBottom: 12,
  },
  title: { color: COLORS.WHITE, fontSize: 20, fontWeight: 'bold' },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 10,
  },
  stat: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  statVal: { color: COLORS.WHITE, fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: COLORS.GRAY, fontSize: 10, marginTop: 2 },
  readyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0a1f0a',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  readyText: { color: '#22c55e', fontSize: 12, flex: 1 },
  waitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1200',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  waitText: { color: '#f59e0b', fontSize: 12, flex: 1 },
  filtersRow: { marginBottom: 10 },
  filterChip: {
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
  filterText: { color: COLORS.GRAY, fontSize: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#111',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0a0a0a',
  },
  badgeValidado: { borderBottomWidth: 1, borderBottomColor: '#22c55e22' },
  badgeRejeitado: { borderBottomWidth: 1, borderBottomColor: '#ef444422' },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  foto: { width: '100%', height: 200 },
  fotoExpanded: { height: 380 },
  fotoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'absolute',
    bottom: 8,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fotoHintText: { color: '#fff', fontSize: 11 },
  meta: { padding: 12, paddingBottom: 4 },
  metaEmpresa: { color: COLORS.WHITE, fontWeight: '600', fontSize: 13 },
  metaDate: { color: COLORS.GRAY, fontSize: 11, marginTop: 2 },
  metaUser: { color: COLORS.GRAY, fontSize: 11 },
  labelsTitle: {
    color: COLORS.GRAY,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
  },
  labelsContainer: { paddingHorizontal: 12, marginBottom: 12, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  chipCorrigido: { borderColor: COLORS.PRIMARY, backgroundColor: '#0a1a0a' },
  chipContent: { flex: 1 },
  chipLabel: { color: COLORS.WHITE, fontWeight: '600', fontSize: 14 },
  chipOriginal: { color: COLORS.GRAY, fontSize: 11, marginTop: 2 },
  chipConf: { color: COLORS.GRAY, fontSize: 11, marginTop: 1 },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  editInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.WHITE,
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: COLORS.PRIMARY,
  },
  editBtn: { padding: 6 },
  noLabels: {
    color: '#ef4444',
    fontSize: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  btnRejeitar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 12,
  },
  btnRejeitarText: { color: '#ef4444', fontWeight: '600' },
  btnValidar: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
  },
  btnValidarText: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 15 },
  btnDesfazer: {
    margin: 12,
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  btnDesfazerText: { color: COLORS.GRAY, fontSize: 12 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: COLORS.GRAY, textAlign: 'center', lineHeight: 22 },
});
