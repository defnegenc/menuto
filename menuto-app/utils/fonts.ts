import * as Font from 'expo-font';

export const loadFonts = async () => {
  try {
    console.log('🔄 Loading fonts...');
    await Font.loadAsync({
      'Artifact': require('../assets/fonts/Artifact.otf'),
      'DMSans-Thin': require('../assets/fonts/DMSans-folder/DMSans_18pt-Thin.ttf'),
      'DMSans-Thin-Italic': require('../assets/fonts/DMSans-folder/DMSans_18pt-ThinItalic.ttf'),
      'DMSans-Regular': require('../assets/fonts/DMSans-folder/DMSans_24pt-Regular.ttf'),
      'DMSans-Medium': require('../assets/fonts/DMSans-folder/DMSans_18pt-Medium.ttf'),
      'DMSans-Medium-Italic': require('../assets/fonts/DMSans-folder/DMSans_18pt-MediumItalic.ttf'),
      'DMSans-SemiBold': require('../assets/fonts/DMSans-folder/DMSans_24pt-SemiBold.ttf'),
      'DMSans-Bold': require('../assets/fonts/DMSans-folder/DMSans_18pt-Bold.ttf'),
      'DMSans-Bold-Italic': require('../assets/fonts/DMSans-folder/DMSans_18pt-BoldItalic.ttf'),
    });
    console.log('✅ Fonts loaded successfully!');
  } catch (error) {
    console.error('❌ Error loading fonts:', error);
  }
};
