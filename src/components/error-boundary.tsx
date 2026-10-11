import { Ionicons } from '@expo/vector-icons';
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    logger.error('CRASH', error.message, { stack: error.stack, componentStack: errorInfo.componentStack });
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <Ionicons name="warning-outline" size={54} color="#FF3B5C" />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            {this.state.error?.message || 'An unexpected error occurred in the application.'}
          </Text>

          <View style={styles.errorBox}>
            <Text numberOfLines={5} style={styles.errorText}>
              {this.state.error?.stack || this.state.errorInfo?.componentStack || 'No stack trace available.'}
            </Text>
          </View>

          <Pressable onPress={this.handleRestart} style={styles.button}>
            <Text style={styles.buttonText}>Restart App</Text>
          </Pressable>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0B14',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#F4F2FA' },
  subtitle: { fontSize: 14, color: '#9A95AD', textAlign: 'center' },
  errorBox: {
    backgroundColor: '#1E1B29',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    maxHeight: 140,
    marginTop: 8,
  },
  errorText: { color: '#FF8A8A', fontSize: 11, fontFamily: 'monospace' },
  button: {
    backgroundColor: '#6C3BFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 16,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
