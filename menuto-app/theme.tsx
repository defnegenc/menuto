export const theme = {
  colors: {
    // Primary brand colors — Red + Black
    primary: '#E9323D',        // Menuto red
    secondary: '#FDECED',      // Light red tint (for selected chips, badges)
    tertiary: '#1C1917',       // Near-black (for dark CTAs, emphasis)
    darkRed: '#C42A33',        // Darker red for borders/pressed states

    // Neutral colors
    background: '#FFFFFF',     // White background
    surface: '#FAFAF9',        // Stone-50 cards/surfaces

    // Text colors
    text: {
      primary: '#1C1917',      // Near-black text
      secondary: '#5A4D48',    // Warm medium gray
      darkGrey: '#2C2421',     // Dark warm gray
      light: '#FFFFFF',        // White text
      muted: '#8C7E77',        // Warm light gray
    },

    // State colors
    success: '#22C55E',        // Green
    warning: '#F59E0B',        // Amber
    error: '#E9323D',          // Red (same as primary)
    info: '#3B82F6',           // Blue

    // Borders and dividers
    border: '#E7E5E4',
    divider: '#F5F5F4',

    // Special colors
    gold: '#F59E0B',           // For ratings/stars
    overlay: 'rgba(28, 25, 23, 0.8)', // Semi-transparent dark
    chipDefault: '#FAFAF9',    // Stone-50 for unselected chips
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
        color: '#E9323D', // Secondary color
      },
      regular: {
        fontSize: 24,
        fontWeight: '700' as const,
        fontFamily: 'DMSans-Bold',
        color: '#1C1917',
      },
    },
    h2: {
      fancy: {
        fontSize: 28,
        fontFamily: 'Artifact',
        fontWeight: '700' as const,
        color: '#E9323D', // Secondary color
      },
      regular: {
        fontSize: 20,
        fontWeight: '600' as const,
        fontFamily: 'DMSans-SemiBold',
        color: '#1C1917',
      },
    },
    h3: {
      fancy: {
        fontSize: 20,
        fontFamily: 'Artifact',
        fontWeight: '700' as const,
        color: '#1C1917', // Primary color
      },
      regular: {
        fontSize: 18,
        fontWeight: '500' as const,
        fontFamily: 'DMSans-Medium',
        color: '#1C1917',
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
        backgroundColor: '#E9323D',
        color: '#FFFFFF',
      },
      secondary: {
        backgroundColor: '#1C1917',
        color: '#FFFFFF',
      },
      tertiary: {
        backgroundColor: '#FDECED',
        color: '#E9323D',
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: '#E9323D',
        color: '#E9323D',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '#E9323D',
      },
    },
    chip: {
      default: {
        backgroundColor: '#FAFAF9',
        borderColor: '#E7E5E4',
        color: '#1C1917',
      },
      selected: {
        backgroundColor: '#E9323D',
        borderColor: '#E9323D',
        color: '#FFFFFF',
      },
      accent: {
        backgroundColor: '#FDECED',
        borderColor: '#FDECED',
        color: '#E9323D',
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