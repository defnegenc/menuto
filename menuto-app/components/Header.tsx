import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  
  const handleBackPress = () => {
    console.log('🔙 Back button pressed!');
    onBack();
  };

  return (
    <View style={[styles.header, { paddingTop: 10}]}>
      {/* Back Button */}
      <TouchableOpacity 
        onPress={handleBackPress} 
        style={styles.backButton}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      
      {/* Restaurant Info */}
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{restaurantName}</Text>
        {restaurantAddress && (
          <Text style={styles.restaurantAddress}>{restaurantAddress}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  backButton: {
    marginTop: 0,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 0,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  restaurantInfo: {
    // No margin needed since backButton has bottom margin
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 6,
    fontFamily: theme.typography.fontFamilies.bold,
  },
  restaurantAddress: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontWeight: '400',
    fontFamily: theme.typography.fontFamilies.regular,
  },
});