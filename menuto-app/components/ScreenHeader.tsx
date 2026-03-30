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
      <View style={styles.accentLine} />
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        {accent ? <Text style={styles.accent}>{accent}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 14,
  },
  accentLine: {
    width: 3,
    backgroundColor: RED,
    borderRadius: 1.5,
    marginTop: 4,
    marginBottom: 4,
  },
  textCol: {
    flex: 1,
    gap: 0,
  },
  title: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1,
    color: '#1A1A1A',
  },
  accent: {
    fontFamily: 'PlayfairDisplay-Italic',
    fontSize: 36,
    lineHeight: 40,
    color: RED,
  },
});
