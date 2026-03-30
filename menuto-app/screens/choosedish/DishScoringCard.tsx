import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { ParsedDish } from '../../types';

const RED = '#E9323D';

interface DishScoringCardProps {
  menuDishes: ParsedDish[];
  isLoadingMenu: boolean;
  menuFound: boolean;
  onAddPhoto: () => void;
  onAddMenuLink: () => void;
  onPasteMenuText: () => void;
  onReviewMenu?: () => void;
}

export function DishScoringCard({
  menuDishes,
  isLoadingMenu,
  menuFound,
  onAddPhoto,
  onAddMenuLink,
  onPasteMenuText,
  onReviewMenu,
}: DishScoringCardProps) {
  // Loading state
  if (isLoadingMenu) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={RED} />
        <Text style={styles.loadingText}>Reading the menu...</Text>
      </View>
    );
  }

  // Menu found — handled by parent now (step 2 shows ✓)
  if (menuFound && menuDishes.length > 0) {
    return null;
  }

  // No menu — add options
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.option} onPress={onAddPhoto} activeOpacity={0.7}>
        <Text style={styles.optionIcon}>📸</Text>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>Take a photo</Text>
          <Text style={styles.optionSubtitle}>Snap the menu with your camera</Text>
        </View>
        <Text style={styles.optionArrow}>→</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.option} onPress={onAddMenuLink} activeOpacity={0.7}>
        <Text style={styles.optionIcon}>🔗</Text>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>Paste a link</Text>
          <Text style={styles.optionSubtitle}>From the restaurant's website</Text>
        </View>
        <Text style={styles.optionArrow}>→</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.option} onPress={onPasteMenuText} activeOpacity={0.7}>
        <Text style={styles.optionIcon}>📋</Text>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>Paste text</Text>
          <Text style={styles.optionSubtitle}>Copy-paste the menu items</Text>
        </View>
        <Text style={styles.optionArrow}>→</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  // Loading
  loadingText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  // Options
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 14,
  },
  optionIcon: {
    fontSize: 24,
    width: 36,
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
    fontSize: 13,
    color: '#9CA3AF',
  },
  optionArrow: {
    fontFamily: 'DMSans-Regular',
    fontSize: 18,
    color: '#D1D5DB',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
});
