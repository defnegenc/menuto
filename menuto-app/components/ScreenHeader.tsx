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
      <View style={styles.redLine} />
      <Text style={styles.title}>{title}</Text>
      {accent ? <Text style={styles.accent}>{accent}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 4,
  },
  redLine: {
    width: 32,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: RED,
    marginBottom: 8,
  },
  title: {
    fontFamily: 'DMSans-Bold',
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1.5,
    color: '#111827',
  },
  accent: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 36,
    lineHeight: 40,
    color: RED,
    fontWeight: '500',
  },
});
