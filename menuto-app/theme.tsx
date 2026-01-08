export const theme = {
  colors: {
    // Primary brand colors
    primary: '#D8131F',        // Red - main brand color
    secondary: '#FFD9DB',      // Light green - accent color
    tertiary: '#CCDCB6',      // Light green - tertiary color (same as secondary)
    darkRed: '#881219',       // Dark red for borders
    
    // Neutral colors
    background: '#FFFEF4',     // Cream background
    surface: '#FFFFFF',       // White cards/surfaces
    
    // Text colors
    text: {
      primary: '#D8131F',      // Dark text (using primary color)
      secondary: '#7F8C8D', 
      darkGrey: '#4A4A4A',   // Gray text
      light: '#FFFFFF',        // White text
      muted: '#BDC3C7',        // Very light gray text
    },
    
    // State colors
    success: '#2ECC71',        // Green
    warning: '#F39C12',        // Orange
    error: '#E74C3C',          // Red
    info: '#3498DB',           // Blue
    
    // Borders and dividers
    border: '#E1E8ED',
    divider: '#E1E8ED',
    
    // Special colors
    gold: '#FFD700',           // For ratings/stars
    overlay: 'rgba(37, 68, 43, 0.8)', // Semi-transparent primary
    chipDefault: '#CCDCB6',    // Light green for unselected chips
  },
  
  // Typography
  typography: {
    sizes: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
      xxl: 20,
      title: 24,
      heading: 30,
      display: 32,
    },
    weights: {
      thin: '100' as const,
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
    // Default font family for all text (DM Sans)
    fontFamily: 'DMSans-Regular',
    
    // Font families for different weights and styles
    fontFamilies: {
      thin: 'DMSans-Thin',
      thinItalic: 'DMSans-Thin-Italic',
      regular: 'DMSans-Regular',
      regularItalic: 'DMSans-Italic',
      medium: 'DMSans-Medium',
      mediumItalic: 'DMSans-Medium-Italic',
      semibold: 'DMSans-SemiBold',
      bold: 'DMSans-Bold',
      boldItalic: 'DMSans-Bold-Italic',
    },
    
    // Heading styles
    h1: {
      fancy: {
        fontSize: 30,
        fontFamily: 'Artifact',
        fontWeight: '700' as const,
        color: '#CCDCB6', // Secondary color
      },
      regular: {
        fontSize: 24,
        fontWeight: '700' as const,
        fontFamily: 'DMSans-Bold',
        color: '#D8131F',
      },
    },
    h2: {
      fancy: {
        fontSize: 28,
        fontFamily: 'Artifact',
        fontWeight: '700' as const,
        color: '#CCDCB6', // Secondary color
      },
      regular: {
        fontSize: 20,
        fontWeight: '600' as const,
        fontFamily: 'DMSans-SemiBold',
        color: '#D8131F',
      },
    },
    h3: {
      fancy: {
        fontSize: 20,
        fontFamily: 'Artifact',
        fontWeight: '700' as const,
        color: '#D8131F', // Primary color
      },
      regular: {
        fontSize: 18,
        fontWeight: '500' as const,
        fontFamily: 'DMSans-Medium',
        color: '#D8131F',
      },
    },
  },
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 40,
  },
  
  // Border radius
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 999,
  },
  
  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  },
  
  // Component-specific styles
  components: {
    button: {
      primary: {
        backgroundColor: '#D8131F',
        color: '#FFFFFF',
      },
      secondary: {
        backgroundColor: '#CCDCB6',
        color: '#D8131F',
      },
      tertiary: {
        backgroundColor: '#CCDCB6',
        color: '#D8131F',
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: '#D8131F',
        color: '#D8131F',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '#D8131F',
      },
    },
    chip: {
      default: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E1E8ED',
        color: '#D8131F',
      },
      selected: {
        backgroundColor: '#D8131F',
        borderColor: '#D8131F',
        color: '#FFFFFF',
      },
      accent: {
        backgroundColor: '#CCDCB6',
        borderColor: '#CCDCB6',
        color: '#D8131F',
      },
    },
  },
};

export type Theme = typeof theme;

// Helper functions for consistent theming
export const getButtonStyle = (variant: 'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost' = 'primary') => ({
  ...theme.components.button[variant],
  borderRadius: theme.borderRadius.lg,
  paddingVertical: theme.spacing.md,
  paddingHorizontal: theme.spacing.xl,
  fontFamily: theme.typography.fontFamilies.medium,
});

export const getTextStyle = (
  size: keyof typeof theme.typography.sizes, 
  weight?: 'thin' | 'regular' | 'medium' | 'semibold' | 'bold',
  italic?: boolean
) => {
  let fontFamily = theme.typography.fontFamilies.regular;
  
  if (weight && italic) {
    switch (weight) {
      case 'thin':
        fontFamily = theme.typography.fontFamilies.thinItalic;
        break;
      case 'medium':
        fontFamily = theme.typography.fontFamilies.mediumItalic;
        break;
      case 'bold':
        fontFamily = theme.typography.fontFamilies.boldItalic;
        break;
      default:
        fontFamily = theme.typography.fontFamilies.regular;
    }
  } else if (weight) {
    switch (weight) {
      case 'thin':
        fontFamily = theme.typography.fontFamilies.thin;
        break;
      case 'medium':
        fontFamily = theme.typography.fontFamilies.medium;
        break;
      case 'semibold':
        fontFamily = theme.typography.fontFamilies.semibold;
        break;
      case 'bold':
        fontFamily = theme.typography.fontFamilies.bold;
        break;
      default:
        fontFamily = theme.typography.fontFamilies.regular;
    }
  }

  return {
    fontSize: theme.typography.sizes[size],
    fontFamily,
    color: theme.colors.text.primary,
  };
};

export const getCardStyle = () => ({
  backgroundColor: theme.colors.surface,
  borderRadius: theme.borderRadius.lg,
  ...theme.shadows.md,
});