import React from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';

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
  style,
}: Props) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>⌕</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Text style={styles.clear}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5F5F4',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  icon: {
    fontSize: 18,
    color: '#9CA3AF',
    transform: [{ scaleX: -1 }],
  },
  input: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: '#111827',
    padding: 0,
  },
  clear: {
    fontSize: 16,
    color: '#D1D5DB',
    padding: 4,
  },
});
