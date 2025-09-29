import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: any;
}

export const SearchBar: React.FC<Props> = ({
  value,
  onChangeText,
  placeholder = "Search...",
  style
}) => {
  return (
    <TextInput
      style={[styles.searchInput, style]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.text.secondary}
    />
  );
};

const styles = StyleSheet.create({
  searchInput: {
    backgroundColor: '#F5F5F5', // Light gray background
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: '#666666', // Darker gray text
    fontFamily: theme.typography.fontFamilies.regular,
    marginBottom: theme.spacing.md,
    // No border
  },
});
