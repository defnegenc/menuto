import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { ParsedDish } from '../types';

// Utility function to properly capitalize text
const capitalizeText = (text: string): string => {
  if (!text) return text;
  
  // If text is all caps, convert to title case
  if (text === text.toUpperCase() && text.length > 1) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }
  
  // Otherwise, just capitalize first letter
  return text.charAt(0).toUpperCase() + text.slice(1);
};

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
      <View style={styles.content}>
        <View style={styles.dishInfo}>
          <Text style={styles.dishName}>{capitalizeText(dish.name)}</Text>
          {dish.description ? (
            <Text style={[styles.dishDescription, isFavorite && styles.dishDescriptionFavorited]}>{capitalizeText(dish.description)}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.addButton, isFavorite && styles.addButtonActive]}
          onPress={() => onAddToFavorites(dish)}
        >
          <Text style={[styles.addButtonText, isFavorite && styles.addButtonTextActive]}>
            {isFavorite ? 'Remove' : '+ Add'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E9E6EA',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  lightPinkCard: { 
    backgroundColor: '#F7E8EB',
    borderColor: theme.colors.secondary,
  },
  content: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  dishInfo: { 
    flex: 1, 
    marginRight: 12 
  },
  dishName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: theme.colors.text.primary, 
    marginBottom: 4 
  },
  dishDescription: { 
    fontSize: 14, 
    color: theme.colors.text.secondary, 
    lineHeight: 18 
  },
  dishDescriptionFavorited: {
    color: '#666666', // Darker grey for favorited dishes
  },

  addButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  addButtonActive: {
    backgroundColor: theme.colors.secondary, 
    borderColor: theme.colors.secondary,
  },
  addButtonText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: theme.colors.secondary 
  },
  addButtonTextActive: { 
    color: '#FFFFFF' 
  },
});