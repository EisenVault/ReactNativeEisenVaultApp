// src/theme/theme.ts

import { Platform } from 'react-native';

/**
 * Core color palette
 */
export const colors = {
  // Primary colors
  primary: '#2563eb',
  primaryLight: '#3b82f6',
  primaryDark: '#1d4ed8',

  // Secondary colors
  secondary: '#64748b',
  secondaryLight: '#94a3b8',
  secondaryDark: '#475569',

  // Accent colors
  accent: '#0ea5e9',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',

  // Background colors
  background: '#ffffff',
  surfaceBackground: '#f8fafc',
  cardBackground: '#ffffff',

  // Text colors
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
  textTertiary: '#9ca3af',
  textInverted: '#ffffff',

  // UI colors
  surface: '#ffffff',
  surfaceVariant: '#f1f5f9',
  surfaceDisabled: '#e2e8f0',
  elevation: {
    level0: '#ffffff',
    level1: '#f8fafc',
    level2: '#f1f5f9',
    level3: '#e2e8f0',
  },

  // Border colors
  border: '#e5e7eb',
  divider: '#f1f5f9',
};

/**
 * Typography configuration
 */
export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

/**
 * Spacing configuration
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
};

/**
 * Shadow styles
 */
export const shadow = Platform.select({
  ios: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
  },
  android: {
    sm: {
      elevation: 2,
    },
    md: {
      elevation: 5,
    },
  },
});

export default {
  colors,
  typography,
  spacing,
  shadow,
};