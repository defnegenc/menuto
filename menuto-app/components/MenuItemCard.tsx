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
    <View style={[
      styles.card, 
      isFavorite && styles.lightPinkCard
    ]}>
      {isFavorite && (
        <View style={styles.starContainer}>
          <Text style={styles.starText}>⭐</Text>
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.dishInfo}>
          <Text style={styles.dishName}>{dish.name}</Text>
          {dish.description && (
            <Text style={styles.dishDescription}>{dish.description}</Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.addButton, isFavorite && styles.addButtonActive]}
          onPress={() => onAddToFavorites(dish)}
        >
          <Text style={[styles.addButtonText, isFavorite && styles.addButtonTextActive]}>
            {isFavorite ? '⭐' : '+'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  dishInfo: {
    flex: 1,
    marginRight: 12,
  },
  dishName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  dishDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.secondary + '20', // Semi-transparent secondary color
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  addButtonActive: {
    backgroundColor: theme.colors.secondary, // Solid secondary color for favorited items
    borderColor: theme.colors.secondary,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.secondary, // Secondary color text for unfavorited
  },
  addButtonTextActive: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.light, // White text for favorited items
  },
  // Light pink background style
  lightPinkCard: {
    backgroundColor: '#F0E0E3',
  },
  starContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    backgroundColor: theme.colors.secondary,
    borderRadius: 12,
    padding: 4,
  },
  starText: {
    fontSize: 16,
    color: theme.colors.text.light,
  },
  favouriteText: {
    color: theme.colors.text.light,
  },
});
