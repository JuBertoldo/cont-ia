import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * QC — Error Boundary
 *
 * Captura erros de renderização em toda a árvore de componentes filhos,
 * evitando que o app quebre em tela branca sem nenhum feedback ao usuário.
 *
 * Uso:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Em produção: enviar para serviço de monitoramento (ex: Sentry)
    console.error(
      '[ErrorBoundary] Erro capturado:',
      error,
      info.componentStack,
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Algo deu errado</Text>
          <Text style={styles.message}>
            Ocorreu um erro inesperado. Tente novamente ou reinicie o
            aplicativo.
          </Text>

          {__DEV__ && this.state.error ? (
            <Text style={styles.devError}>{this.state.error.toString()}</Text>
          ) : null}

          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>TENTAR NOVAMENTE</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  devError: {
    color: '#FF5252',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#111',
    borderRadius: 8,
    width: '100%',
  },
  button: {
    backgroundColor: '#00FF88',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
