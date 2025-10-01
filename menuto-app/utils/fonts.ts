import * as Font from 'expo-font';

export const loadFonts = async () => {
  try {
    console.log('🔄 Loading essential fonts...');
    // Load only essential fonts for faster startup
    await Font.loadAsync({
      'Artifact': require('../assets/fonts/Artifact.otf'),
      'DMSans-Regular': require('../assets/fonts/DMSans-folder/DMSans_24pt-Regular.ttf'),
      'DMSans-Medium': require('../assets/fonts/DMSans-folder/DMSans_18pt-Medium.ttf'),
      'DMSans-SemiBold': require('../assets/fonts/DMSans-folder/DMSans_24pt-SemiBold.ttf'),
      'DMSans-Bold': require('../assets/fonts/DMSans-folder/DMSans_18pt-Bold.ttf'),
    });
    console.log('✅ Essential fonts loaded successfully!');
  } catch (error) {
    console.error('❌ Error loading fonts:', error);
  }
};
