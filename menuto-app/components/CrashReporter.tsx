import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { theme } from '../theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export class CrashReporter extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 CRASH CAUGHT:', error);
    console.error('🚨 ERROR INFO:', errorInfo);
    console.error('🚨 STACK TRACE:', error.stack);
    
    this.setState({
      error,
      errorInfo
    });

    // You could also send this to a crash reporting service here
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleShowDetails = () => {
    const { error, errorInfo } = this.state;
    Alert.alert(
      'Crash Details',
      `Error: ${error?.message}\n\nStack: ${error?.stack?.substring(0, 500)}...`,
      [{ text: 'OK' }]
    );
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>🚨 App Crashed</Text>
          <Text style={styles.message}>
            Something went wrong. This crash has been logged.
          </Text>
          
          <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
            <Text style={styles.buttonText}>Restart App</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.detailsButton} onPress={this.handleShowDetails}>
            <Text style={styles.detailsButtonText}>Show Details</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: theme.colors.text.light,
    fontSize: 16,
    fontWeight: '600',
  },
  detailsButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  detailsButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
