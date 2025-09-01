import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface HeaderProps {
  onBack: () => void;
  restaurantName: string;
  restaurantAddress?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  onBack, 
  restaurantName, 
  restaurantAddress 
}) => {
  return (
    <SafeAreaView style={styles.header}>
      {/* Back Button */}
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      
      {/* Restaurant Info */}
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{restaurantName}</Text>
        {restaurantAddress && (
          <Text style={styles.restaurantAddress}>{restaurantAddress}</Text>
        )}
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
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  restaurantInfo: {
    // No margin needed since backButton has bottom margin
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontWeight: '400',
  },
});
