import * as Font from 'expo-font';

export const loadFonts = async () => {
  try {
    console.log('🔄 Loading fonts...');
    await Font.loadAsync({
      'Artifact': require('../assets/fonts/Artifact.otf'),
    });
    console.log('✅ Fonts loaded successfully!');
  } catch (error) {
    console.error('❌ Error loading fonts:', error);
  }
};
