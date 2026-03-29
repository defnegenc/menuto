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
  const parseAddress = (vicinity: string) =>
    vicinity.split(',').map(p => p.trim()).slice(0, 3).join(', ');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
        <Text style={styles.address} numberOfLines={1}>{parseAddress(restaurant.vicinity)}</Text>
      </View>
      <View style={styles.radio}>
        <View style={styles.radioDot} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: RED,
    backgroundColor: '#FFF5F5',
    gap: 16,
    marginBottom: 10,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 17,
    color: '#111827',
  },
  address: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: RED,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: RED,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
});
