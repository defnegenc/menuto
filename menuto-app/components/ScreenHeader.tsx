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
      {accent ? (
        <View style={styles.accentRow}>
          <View style={styles.dot} />
          <Text style={styles.accent}>{accent}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: '#9CA3AF',
  },
  accentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: RED,
    marginBottom: 6,
  },
  accent: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 52,
    lineHeight: 56,
    color: '#1A1A1A',
    letterSpacing: -2,
  },
});
