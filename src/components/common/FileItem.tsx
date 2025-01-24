// src/components/common/FileItem.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextStyle, ViewStyle, Platform } from 'react-native';
import { FileText } from 'lucide-react-native';
import { Document } from '../../api/types';
import theme from '../../theme/theme';

interface FileItemProps {
  file: Document;
  onPress: () => void;
}

interface Styles {
  container: ViewStyle;
  iconContainer: ViewStyle;
  content: ViewStyle;
  name: TextStyle;
  details: TextStyle;
}

const FileItem: React.FC<FileItemProps> = ({ file, onPress }) => {
  const formatFileSize = (size: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = size;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getIconColor = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return theme.colors.accent;
    if (mimeType.includes('pdf')) return theme.colors.error;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return theme.colors.success;
    return theme.colors.secondary;
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <FileText 
          size={24} 
          color={getIconColor(file.mimeType)}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{file.name}</Text>
        <Text style={styles.details}>
          {formatFileSize(file.size)} • Modified {formatDate(file.lastModified)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flexDirection: 'row',
    padding: theme.spacing.base,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 8,
    marginBottom: theme.spacing.sm,
    ...(Platform.OS === 'ios' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
    } : {
      elevation: 2,
    }),
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.base,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  details: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
});

export default FileItem;