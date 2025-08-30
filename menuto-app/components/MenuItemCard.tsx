import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { ParsedDish } from '../types';

interface MenuItemCardProps {
  dish: ParsedDish;
  onAddToFavorites: (dish: ParsedDish) => void;
  isFavorite?: boolean;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  dish,
  onAddToFavorites,
  isFavorite = false
}) => {
  return (
    <View style={[styles.card, isFavorite && styles.lightPinkCard]}>
      {/* removed starContainer badge */}

      <View style={styles.content}>
        <View style={styles.dishInfo}>
          <Text style={styles.dishName}>{dish.name}</Text>
          {dish.description ? (
            <Text style={styles.dishDescription}>{dish.description}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.addButton, isFavorite && styles.addButtonActive]}
          onPress={() => onAddToFavorites(dish)}
        >
          <Text style={[styles.addButtonText, isFavorite && styles.addButtonTextActive]}>
            {isFavorite ? (
  <TouchableOpacity style={[styles.addButton, styles.addButtonActive]} onPress={() => onAddToFavorites(dish)}>
    <Text style={styles.addButtonTextActive}>⭐</Text>
  </TouchableOpacity>
) : (
  <TouchableOpacity style={styles.addButton} onPress={() => onAddToFavorites(dish)}>
    <Text style={styles.addButtonText}>+</Text>
  </TouchableOpacity>
)}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9E6EA',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  lightPinkCard: { backgroundColor: '#F7E8EB' }, // softer pink
  content: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  dishInfo: { flex: 1, marginRight: 12 },
  dishName: { fontSize: 18, fontWeight: '700', color: theme.colors.text.primary, marginBottom: 6 },
  dishDescription: { fontSize: 15, color: theme.colors.text.secondary, lineHeight: 21 },

  addButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.secondary + '20',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.secondary,
  },
  addButtonActive: {
    backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary,
  },
  addButtonText: { fontSize: 18, fontWeight: '700', color: theme.colors.secondary },
  addButtonTextActive: { color: theme.colors.text.light },

  starContainer: {
    position: 'absolute', top: 10, right: 10, zIndex: 1,
    backgroundColor: theme.colors.secondary, borderRadius: 14, paddingHorizontal: 6, paddingVertical: 4,
  },
  starText: { fontSize: 16, color: theme.colors.text.light },
});