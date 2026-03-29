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
  const parseAddress = (vicinity: string) =>
    vicinity.split(',').map(p => p.trim()).slice(0, 3).join(', ');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
        <Text style={styles.address} numberOfLines={1}>{parseAddress(restaurant.vicinity)}</Text>
      </View>
      <View style={styles.radio} />
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 16,
    marginBottom: 10,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: 'IBMPlexMono-SemiBold',
    fontSize: 16,
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  address: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
});
