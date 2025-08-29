import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

export const SearchHeader: React.FC = () => {
  return (
    <SafeAreaView style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={[styles.title, theme.typography.h1.fancy]}>Add Restaurants</Text>
        <Text style={styles.subtitle}>
          Search and tap to add restaurants you love
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontFamily: 'DMSans-Regular',
  },
});
