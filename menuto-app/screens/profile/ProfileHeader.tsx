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
      {/* Edit removed — global edit at top */}
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

const styles = StyleSheet.create({
  profileSectionHeader: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  profilePicContainer: {
    marginBottom: 6,
  },
  profilePicPlaceholder: {
    width: 83,
    height: 83,
    borderRadius: 9999,
    backgroundColor: '#E9323D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhoto: {
    width: 83,
    height: 83,
    borderRadius: 9999,
    backgroundColor: '#FFF5F5',
  },
  profilePicText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
  },
  userName: {
    fontSize: 24,
    color: '#111827',
    fontFamily: 'DMSans-SemiBold',
  },
  userHandle: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#9CA3AF',
    fontFamily: 'DMSans-Regular',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
    marginVertical: 12,
  },
  editButtonText: {
    color: '#E9323D',
    fontSize: 13,
    fontFamily: 'DMSans-SemiBold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalCancelButton: {
    fontSize: 15,
    color: '#6B7280',
    fontFamily: 'DMSans-Regular',
  },
  modalTitle: {
    fontSize: 17,
    color: '#111827',
    fontFamily: 'DMSans-Bold',
  },
  modalSubmitButton: {
    fontSize: 15,
    color: '#E9323D',
    fontFamily: 'DMSans-SemiBold',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalProfilePicContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalProfilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 9999,
    marginBottom: 12,
    backgroundColor: '#FFF5F5',
  },
  modalProfilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 9999,
    backgroundColor: '#E9323D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalProfilePicText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
  },
  changePhotoButton: {
    backgroundColor: '#111111',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  changePhotoButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'DMSans-SemiBold',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 8,
    fontFamily: 'DMSans-Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 16,
    padding: 16,
    fontSize: 17,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    fontFamily: 'DMSans-Regular',
  },
  spiceSliderContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  currentSelectionDisplay: {
    alignItems: 'center',
    marginBottom: 12,
  },
  currentPeppers: {
    fontSize: 28,
    lineHeight: 32,
  },
  customSlider: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  sliderTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#E9323D',
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
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  sliderStopActive: {
    backgroundColor: '#E9323D',
    borderColor: '#E9323D',
    transform: [{ scale: 1.2 }],
  },
  spiceDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'DMSans-Regular',
  },
});
