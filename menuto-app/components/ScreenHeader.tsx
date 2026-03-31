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
        <Text style={styles.accent}>{accent}</Text>
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
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 52,
    lineHeight: 54,
    letterSpacing: -2,
    color: '#1A1A1A',
  },
  accent: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 52,
    lineHeight: 54,
    letterSpacing: -2,
    color: RED,
    marginTop: -4,
    transform: [{ scaleY: -1 }],
  },
});
