// src/components/screens/SearchScreen.tsx

import React, { useState } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, TextStyle, ViewStyle, Platform } from 'react-native';
import { Searchbar, Text } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { Search as SearchIcon } from 'lucide-react-native';
import { RootState } from '../../store/store';
import { Document, Folder } from '../../api/types';
import FileItem from '../common/FileItem';
import FolderItem from '../common/FolderItem';
import theme from '../../theme/theme';
import { DMSFactory, ApiConfig } from '../../api';

interface SearchResult {
  documents: Document[];
  folders: Folder[];
  totalItems: number;
}

interface Styles {
  container: ViewStyle;
  searchBarContainer: ViewStyle;
  searchBar: ViewStyle;
  listContent: ViewStyle;
  loadingContainer: ViewStyle;
  emptyContainer: ViewStyle;
  emptyIcon: ViewStyle;
  emptyText: TextStyle;
  emptySubtext: TextStyle;
}

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);

  const { serverUrl, authToken } = useSelector((state: RootState) => state.auth);

  const handleSearch = async (query: string) => {
    if (!query.trim() || !serverUrl || !authToken) return;

    try {
      setIsLoading(true);
      
      const config: ApiConfig = {
        baseUrl: serverUrl,
        timeout: 30000,
      };

      const provider = DMSFactory.createProvider('alfresco', config);
      provider.setToken(authToken);

      const searchResults = await provider.search(query);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilePress = async (file: Document) => {
    console.log('File selected:', file.name);
  };

  const handleFolderPress = (folder: Folder) => {
    console.log('Folder selected:', folder.name);
  };

  const renderItem = ({ item }: { item: Document | Folder }) => {
    if ('mimeType' in item) {
      return <FileItem file={item} onPress={() => handleFilePress(item)} />;
    }
    return <FolderItem folder={item} onPress={() => handleFolderPress(item)} />;
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <SearchIcon 
        size={48} 
        color={theme.colors.textTertiary} 
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyText}>
        {searchQuery 
          ? 'No results found' 
          : 'Search for files and folders'}
      </Text>
      {searchQuery && (
        <Text style={styles.emptySubtext}>
          Try using different keywords or filters
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <Searchbar
          placeholder="Search files and folders"
          onChangeText={setSearchQuery}
          onSubmitEditing={() => handleSearch(searchQuery)}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={results ? [...results.folders, ...results.documents] : []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchBarContainer: {
    padding: theme.spacing.base,
    backgroundColor: theme.colors.background,
    ...(Platform.OS === 'ios' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
    } : {
      elevation: 2,
    }),
  },
  searchBar: {
    elevation: 0,
    borderRadius: theme.spacing.base,
    backgroundColor: theme.colors.surfaceBackground,
  },
  listContent: {
    padding: theme.spacing.base,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing['2xl'],
  },
  emptyIcon: {
    marginBottom: theme.spacing.base,
  },
  emptyText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
});

export default SearchScreen;