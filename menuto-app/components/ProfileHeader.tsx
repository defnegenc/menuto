import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

export const ProfileHeader: React.FC = () => {
  return (
    <SafeAreaView style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={[styles.title, theme.typography.h1.fancy]}>My Restaurants</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    marginBottom: 4,
  },
});
