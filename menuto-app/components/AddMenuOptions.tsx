import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const RED = '#E9323D';

interface Props {
  onAddPhoto: () => void;
  onAddLink: () => void;
  onPasteText: () => void;
  compact?: boolean;
}

export function AddMenuOptions({ onAddPhoto, onAddLink, onPasteText, compact }: Props) {
  if (compact) {
    // Compact: 3 horizontal buttons (used in review modal)
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.label}>ADD MENU</Text>
        <View style={styles.compactRow}>
          <TouchableOpacity style={styles.compactBtn} onPress={onAddPhoto} activeOpacity={0.7}>
            <Text style={styles.compactBtnText}>📸 Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.compactBtn} onPress={onAddLink} activeOpacity={0.7}>
            <Text style={styles.compactBtnText}>🔗 Link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.compactBtn} onPress={onPasteText} activeOpacity={0.7}>
            <Text style={styles.compactBtnText}>📋 Text</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Full: stacked list items with arrows (used when no menu exists)
  return (
    <View style={styles.container}>
      <Text style={styles.label}>ADD A MENU</Text>

      <TouchableOpacity style={styles.option} onPress={onAddPhoto} activeOpacity={0.7}>
        <Text style={styles.optionIcon}>📸</Text>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>Snap the menu</Text>
          <Text style={styles.optionSubtitle}>Take a photo with your camera</Text>
        </View>
        <Text style={styles.optionArrow}>→</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.option} onPress={onAddLink} activeOpacity={0.7}>
        <Text style={styles.optionIcon}>🔗</Text>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>Paste a link</Text>
          <Text style={styles.optionSubtitle}>From the restaurant's website</Text>
        </View>
        <Text style={styles.optionArrow}>→</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.option} onPress={onPasteText} activeOpacity={0.7}>
        <Text style={styles.optionIcon}>📋</Text>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>Paste menu text</Text>
          <Text style={styles.optionSubtitle}>Copy-paste dish names and descriptions</Text>
        </View>
        <Text style={styles.optionArrow}>→</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full layout
  container: {
    paddingVertical: 8,
  },
  label: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 3,
    color: '#1B2541',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  optionIcon: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  optionSubtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: '#666666',
  },
  optionArrow: {
    fontFamily: 'DMSans-Regular',
    fontSize: 18,
    color: '#CCCCCC',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
  },

  // Compact layout
  compactContainer: {
    marginBottom: 16,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 8,
  },
  compactBtn: {
    flex: 1,
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 0,
    paddingVertical: 12,
    alignItems: 'center',
  },
  compactBtnText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 12,
    color: '#1A1A1A',
  },
});
