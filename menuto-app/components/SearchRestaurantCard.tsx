import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

interface Props {
  restaurant: {
    place_id: string;
    name: string;
    vicinity: string;
    cuisine_type?: string;
    rating?: number;
  };
  onPress: () => void;
}

export const SearchRestaurantCard: React.FC<Props> = ({
  restaurant,
  onPress
}) => {
  // Parse address to show street, city, and state (exclude zip and country)
  const parseAddress = (vicinity: string) => {
    const parts = vicinity.split(',').map(part => part.trim());
    return parts.slice(0, 3).join(', ');
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
    >
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <Text style={styles.restaurantVicinity}>{parseAddress(restaurant.vicinity)}</Text>
      </View>
      <View style={styles.selectionIndicator}>
        <View style={styles.radioButton} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...theme.shadows.sm,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.typography.fontFamilies.semibold,
  },
  restaurantVicinity: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamilies.regular,
  },
  selectionIndicator: {
    marginLeft: theme.spacing.md,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    backgroundColor: 'transparent',
  },
});
