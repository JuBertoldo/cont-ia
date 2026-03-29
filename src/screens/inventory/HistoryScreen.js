import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../../config/firebaseConfig';
import { COLORS } from '../../constants/colors';
import { formatDateTime } from '../../utils/formatDate';
import { exportInventoryToCSV } from '../../services/ExportService';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';

export default function HistoryScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const filter = route?.params?.filter || 'all';
  const customTitle = route?.params?.title || 'Histórico Completo';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('user');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    let unsubscribe = null;

    const loadHistory = async () => {
      try {
        if (!auth.currentUser) {
          setLoading(false);
          return;
        }

        const userSnap = await getDoc(doc(db, 'usuarios', auth.currentUser.uid));
        const currentRole = userSnap.exists() ? userSnap.data().role || 'user' : 'user';
        setRole(currentRole);

        const q =
          currentRole === 'admin'
            ? query(collection(db, 'inventario'), orderBy('createdAt', 'desc'))
            : query(
                collection(db, 'inventario'),
                where('usuarioId', '==', auth.currentUser.uid),
                orderBy('createdAt', 'desc')
              );

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const list = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }));

            setItems(list);
            setLoading(false);
          },
          (error) => {
            console.error('Erro ao carregar histórico:', error);
            Alert.alert('Erro', 'Não foi possível carregar o histórico.');
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Erro ao preparar histórico:', error);
        setLoading(false);
      }
    };

    loadHistory();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (filter === 'audited') {
      return items.filter((item) => item.origem === 'scanner');
    }

    // 'total' e 'all' retornam todos os itens
    return items;
  }, [items, filter]);

  const screenTitle = useMemo(() => {
    if (filter === 'audited') return 'Itens Auditados';
    if (filter === 'total') return 'Itens Totais';
    return customTitle;
  }, [filter, customTitle]);

  const handleExportCSV = async () => {
    try {
      await exportInventoryToCSV(filteredItems);
    } catch (error) {
      Alert.alert('Erro', error.message || 'Não foi possível exportar CSV.');
    }
  };

  const openPreview = (url) => {
    setPreviewUrl(url);
    setPreviewVisible(true);
  };

  const renderItem = ({ item }) => {
    const dateInfo = formatDateTime(item.createdAt);

    return (
      <View style={styles.itemCard}>
        <View style={styles.topRow}>
          <Text style={styles.itemId}>{item.scanId || item.id}</Text>
          <Text style={styles.itemRole}>{item.usuarioRole || 'user'}</Text>
        </View>

        <Text style={styles.itemTitle}>{item.item || 'Não identificado'}</Text>
        <Text style={styles.itemText}>Classificação: {item.classificacao || '-'}</Text>
        <Text style={styles.itemText}>Quantidade: {item.quantidade ?? 0}</Text>
        <Text style={styles.itemText}>Repetidos: {item.repetidos ?? 0}</Text>
        <Text style={styles.itemText}>Usuário: {item.usuarioNome || '-'}</Text>
        <Text style={styles.itemText}>Local: {item.local || '-'}</Text>

        <Text style={styles.itemDate}>
          {dateInfo.date} às {dateInfo.time}
        </Text>

        {!!item.descricao && (
          <Text style={styles.itemText} numberOfLines={2}>
            {item.descricao}
          </Text>
        )}

        {!!item.fotoUrl && (
          <TouchableOpacity style={styles.photoBtn} onPress={() => openPreview(item.fotoUrl)}>
            <Ionicons name="image-outline" size={18} color={COLORS.BLACK} />
            <Text style={styles.photoBtnText}>Ver foto</Text>
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

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.PRIMARY} style={{ marginTop: 50 }} />
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="clipboard-outline" size={80} color="#333" />
          <Text style={styles.emptyText}>Nenhum item encontrado.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, isTablet && styles.listContentTablet]}
          showsVerticalScrollIndicator={false}
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
    marginBottom: 20,
  },
  title: { color: COLORS.WHITE, fontSize: 20, fontWeight: 'bold' },
  titleTablet: { fontSize: 24 },
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
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 10 },
  itemId: { flex: 1, color: COLORS.GRAY, fontSize: 11, fontWeight: 'bold' },
  itemRole: {
    color: COLORS.PRIMARY,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  itemTitle: { color: COLORS.WHITE, fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  itemText: { color: COLORS.GRAY, fontSize: 14, marginBottom: 4 },
  itemDate: { color: COLORS.PRIMARY, fontSize: 12, marginTop: 8, marginBottom: 8 },
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
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyText: { color: COLORS.GRAY, marginTop: 20, fontSize: 16 },
});