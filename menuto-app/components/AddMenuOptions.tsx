import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  onAddPhoto: () => void;
  onAddLink: () => void;
  onPasteText: () => void;
  compact?: boolean;
}

export function AddMenuOptions({ onAddPhoto, onAddLink, onPasteText, compact }: Props) {
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.label}>ADD MORE</Text>
        <View style={styles.compactRow}>
          <TouchableOpacity style={styles.compactBtn} onPress={onAddPhoto} activeOpacity={0.7}>
            <Text style={styles.compactBtnText}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.compactBtn} onPress={onAddLink} activeOpacity={0.7}>
            <Text style={styles.compactBtnText}>Link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.compactBtn} onPress={onPasteText} activeOpacity={0.7}>
            <Text style={styles.compactBtnText}>Text</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>ADD A MENU</Text>

      <TouchableOpacity style={styles.option} onPress={onAddPhoto} activeOpacity={0.7}>
        <View style={styles.optionIcon}>
          <Text style={styles.iconLetter}>P</Text>
        </View>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>Snap the menu</Text>
          <Text style={styles.optionSubtitle}>Camera or photo library</Text>
        </View>
        <Text style={styles.optionArrow}>→</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.option} onPress={onAddLink} activeOpacity={0.7}>
        <View style={styles.optionIcon}>
          <Text style={styles.iconLetter}>L</Text>
        </View>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>Paste a link</Text>
          <Text style={styles.optionSubtitle}>Website or PDF URL</Text>
        </View>
        <Text style={styles.optionArrow}>→</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.option} onPress={onPasteText} activeOpacity={0.7}>
        <View style={styles.optionIcon}>
          <Text style={styles.iconLetter}>T</Text>
        </View>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>Paste text</Text>
          <Text style={styles.optionSubtitle}>Copy-paste from anywhere</Text>
        </View>
        <Text style={styles.optionArrow}>→</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
    width: 28,
    height: 28,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconLetter: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#FFFFFF',
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
    fontSize: 16,
    color: '#CCCCCC',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  compactContainer: {
    marginBottom: 16,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 0,
  },
  compactBtn: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    paddingVertical: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#333333',
  },
  compactBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 11,
    letterSpacing: 2,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
});
