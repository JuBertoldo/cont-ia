import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../constants/colors';
import {
  respondTicket,
  TICKET_TYPES,
  TICKET_STATUS,
} from '../../services/supportService';
import { formatDateTime } from '../../utils/formatDate';

export default function TicketDetailScreen({ navigation, route }) {
  const { ticket } = route.params;
  const [status, setStatus] = useState(ticket.status);
  const [resposta, setResposta] = useState(ticket.resposta || '');
  const [saving, setSaving] = useState(false);

  const typeLabel =
    TICKET_TYPES.find(t => t.key === ticket.tipo)?.label || ticket.tipo;
  const dt = ticket.createdAt
    ? formatDateTime(ticket.createdAt)
    : { date: '-', time: '-' };

  const handleSave = async () => {
    setSaving(true);
    try {
      await respondTicket(ticket.id, { status, resposta });
      Alert.alert('Salvo!', 'Chamado atualizado com sucesso.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Erro', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.title}>{ticket.numero || 'Chamado'}</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Info do chamado */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons
              name="business-outline"
              size={16}
              color={COLORS.PRIMARY}
            />
            <Text style={styles.infoLabel}>Empresa:</Text>
            <Text style={styles.infoValue}>{ticket.empresaNome || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.infoLabel}>Admin:</Text>
            <Text style={styles.infoValue}>{ticket.adminNome || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons
              name="pricetag-outline"
              size={16}
              color={COLORS.PRIMARY}
            />
            <Text style={styles.infoLabel}>Tipo:</Text>
            <Text style={styles.infoValue}>{typeLabel}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.infoLabel}>Data:</Text>
            <Text style={styles.infoValue}>
              {dt.date} às {dt.time}
            </Text>
          </View>
        </View>

        {/* Conteúdo */}
        <View style={styles.contentCard}>
          <Text style={styles.ticketTitle}>{ticket.titulo}</Text>
          <Text style={styles.ticketDesc}>{ticket.descricao}</Text>
        </View>

        {/* Status */}
        <Text style={styles.sectionLabel}>Status</Text>
        <View style={styles.statusRow}>
          {Object.entries(TICKET_STATUS).map(([key, val]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.statusChip,
                status === key && {
                  backgroundColor: val.color,
                  borderColor: val.color,
                },
              ]}
              onPress={() => setStatus(key)}
            >
              <Text
                style={[
                  styles.statusChipText,
                  status === key && { color: COLORS.BLACK },
                ]}
              >
                {val.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Resposta */}
        <Text style={styles.sectionLabel}>Resposta para o admin</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Digite a resposta ou solução..."
          placeholderTextColor={COLORS.GRAY}
          value={resposta}
          onChangeText={setResposta}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.BLACK} />
          ) : (
            <>
              <Ionicons
                name="checkmark-outline"
                size={20}
                color={COLORS.BLACK}
              />
              <Text style={styles.saveText}>SALVAR RESPOSTA</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    marginBottom: 16,
  },
  title: { color: COLORS.WHITE, fontSize: 20, fontWeight: 'bold' },
  infoCard: {
    backgroundColor: COLORS.DARK,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 14,
    gap: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { color: COLORS.GRAY, fontSize: 13 },
  infoValue: { color: COLORS.WHITE, fontSize: 13, fontWeight: '600', flex: 1 },
  contentCard: {
    backgroundColor: '#0a1a0a',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.PRIMARY,
  },
  ticketTitle: {
    color: COLORS.WHITE,
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  ticketDesc: { color: COLORS.GRAY, fontSize: 14, lineHeight: 22 },
  sectionLabel: {
    color: COLORS.GRAY,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: COLORS.DARK,
  },
  statusChipText: { color: COLORS.GRAY, fontWeight: '600', fontSize: 13 },
  input: {
    backgroundColor: COLORS.DARK,
    borderRadius: 12,
    padding: 14,
    color: COLORS.WHITE,
    fontSize: 14,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: { height: 120 },
  saveBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    margin: 20,
  },
  saveText: { color: COLORS.BLACK, fontWeight: 'bold', fontSize: 15 },
});
