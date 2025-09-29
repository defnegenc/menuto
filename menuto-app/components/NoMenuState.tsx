import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

interface Props {
  onAddMenuPDF: () => void;
  onPasteMenuText: () => void;
  onAddPhoto: () => void;
  onCancel?: () => void;
}

export const NoMenuState: React.FC<Props> = ({
  onAddMenuPDF,
  onPasteMenuText,
  onAddPhoto,
  onCancel
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add More Items</Text>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button} onPress={onAddMenuPDF}>
          <Text style={styles.buttonText}>📄 Add Menu PDF</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={onPasteMenuText}>
          <Text style={styles.buttonText}>📝 Paste Menu Text</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={onAddPhoto}>
          <Text style={styles.buttonText}>📸 Snap a menu photo</Text>
        </TouchableOpacity>
        
        {onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
    fontFamily: theme.typography.fontFamilies.semibold,
    textAlign: 'center',
  },
  buttonsContainer: {
    width: '100%',
    gap: theme.spacing.md,
  },
  button: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  cancelButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamilies.medium,
    textAlign: 'center',
  },
});
