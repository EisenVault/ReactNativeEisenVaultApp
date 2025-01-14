// Reusable component for displaying a file item
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Document } from '../../api/types';

interface FileItemProps {
  file: Document;
}

const FileItem: React.FC<FileItemProps> = ({ file }) => {
  // Helper function to format file size (implement this)
  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Helper function to format date (implement this)
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <TouchableOpacity style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.name}>{file.name}</Text>
        <Text style={styles.details}>
          {formatFileSize(file.size)} • {formatDate(file.lastModified)}
        </Text>
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
    flexDirection: 'column',
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  details: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default FileItem;