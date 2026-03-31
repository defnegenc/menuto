import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const RED = '#E9323D';

interface Props {
  title: string;
  accent?: string;
}

export const ScreenHeader: React.FC<Props> = ({ title, accent }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {accent ? <Text style={styles.accent}>{accent}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -1.5,
    color: '#1A1A1A',
  },
  accent: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -1.5,
    color: RED,
    marginTop: -6,
  },
});
