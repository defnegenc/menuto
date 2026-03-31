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
      {/* Decorative frame — sits behind the text */}
      <View style={styles.frame}>
        <View style={styles.frameInner} />
      </View>

      {/* Text — overlaps the frame */}
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {accent ? <Text style={styles.accent}>{accent}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    position: 'relative',
  },
  frame: {
    position: 'absolute',
    top: 18,
    left: 36,
    right: 80,
    bottom: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(26,26,26,0.15)',
    padding: 3,
  },
  frameInner: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(26,26,26,0.1)',
  },
  textBlock: {
    paddingTop: 6,
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
