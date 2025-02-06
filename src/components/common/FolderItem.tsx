// src/components/common/FolderItem.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextStyle, ViewStyle, Platform } from 'react-native';
import { Folder as FolderIcon } from 'lucide-react-native';
import { Folder } from '../../api/types';
import theme from '../../theme/theme';

interface FolderItemProps {
  folder: Folder;
  onPress: () => void;
}

interface Styles {
  container: ViewStyle;
  iconContainer: ViewStyle;
  content: ViewStyle;
  name: TextStyle;
  details: TextStyle;
}

const FolderItem: React.FC<FolderItemProps> = ({ folder, onPress }) => {
  return (
      <TouchableOpacity 
          style={styles.container} 
          onPress={onPress}
          activeOpacity={0.7}
      >
          <View style={styles.iconContainer}>
              <FolderIcon 
                  size={24} 
                  color={theme.colors.primary}
              />
          </View>
          <View style={styles.content}>
              <Text style={styles.name} numberOfLines={1}>
                  {folder.name}
              </Text>
              <Text style={styles.details}>
                  Created by {folder.createdBy}
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
      },
      android: {
        elevation: 2,
      },
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
    fontWeight: '500' as '500',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  details: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
});

export default FolderItem;