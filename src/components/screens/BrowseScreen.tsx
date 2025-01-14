// Main screen for browsing documents and folders
import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import FileItem from '../common/FileItem';
import FolderItem from '../common/FolderItem';

const BrowseScreen = () => {
  // Get data from Redux store
  const { documents, folders, currentPath } = useSelector(
    (state: RootState) => state.documents
  );

  // Render either a file or folder item based on the type
  const renderItem = ({ item }: { item: any }) => {
    if ('mimeType' in item) {  // If item has mimeType, it's a file
      return <FileItem file={item} />;
    }
    return <FolderItem folder={item} />;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={[...folders, ...documents]}  // Combine folders and documents
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 16,
  },
});

export default BrowseScreen;