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
  TICKET_TRANSITIONS,
  TICKET_SLA,
  getSlaInfo,
} from '../../services/supportService';
import { formatDateTime } from '../../utils/formatDate';

function SlaRow({ label, deadline, resolvedAt }) {
  if (resolvedAt) {
    return (
      <View style={slaStyles.row}>
        <Text style={slaStyles.label}>{label}</Text>
        <Text style={[slaStyles.value, { color: '#22c55e' }]}>✓ Concluído</Text>
      </View>
    );
  }
  if (!deadline) return null;
  const info = getSlaInfo(deadline);
  if (!info) return null;
  const d = deadline?.toDate ? deadline.toDate() : new Date(deadline);
  const dateStr = d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <View style={slaStyles.row}>
      <Text style={slaStyles.label}>{label}</Text>
      <View style={[slaStyles.badge, { backgroundColor: info.color + '22' }]}>
        <View style={[slaStyles.dot, { backgroundColor: info.color }]} />
        <Text style={[slaStyles.value, { color: info.color }]}>
          {info.label} · prazo {dateStr}
        </Text>
      </View>
    </View>
  );
}

const slaStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  label: { color: COLORS.GRAY, fontSize: 12, minWidth: 80 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  value: { fontSize: 12, fontWeight: '600' },
});

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

  const sla = TICKET_SLA[ticket.tipo] ?? TICKET_SLA.outro;
  const allowedTransitions = TICKET_TRANSITIONS[ticket.status] ?? [];

  const handleSave = async () => {
    if (status !== ticket.status && !allowedTransitions.includes(status)) {
      Alert.alert(
        'Transição inválida',
        'Esta mudança de status não é permitida.',
      );
      return;
    }
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

        {/* Prioridade + reaberturas */}
        <View style={styles.metaRow}>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: sla.prioridadeColor + '22' },
            ]}
          >
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: sla.prioridadeColor },
              ]}
            />
            <Text style={[styles.priorityText, { color: sla.prioridadeColor }]}>
              Prioridade {sla.prioridade}
            </Text>
          </View>
          {(ticket.reaberturas ?? 0) > 0 && (
            <View style={styles.reaberturasBadge}>
              <Text style={styles.reaberturasText}>
                ↩ Reaberto {ticket.reaberturas}x
              </Text>
            </View>
          )}
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
            <Text style={styles.infoLabel}>Solicitante:</Text>
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
            <Text style={styles.infoLabel}>Aberto em:</Text>
            <Text style={styles.infoValue}>
              {dt.date} às {dt.time}
            </Text>
          </View>
        </View>

        {/* SLA */}
        <Text style={styles.sectionLabel}>SLA</Text>
        <View style={styles.slaCard}>
          <SlaRow
            label="1ª resposta"
            deadline={ticket.slaRespostaSuporteAt}
            resolvedAt={ticket.primeiraRespostaAt}
          />
          <SlaRow
            label="Resolução"
            deadline={ticket.slaResolucaoAt}
            resolvedAt={ticket.resolvidoAt}
          />
          {ticket.slaRespostaClienteAt && (
            <SlaRow label="Cliente" deadline={ticket.slaRespostaClienteAt} />
          )}
        </View>

        {/* Conteúdo */}
        <Text style={styles.sectionLabel}>Descrição</Text>
        <View style={styles.contentCard}>
          <Text style={styles.ticketTitle}>{ticket.titulo}</Text>
          <Text style={styles.ticketDesc}>{ticket.descricao}</Text>
        </View>

        {/* Status — só mostra transições permitidas */}
        <Text style={styles.sectionLabel}>Alterar status</Text>
        <View style={styles.statusRow}>
          {[ticket.status, ...allowedTransitions].map(key => {
            const val = TICKET_STATUS[key];
            if (!val) return null;
            const isSelected = status === key;
            const isCurrent = key === ticket.status;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.statusChip,
                  isSelected && {
                    backgroundColor: val.color,
                    borderColor: val.color,
                  },
                  isCurrent && !isSelected && styles.statusChipCurrent,
                ]}
                onPress={() => setStatus(key)}
              >
                {isCurrent && <Text style={styles.currentDot}>● </Text>}
                <Text
                  style={[
                    styles.statusChipText,
                    isSelected && { color: COLORS.BLACK },
                  ]}
                >
                  {val.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Resposta */}
        <Text style={styles.sectionLabel}>Resposta ao solicitante</Text>
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

        {ticket.respondidoPor ? (
          <Text style={styles.respondidoPor}>
            Última resposta: {ticket.respondidoPor}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
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
    marginBottom: 12,
  },
  title: { color: COLORS.WHITE, fontSize: 20, fontWeight: 'bold' },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priorityDot: { width: 7, height: 7, borderRadius: 4 },
  priorityText: { fontSize: 12, fontWeight: '600' },
  reaberturasBadge: {
    backgroundColor: '#2a1a00',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reaberturasText: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },
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
  sectionLabel: {
    color: COLORS.GRAY,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  slaCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  contentCard: {
    backgroundColor: '#0a1a0a',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
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
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: COLORS.DARK,
  },
  statusChipCurrent: { borderColor: '#555' },
  currentDot: { color: COLORS.PRIMARY, fontSize: 8 },
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
  textArea: { height: 130, marginBottom: 8 },
  respondidoPor: {
    color: '#444',
    fontSize: 11,
    marginHorizontal: 20,
    marginBottom: 12,
  },
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
