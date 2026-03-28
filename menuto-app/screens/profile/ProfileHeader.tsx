import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface ProfileHeaderProps {
  user: any;
  onEditProfile: () => void;
  // Edit modal state
  isEditingProfile: boolean;
  editedName: string;
  editedUsername: string;
  editedProfilePhoto: string | null;
  editedSpiceTolerance: number;
  onSetEditedName: (name: string) => void;
  onSetEditedUsername: (username: string) => void;
  onSetEditedSpiceTolerance: (level: number) => void;
  onSaveProfile: () => void;
  onCancelEditProfile: () => void;
  onProfilePhotoChange: () => void;
  getSpiceEmoji: (level: number) => string;
  getSpiceLabel: (level: number) => string;
}

export function ProfileHeader({
  user,
  onEditProfile,
  isEditingProfile,
  editedName,
  editedUsername,
  editedProfilePhoto,
  editedSpiceTolerance,
  onSetEditedName,
  onSetEditedUsername,
  onSetEditedSpiceTolerance,
  onSaveProfile,
  onCancelEditProfile,
  onProfilePhotoChange,
  getSpiceEmoji,
  getSpiceLabel,
}: ProfileHeaderProps) {
  return (
    <>
      {/* Profile Section */}
      <View style={styles.profileSectionHeader}>
        <TouchableOpacity onPress={onEditProfile}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.profileSection}>
        <View style={styles.profilePicContainer}>
          {user?.profile_photo ? (
            <Image source={{ uri: user.profile_photo }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.profilePicPlaceholder}>
              <Text style={styles.profilePicText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userHandle}>@{user?.username || 'unknown'}</Text>
      </View>

      {/* Separator */}
      <View style={styles.separator} />

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditingProfile}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onCancelEditProfile}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onCancelEditProfile}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={onSaveProfile}>
              <Text style={styles.modalSubmitButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Profile Photo */}
            <View style={styles.modalProfilePicContainer}>
              {editedProfilePhoto ? (
                <Image source={{ uri: editedProfilePhoto }} style={styles.modalProfilePhoto} />
              ) : (
                <View style={styles.modalProfilePicPlaceholder}>
                  <Text style={styles.modalProfilePicText}>
                    {editedName ? editedName.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.changePhotoButton} onPress={onProfilePhotoChange}>
                <Text style={styles.changePhotoButtonText}>Change Photo</Text>
              </TouchableOpacity>
            </View>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={editedName}
                onChangeText={onSetEditedName}
                placeholder="Your Name"
              />
            </View>

            {/* Username Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.textInput}
                value={editedUsername}
                onChangeText={onSetEditedUsername}
                placeholder="Your Username"
                autoCapitalize="none"
              />
            </View>

            {/* Spice Tolerance Slider */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Spice Tolerance</Text>
              <View style={styles.spiceSliderContainer}>
                <View style={styles.currentSelectionDisplay}>
                  <Text style={styles.currentPeppers}>
                    {getSpiceEmoji(editedSpiceTolerance)}
                  </Text>
                </View>
                <View style={styles.customSlider}>
                  <View style={styles.sliderTrack}>
                    <View
                      style={[
                        styles.sliderFill,
                        { width: `${((editedSpiceTolerance - 1) / 4) * 100}%` }
                      ]}
                    />
                    <View style={styles.sliderStops}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <TouchableOpacity
                          key={level}
                          style={[
                            styles.sliderStop,
                            editedSpiceTolerance >= level && styles.sliderStopActive,
                          ]}
                          onPress={() => onSetEditedSpiceTolerance(level)}
                        />
                      ))}
                    </View>
                  </View>
                </View>
                <Text style={styles.spiceDescription}>
                  {getSpiceLabel(editedSpiceTolerance)}
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const TERRA = '#E9323D';

const styles = StyleSheet.create({
  profileSectionHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  profilePicContainer: {
    marginBottom: theme.spacing.xs,
  },
  profilePicPlaceholder: {
    width: 83,
    height: 83,
    borderRadius: 9999,
    backgroundColor: TERRA,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhoto: {
    width: 83,
    height: 83,
    borderRadius: 9999,
    backgroundColor: '#FDECED',
  },
  profilePicText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamilies.bold,
  },
  userName: {
    fontSize: 24,
    color: '#1C1917',
    fontFamily: theme.typography.fontFamilies.medium,
  },
  userHandle: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#A8A29E',
    fontFamily: theme.typography.fontFamilies.regular,
  },
  separator: {
    height: 1,
    backgroundColor: '#F5F5F4',
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
  },
  editButtonText: {
    color: TERRA,
    fontSize: 12,
    fontFamily: theme.typography.fontFamilies.bold,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F4',
  },
  modalCancelButton: {
    fontSize: theme.typography.sizes.md,
    color: '#A8A29E',
    fontFamily: theme.typography.fontFamilies.regular,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.lg,
    color: '#1C1917',
    fontFamily: theme.typography.fontFamilies.bold,
  },
  modalSubmitButton: {
    fontSize: theme.typography.sizes.md,
    color: TERRA,
    fontFamily: theme.typography.fontFamilies.bold,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  modalProfilePicContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  modalProfilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 9999,
    marginBottom: theme.spacing.md,
    backgroundColor: '#FDECED',
  },
  modalProfilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 9999,
    backgroundColor: TERRA,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalProfilePicText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamilies.bold,
  },
  changePhotoButton: {
    backgroundColor: TERRA,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changePhotoButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: theme.typography.fontFamilies.bold,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.typography.sizes.md,
    color: '#1C1917',
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E7E5E4',
    borderRadius: 10,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: '#1C1917',
    backgroundColor: '#FFFFFF',
    fontFamily: theme.typography.fontFamilies.regular,
  },
  spiceSliderContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  currentSelectionDisplay: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  currentPeppers: {
    fontSize: 28,
    lineHeight: 32,
  },
  customSlider: {
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  sliderTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E7E5E4',
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: TERRA,
    borderRadius: 3,
  },
  sliderStops: {
    position: 'absolute',
    top: -6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  sliderStop: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#E7E5E4',
    ...theme.shadows.sm,
  },
  sliderStopActive: {
    backgroundColor: TERRA,
    borderColor: TERRA,
    transform: [{ scale: 1.2 }],
  },
  spiceDescription: {
    fontSize: theme.typography.sizes.md,
    color: '#1C1917',
    textAlign: 'center',
    fontFamily: theme.typography.fontFamilies.medium,
  },
});
