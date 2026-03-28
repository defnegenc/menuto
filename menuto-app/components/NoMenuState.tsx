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
          <Text style={{ color: '#5A4D48', fontFamily: 'DMSans-Regular', fontSize: 14 }}>
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

const MEDIUM_COLOR = '#5A4D48';

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
    fontSize: 24,
    fontFamily: 'DMSans-Bold',
    color: '#1C1917',
    letterSpacing: -1.5,
    marginBottom: theme.spacing.md,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 14,
    color: MEDIUM_COLOR,
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: theme.spacing.xxxl,
    fontFamily: 'DMSans-Regular',
  },
  buttonsContainer: {
    width: '100%',
    gap: theme.spacing.md,
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: '#1C1917',
    textAlign: 'left',
  },
});
