import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

interface Props {
  onAddMenuPDF: () => void;
  onPasteMenuText: () => void;
  onAddPhoto: () => void;
}

export const NoMenuState: React.FC<Props> = ({
  onAddMenuPDF,
  onPasteMenuText,
  onAddPhoto
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>No Menu Yet</Text>
      <Text style={styles.subtitle}>
        Add a menu to see dishes and get recommendations.
      </Text>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button} onPress={onAddMenuPDF}>
          <Text style={styles.buttonText}>📄 Add Menu PDF</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={onPasteMenuText}>
          <Text style={styles.buttonText}>📝 Paste Menu Text</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={onAddPhoto}>
          <Text style={styles.buttonText}>📸 Add Menu Photo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 40,
  },
  title: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamilies.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xxxl,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  buttonsContainer: {
    width: '100%',
    gap: theme.spacing.md,
  },
  button: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilies.medium,
  },
});
