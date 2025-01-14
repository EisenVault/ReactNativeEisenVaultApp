// Reusable component for displaying a folder item
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Folder } from '../../api/types';

interface FolderItemProps {
  folder: Folder;
}

const FolderItem: React.FC<FolderItemProps> = ({ folder }) => {
  return (
    <TouchableOpacity style={styles.container}>
      <View style={styles.content}>
        {/* Add folder icon here */}
        <Text style={styles.name}>{folder.name}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
});

export default FolderItem;