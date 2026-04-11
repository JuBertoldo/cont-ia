import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { COLORS } from '../../constants/colors';
import { ROLES } from '../../constants/roles';
import { DATE_FILTERS } from '../../constants/config';
import { formatDateTime } from '../../utils/formatDate';
import { showErrorAlert } from '../../utils/errorHandler';
import { exportInventoryToCSV } from '../../services/ExportService';
import {
  subscribeInventoryHistory,
  fetchNextInventoryPage,
} from '../../services/historyService';
import { contestScan } from '../../services/inventoryService';
import { getUserProfile } from '../../services/authService';
import { auth } from '../../config/firebaseConfig';
import { useHistoryFilters } from '../../hooks/useHistoryFilters';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';

export default function HistoryScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const originFilter = route?.params?.filter || 'all';
  const customTitle = route?.params?.title || 'Histórico Completo';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(ROLES.USER);
  const [uid, setUid] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // Paginação
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const unsubscribeRef = useRef(null);

  const { filteredItems, search, setSearch, dateFilter, setDateFilter } =
    useHistoryFilters(items, originFilter);

  const stopListener = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  };

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    setLastDoc(null);
    setHasMore(false);
    try {
      stopListener();
      const unsubscribe = await subscribeInventoryHistory({
        onData: (list, userRole, newLastDoc, newHasMore) => {
          setItems(Array.isArray(list) ? list : []);
          setRole(userRole || ROLES.USER);
          setLastDoc(newLastDoc);
          setHasMore(newHasMore);
          setLoading(false);
        },
        onError: error => {
          console.error('Erro ao carregar histórico:', error);
          setItems([]);
          setErrorMessage('Não foi possível carregar o histórico.');
          setLoading(false);
        },
      });
      unsubscribeRef.current = unsubscribe;

      const currentUid = auth.currentUser?.uid || null;
      setUid(currentUid);
      if (currentUid) {
        const profile = await getUserProfile(currentUid);
        setEmpresaId(profile?.empresaId || null);
      }
    } catch (error) {
      console.error('Erro ao preparar histórico:', error);
      setItems([]);
      setErrorMessage('Não foi possível carregar o histórico.');
      setLoading(false);
    }
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !lastDoc) return;
    setLoadingMore(true);
    try {
      const {
        items: nextItems,
        lastDoc: newLastDoc,
        hasMore: newHasMore,
      } = await fetchNextInventoryPage({
        cursor: lastDoc,
        role,
        uid,
        empresaId,
      });
      setItems(prev => [...prev, ...nextItems]);
      setLastDoc(newLastDoc);
      setHasMore(newHasMore);
    } catch (error) {
      console.error('Erro ao carregar mais itens:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, lastDoc, role, uid, empresaId]);

  useEffect(() => {
    loadHistory();
    return () => stopListener();
  }, [loadHistory]);

  const screenTitle = useMemo(() => {
    if (originFilter === 'audited') return 'Itens Auditados';
    if (originFilter === 'total') return 'Itens Totais';
    return customTitle;
  }, [originFilter, customTitle]);

  const handleContest = item => {
    if (item.usuarioId === auth.currentUser?.uid) {
      Alert.alert('Atenção', 'Você não pode contestar sua própria contagem.');
      return;
    }
    if (item.usuarioRole !== ROLES.USER) {
      Alert.alert(
        'Ação não permitida',
        'Contestações entre administradores devem ser feitas via abertura de chamado.',
      );
      return;
    }
    if (item.status === 'contested') {
      Alert.alert('Já contestada', `Motivo: ${item.contestReason}`);
      return;
    }
    Alert.prompt(
      'Contestar contagem',
      'Informe o motivo da contestação:',
      async reason => {
        if (!reason?.trim()) return;
        try {
          await contestScan(item.id, reason.trim(), item.usuarioId);
          Alert.alert('Contestada', 'Contagem marcada como contestada.');
        } catch (e) {
          showErrorAlert(e);
        }
      },
      'plain-text',
    );
  };

  const handleExportCSV = async () => {
    try {
      await exportInventoryToCSV(filteredItems);
    } catch (error) {
      showErrorAlert(error, 'Não foi possível exportar CSV.');
    }
  };

  const renderItem = ({ item }) => {
    const dateInfo = item?.createdAt
      ? formatDateTime(item.createdAt)
      : { date: '-', time: '-' };
    const hasCoords = item.latitude != null && item.longitude != null;

    return (
      <View style={styles.itemCard}>
        <View style={styles.topRow}>
          <Text style={styles.itemId} numberOfLines={1}>
            {item.scanId || item.id}
          </Text>
          <Text style={styles.itemRole}>
            {item.usuarioRole || role || ROLES.USER}
          </Text>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.itemTitle}>
            {item.item || 'Não identificado'}
          </Text>
          {item.status === 'contested' && (
            <View style={styles.contestedBadge}>
              <Ionicons name="warning-outline" size={12} color="#f59e0b" />
              <Text style={styles.contestedBadgeText}>Contestada</Text>
            </View>
          )}
        </View>
        {item.status === 'contested' && (
          <Text style={styles.contestedReason}>
            Motivo: {item.contestReason}
          </Text>
        )}
        <Text style={styles.itemText}>
          Classificação: {item.classificacao || '-'}
        </Text>

        {Array.isArray(item.itens) && item.itens.length > 0 ? (
          <View style={styles.itensBox}>
            <Text style={styles.itensBoxTitle}>Itens detectados:</Text>
            {item.itens.map((it, idx) => (
              <View key={idx} style={styles.itenRow}>
                <View style={styles.itenBadge}>
                  <Text style={styles.itenBadgeText}>{it.quantidade}x</Text>
                </View>
                <Text style={styles.itenLabel}>{it.label}</Text>
                <Text style={styles.itenConf}>
                  {Math.round((it.confiancaMedia ?? 0) * 100)}%
                </Text>
              </View>
            ))}
            <Text style={styles.itenTotal}>
              Total: {item.totalGeral ?? item.quantidade ?? 0} itens
            </Text>
          </View>
        ) : (
          <Text style={styles.itemText}>
            Quantidade: {item.quantidade ?? 0}
          </Text>
        )}

        <Text style={styles.itemText}>Usuário: {item.usuarioNome || '-'}</Text>
        <Text style={styles.itemText}>Local: {item.local || '-'}</Text>

        {hasCoords && (
          <Text style={styles.itemText}>
            GPS: {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
          </Text>
        )}

        <Text style={styles.itemDate}>
          {dateInfo.date} às {dateInfo.time}
        </Text>

        {!!item.descricao && (
          <Text style={styles.itemText} numberOfLines={2}>
            {item.descricao}
          </Text>
        )}

        {!!item.fotoUrl && (
          <TouchableOpacity
            style={styles.photoBtn}
            onPress={() => {
              setPreviewUrl(item.fotoUrl);
              setPreviewVisible(true);
            }}
          >
            <Ionicons name="image-outline" size={18} color={COLORS.BLACK} />
            <Text style={styles.photoBtnText}>Ver foto</Text>
          </TouchableOpacity>
        )}

        {/* Botão Contestar — admin só pode contestar contagens de usuários comuns.
            Conflitos entre admins devem ser tratados via abertura de chamado. */}
        {role === ROLES.ADMIN &&
          item.usuarioId !== auth.currentUser?.uid &&
          item.usuarioRole === ROLES.USER &&
          item.status !== 'contested' && (
            <TouchableOpacity
              style={styles.contestBtn}
              onPress={() => handleContest(item)}
            >
              <Ionicons name="warning-outline" size={16} color="#f59e0b" />
              <Text style={styles.contestBtnText}>Contestar</Text>
            </TouchableOpacity>
          )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={[styles.title, isTablet && styles.titleTablet]}>
          {screenTitle}
        </Text>
        <TouchableOpacity onPress={handleExportCSV}>
          <Ionicons name="download-outline" size={28} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Busca */}
      <View style={styles.searchRow}>
        <Ionicons
          name="search-outline"
          size={18}
          color={COLORS.GRAY}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por item, usuário ou local..."
          placeholderTextColor={COLORS.GRAY}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.GRAY} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros de data */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dateFiltersRow}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {DATE_FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              dateFilter === f.key && styles.filterChipActive,
            ]}
            onPress={() => setDateFilter(f.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                dateFilter === f.key && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.countText}>
        {filteredItems.length} registro{filteredItems.length !== 1 ? 's' : ''}
      </Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.PRIMARY}
          style={{ marginTop: 50 }}
        />
      ) : errorMessage ? (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={70} color="#B00020" />
          <Text style={styles.emptyText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadHistory}>
            <Text style={styles.retryBtnText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="clipboard-outline" size={80} color="#333" />
          <Text style={styles.emptyText}>Nenhum item encontrado.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            isTablet && styles.listContentTablet,
          ]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={COLORS.BLACK} />
                ) : (
                  <Text style={styles.loadMoreText}>Carregar mais</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      <ImagePreviewModal
        visible={previewVisible}
        imageUrl={previewUrl}
        onClose={() => setPreviewVisible(false)}
      />
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
  title: {
    color: COLORS.WHITE,
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  titleTablet: { fontSize: 24 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.DARK,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: COLORS.WHITE,
    paddingVertical: 10,
    fontSize: 14,
  },
  dateFiltersRow: { marginBottom: 10 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.DARK,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterChipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  filterChipText: { color: COLORS.GRAY, fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: COLORS.BLACK },
  countText: {
    color: COLORS.GRAY,
    fontSize: 12,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  listContentTablet: { paddingHorizontal: 40 },
  itemCard: {
    backgroundColor: COLORS.DARK,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.PRIMARY,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  contestedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#78350f',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  contestedBadgeText: { color: '#f59e0b', fontSize: 11, fontWeight: 'bold' },
  contestedReason: {
    color: '#f59e0b',
    fontSize: 12,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  contestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
    alignSelf: 'flex-start',
  },
  contestBtnText: { color: '#f59e0b', fontSize: 13, fontWeight: '600' },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 10,
  },
  itemId: { flex: 1, color: COLORS.GRAY, fontSize: 11, fontWeight: 'bold' },
  itemRole: {
    color: COLORS.PRIMARY,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  itemTitle: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemText: { color: COLORS.GRAY, fontSize: 13, marginBottom: 3 },
  itemDate: {
    color: COLORS.PRIMARY,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  photoBtn: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  photoBtnText: { color: COLORS.BLACK, fontWeight: 'bold' },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 24,
  },
  itensBox: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 10,
    marginVertical: 6,
    gap: 6,
  },
  itensBoxTitle: {
    color: COLORS.GRAY,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  itenRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itenBadge: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 32,
    alignItems: 'center',
  },
  itenBadgeText: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 13 },
  itenLabel: { color: COLORS.WHITE, fontSize: 13, flex: 1 },
  itenConf: { color: COLORS.GRAY, fontSize: 12 },
  itenTotal: {
    color: COLORS.PRIMARY,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'right',
  },
  emptyText: {
    color: COLORS.GRAY,
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryBtnText: { color: COLORS.BLACK, fontWeight: 'bold' },
  loadMoreBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 20,
  },
  loadMoreText: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 14 },
});
