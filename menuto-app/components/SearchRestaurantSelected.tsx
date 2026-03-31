import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const RED = '#E9323D';

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

export const SearchRestaurantSelected: React.FC<Props> = ({ restaurant, onPress }) => {
  const shortAddress = restaurant.vicinity?.split(',').slice(0, 2).join(', ') || '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.indicator} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
        <Text style={styles.address} numberOfLines={1}>{shortAddress}</Text>
        {restaurant.cuisine_type && restaurant.cuisine_type !== 'Restaurant' && (
          <Text style={styles.cuisine}>{restaurant.cuisine_type.toUpperCase()}</Text>
        )}
      </View>
      <Text style={styles.check}>✓</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: RED,
    gap: 12,
  },
  indicator: {
    width: 3,
    height: 40,
    borderRadius: 1.5,
    backgroundColor: RED,
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
    color: '#666666',
  },
  cuisine: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    letterSpacing: 2,
    color: RED,
    marginTop: 2,
  },
  check: {
    fontFamily: 'DMSans-Bold',
    fontSize: 18,
    color: RED,
  },
});
