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
      placeholderTextColor="rgba(0, 0, 0, 0.7)"
    />
  );
};

const styles = StyleSheet.create({
  searchInput: {
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: 'rgba(0, 0, 0, 0.7)',
    fontFamily: theme.typography.fontFamilies.regular,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
});
