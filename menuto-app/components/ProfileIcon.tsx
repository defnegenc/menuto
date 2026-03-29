import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

const RED = '#E9323D';

interface Props {
  onPress: () => void;
  profilePhoto?: string | null;
  name?: string;
  size?: number;
}

export const ProfileIcon: React.FC<Props> = ({
  onPress,
  profilePhoto,
  name,
  size = 36,
}) => {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {profilePhoto ? (
        <Image
          source={{ uri: profilePhoto }}
          style={[styles.photo, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
        </View>
      )}
      {/* Active dot */}
      <View style={styles.activeDot} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  photo: {
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: RED,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
