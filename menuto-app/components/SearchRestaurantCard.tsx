import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

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

export const SearchRestaurantCard: React.FC<Props> = ({ restaurant, onPress }) => {
  const shortAddress = restaurant.vicinity?.split(',').slice(0, 2).join(', ') || '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
        <Text style={styles.address} numberOfLines={1}>{shortAddress}</Text>
        {restaurant.cuisine_type && restaurant.cuisine_type !== 'Restaurant' && (
          <Text style={styles.cuisine}>{restaurant.cuisine_type.toUpperCase()}</Text>
        )}
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 20,
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  address: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: '#9CA3AF',
  },
  cuisine: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 2,
    color: '#E9323D',
    marginTop: 2,
  },
  arrow: {
    fontFamily: 'DMSans-Regular',
    fontSize: 20,
    color: '#D1D5DB',
  },
});
