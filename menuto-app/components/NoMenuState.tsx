import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

interface Props {
  onAddMenuPDF: () => void;
  onPasteMenuText: () => void;
  onAddPhoto: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

export const NoMenuState: React.FC<Props> = ({
  onAddMenuPDF,
  onPasteMenuText,
  onAddPhoto,
  onCancel,
  compact = false
}) => {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {onCancel && (
        <TouchableOpacity onPress={onCancel} style={{ marginBottom: theme.spacing.lg }}>
          <Text style={{ color: theme.colors.text.secondary, fontFamily: theme.typography.fontFamilies.regular }}>
            Cancel
          </Text>
        </TouchableOpacity>
      )}
      {!compact && (
        <>
          <Text style={styles.title}>No menu yet.</Text>
          <Text style={styles.subtitle}>
            Add a menu to see dishes and get recommendations.
          </Text>
        </>
      )}
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button} onPress={onAddMenuPDF}>
          <Text style={styles.buttonText}>Add Menu Link</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={onPasteMenuText}>
          <Text style={styles.buttonText}>Paste Menu Text</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={onAddPhoto}>
          <Text style={styles.buttonText}>Add Menu Photo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: 60,
  },
  containerCompact: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: theme.typography.weights.medium,
    color: '#000000',
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamilies.medium,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 13,
    color: '#000000',
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: theme.spacing.xxxl,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  buttonsContainer: {
    width: '100%',
    gap: theme.spacing.md,
  },
  button: {
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.darkRed,
    alignItems: 'flex-start',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: theme.typography.weights.medium,
    color: '#000000',
    fontFamily: theme.typography.fontFamilies.medium,
    textAlign: 'left',
  },
});
