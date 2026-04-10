import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../constants/colors';
import { auth } from '../../config/firebaseConfig';
import { getUserProfile } from '../../services/authService';
import {
  createTicket,
  subscribeCompanyTickets,
  TICKET_TYPES,
  TICKET_STATUS,
} from '../../services/supportService';
import { formatDateTime } from '../../utils/formatDate';

export default function SupportScreen({ navigation }) {
  const [_empresaId, setEmpresaId] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form novo chamado
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState('problema');
  const [submitting, setSubmitting] = useState(false);

  const unsubRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      if (!auth.currentUser) return;
      const profile = await getUserProfile(auth.currentUser.uid);
      const empId = profile?.empresaId;
      setEmpresaId(empId);

      if (empId) {
        unsubRef.current = subscribeCompanyTickets(
          empId,
          list => {
            setTickets(list);
            setLoading(false);
          },
          () => setLoading(false),
        );
      } else {
        setLoading(false);
      }
    };
    init();
    return () => unsubRef.current?.();
  }, []);

  const handleSubmit = async () => {
    if (!titulo.trim()) {
      Alert.alert('Atenção', 'Digite um título para o chamado.');
      return;
    }
    if (!descricao.trim()) {
      Alert.alert('Atenção', 'Descreva o problema ou solicitação.');
      return;
    }
    setSubmitting(true);
    try {
      const { numero } = await createTicket({ titulo, descricao, tipo });
      Alert.alert(
        'Chamado aberto!',
        `Número do chamado: #${numero}\n\nNossa equipe irá analisar em breve.`,
      );
      setTitulo('');
      setDescricao('');
      setTipo('problema');
      setShowForm(false);
    } catch (e) {
      Alert.alert('Erro', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const statusInfo = status => TICKET_STATUS[status] || TICKET_STATUS.aberto;

  const renderTicket = ({ item }) => {
    const st = statusInfo(item.status);
    const dt = item.createdAt
      ? formatDateTime(item.createdAt)
      : { date: '-', time: '-' };
    const typeLabel =
      TICKET_TYPES.find(t => t.key === item.tipo)?.label || item.tipo;

    return (
      <View
        style={[
          styles.card,
          item.status === 'resolvido' && styles.cardResolved,
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardNumero}>{item.numero || 'CONTIA-????'}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: st.color + '22', borderColor: st.color },
            ]}
          >
            <Text style={[styles.statusText, { color: st.color }]}>
              {st.label}
            </Text>
          </View>
        </View>
        <Text style={styles.cardTitulo} numberOfLines={1}>
          {item.titulo}
        </Text>
        <Text style={styles.cardType}>{typeLabel}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.descricao}
        </Text>
        {!!item.resposta && (
          <View style={styles.responseBox}>
            <Ionicons
              name="chatbubble-outline"
              size={14}
              color={COLORS.PRIMARY}
            />
            <Text style={styles.responseText}>{item.resposta}</Text>
          </View>
        )}
        <Text style={styles.cardDate}>
          {dt.date} às {dt.time}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.title}>Suporte</Text>
          <TouchableOpacity onPress={() => setShowForm(!showForm)}>
            <Ionicons
              name={showForm ? 'close-outline' : 'add-circle-outline'}
              size={28}
              color={COLORS.PRIMARY}
            />
          </TouchableOpacity>
        </View>

        {/* Formulário novo chamado */}
        {showForm && (
          <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.formTitle}>Novo Chamado</Text>

            {/* Tipo */}
            <Text style={styles.label}>Tipo</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.typeRow}
              contentContainerStyle={{ gap: 8 }}
            >
              {TICKET_TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.typeChip,
                    tipo === t.key && styles.typeChipActive,
                  ]}
                  onPress={() => setTipo(t.key)}
                >
                  <Ionicons
                    name={t.icon}
                    size={14}
                    color={tipo === t.key ? COLORS.BLACK : COLORS.GRAY}
                  />
                  <Text
                    style={[
                      styles.typeChipText,
                      tipo === t.key && styles.typeChipTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Título</Text>
            <TextInput
              style={styles.input}
              placeholder="Resumo do chamado"
              placeholderTextColor={COLORS.GRAY}
              value={titulo}
              onChangeText={setTitulo}
              maxLength={80}
            />

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descreva o problema ou solicitação em detalhes..."
              placeholderTextColor={COLORS.GRAY}
              value={descricao}
              onChangeText={setDescricao}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.BLACK} />
              ) : (
                <>
                  <Ionicons
                    name="send-outline"
                    size={18}
                    color={COLORS.BLACK}
                  />
                  <Text style={styles.submitText}>ABRIR CHAMADO</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Lista de chamados */}
        {!showForm && (
          <>
            <Text style={styles.sectionLabel}>
              {tickets.length} chamado{tickets.length !== 1 ? 's' : ''} da
              empresa
            </Text>
            {loading ? (
              <ActivityIndicator
                size="large"
                color={COLORS.PRIMARY}
                style={{ marginTop: 40 }}
              />
            ) : (
              <FlatList
                data={tickets}
                keyExtractor={i => i.id}
                renderItem={renderTicket}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <Ionicons name="headset-outline" size={60} color="#333" />
                    <Text style={styles.emptyText}>
                      Nenhum chamado aberto.{'\n'}Toque em + para abrir um.
                    </Text>
                  </View>
                }
              />
            )}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
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
  form: { paddingHorizontal: 20 },
  formTitle: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    color: COLORS.GRAY,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 12,
  },
  typeRow: { marginBottom: 4 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.DARK,
    borderWidth: 1,
    borderColor: '#333',
  },
  typeChipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  typeChipText: { color: COLORS.GRAY, fontSize: 12 },
  typeChipTextActive: { color: COLORS.BLACK, fontWeight: 'bold' },
  input: {
    backgroundColor: COLORS.DARK,
    borderRadius: 12,
    padding: 14,
    color: COLORS.WHITE,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: { height: 100, marginTop: 0 },
  submitBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    marginBottom: 30,
  },
  submitText: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 15 },
  sectionLabel: {
    color: COLORS.GRAY,
    fontSize: 12,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  card: {
    backgroundColor: COLORS.DARK,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  cardResolved: { borderLeftColor: '#22c55e', opacity: 0.85 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardNumero: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  cardTitulo: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  cardType: { color: COLORS.GRAY, fontSize: 12, marginBottom: 6 },
  cardDesc: { color: COLORS.GRAY, fontSize: 13, lineHeight: 18 },
  responseBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#0d1f12',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    alignItems: 'flex-start',
  },
  responseText: {
    color: COLORS.PRIMARY,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  cardDate: { color: '#444', fontSize: 11, marginTop: 8 },
  empty: { alignItems: 'center', marginTop: 60, gap: 16 },
  emptyText: { color: COLORS.GRAY, textAlign: 'center', lineHeight: 22 },
});
