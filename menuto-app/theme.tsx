export const theme = {
  colors: {
    // Primary brand colors
    primary: '#2C0703',        // Dark burgundy - main brand color
    secondary: '#890620',      // Rich red - accent color
    tertiary: '#B6465F',      // Muted rose - tertiary color
    
    // Neutral colors
    background: '#FEFEFE',     // Very light gray background (closer to white)
    surface: '#FFFFFF',       // White cards/surfaces
    
    // Text colors
    text: {
      primary: '#2C0703',      // Dark text (using primary color)
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
    overlay: 'rgba(44, 7, 3, 0.8)', // Semi-transparent primary
    chipDefault: '#F0E0E3',    // Light pink for unselected chips
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
        color: '#890620', // Secondary color
      },
      regular: {
        fontSize: 24,
        fontWeight: '700' as const,
        fontFamily: 'DMSans-Bold',
        color: '#2C0703',
      },
    },
    h2: {
      fancy: {
        fontSize: 28,
        fontFamily: 'Artifact',
        fontWeight: '700' as const,
        color: '#890620', // Secondary color
      },
      regular: {
        fontSize: 20,
        fontWeight: '600' as const,
        fontFamily: 'DMSans-SemiBold',
        color: '#2C0703',
      },
    },
    h3: {
      fancy: {
        fontSize: 20,
        fontFamily: 'Artifact',
        fontWeight: '700' as const,
        color: '#2C0703', // Primary color
      },
      regular: {
        fontSize: 18,
        fontWeight: '500' as const,
        fontFamily: 'DMSans-Medium',
        color: '#2C0703',
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
        backgroundColor: '#2C0703',
        color: '#FFFFFF',
      },
      secondary: {
        backgroundColor: '#890620',
        color: '#FFFFFF',
      },
      tertiary: {
        backgroundColor: '#B6465F',
        color: '#FFFFFF',
      },
      outline: {
        backgroundColor: 'transparent',
        borderColor: '#2C0703',
        color: '#2C0703',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '#2C0703',
      },
    },
    chip: {
      default: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E1E8ED',
        color: '#2C0703',
      },
      selected: {
        backgroundColor: '#2C0703',
        borderColor: '#2C0703',
        color: '#FFFFFF',
      },
      accent: {
        backgroundColor: '#890620',
        borderColor: '#890620',
        color: '#FFFFFF',
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