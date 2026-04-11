import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../constants/colors';

const SECTIONS = [
  {
    title: '1. Quais dados coletamos',
    body: 'Nome, e-mail, matrícula e foto de perfil fornecidos no cadastro.\n\nFotos capturadas durante as contagens, coordenadas de GPS (quando disponíveis) e o nome do local informado.\n\nDados de uso: data, horário e resultado de cada contagem.',
  },
  {
    title: '2. Por que coletamos',
    body: 'Para identificar o usuário, registrar as contagens com autoria e local, gerar histórico auditável e permitir exportação de relatórios pela empresa.',
  },
  {
    title: '3. Como armazenamos',
    body: 'Todos os dados são armazenados nos servidores do Google Firebase (Firestore e Storage), com criptografia em trânsito e em repouso, em servidores nos Estados Unidos.',
  },
  {
    title: '4. Compartilhamento',
    body: 'Seus dados não são vendidos nem compartilhados com terceiros.\n\nO administrador da sua empresa tem acesso a todos os registros de contagem realizados na organização.',
  },
  {
    title: '5. Seus direitos (LGPD)',
    body: 'Você pode solicitar a qualquer momento:\n• Acesso aos seus dados\n• Correção de dados incorretos\n• Exclusão da sua conta\n• Exportação dos seus dados (CSV disponível no app)\n\nPara exercer esses direitos, entre em contato pelo e-mail de suporte.',
  },
  {
    title: '6. Retenção de dados',
    body: 'Seus dados ficam armazenados enquanto sua conta estiver ativa. Após exclusão da conta, os dados são removidos em até 30 dias.',
  },
  {
    title: '7. Contato',
    body: 'Dúvidas sobre privacidade? Entre em contato pelo suporte do app.',
  },
];

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacidade e Termos</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Atualizado em abril de 2025</Text>

        <View style={styles.introBox}>
          <Ionicons
            name="shield-checkmark-outline"
            size={24}
            color={COLORS.PRIMARY}
          />
          <Text style={styles.introText}>
            O Cont.IA respeita sua privacidade. Este documento explica quais
            dados coletamos, por que e como os usamos, de acordo com a Lei Geral
            de Proteção de Dados (LGPD — Lei 13.709/2018).
          </Text>
        </View>

        {SECTIONS.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.termsBox}>
          <Text style={styles.termsTitle}>Termos de Uso</Text>
          <Text style={styles.termsBody}>
            Ao utilizar o Cont.IA, você concorda que:{'\n\n'}• Usará o app
            apenas para fins legítimos de contagem e controle interno.{'\n'}•
            Não tentará reverter, copiar ou redistribuir o software.{'\n'}• É
            responsável pelas fotos e dados inseridos no sistema.{'\n'}• O app é
            fornecido "como está" — sem garantia de disponibilidade contínua.
            {'\n\n'}O uso indevido pode resultar no bloqueio da conta.
          </Text>
        </View>
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
  title: { color: COLORS.WHITE, fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20, paddingBottom: 40 },
  lastUpdated: { color: COLORS.GRAY, fontSize: 12, marginBottom: 16 },
  introBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: COLORS.DARK,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.PRIMARY,
  },
  introText: { color: COLORS.GRAY, fontSize: 13, flex: 1, lineHeight: 20 },
  section: { marginBottom: 20 },
  sectionTitle: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 8,
  },
  sectionBody: { color: COLORS.GRAY, fontSize: 13, lineHeight: 22 },
  termsBox: {
    backgroundColor: COLORS.DARK,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  termsTitle: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 10,
  },
  termsBody: { color: COLORS.GRAY, fontSize: 13, lineHeight: 22 },
});
