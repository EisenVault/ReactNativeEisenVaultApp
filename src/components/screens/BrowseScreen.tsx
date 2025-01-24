// src/components/screens/BrowseScreen.tsx

import React, { useState, useEffect } from 'react';
import { 
  View, 
  FlatList, 
  ScrollView,
  StyleSheet, 
  ActivityIndicator, 
  TextStyle, 
  ViewStyle, 
  Platform 
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import FileItem from '../common/FileItem';
import FolderItem from '../common/FolderItem';
import { Document, Folder, DMSProvider } from '../../api/types';
import { DMSFactory, ApiConfig } from '../../api';
import { ChevronLeft, Home } from 'lucide-react-native';
import theme from '../../theme/theme';

interface BrowseItem {
  id: string;
  type: 'file' | 'folder';
  data: Document | Folder;
}

interface Styles {
  container: ViewStyle;
  centerContainer: ViewStyle;
  listContent: ViewStyle;
  breadcrumbs: ViewStyle;
  breadcrumbsContent: ViewStyle;
  breadcrumbSeparator: TextStyle;
  backButton: ViewStyle;
  errorText: TextStyle;
  emptyContainer: ViewStyle;
  emptyText: TextStyle;
}

const BrowseScreen = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState('-my-');
  const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([]);
  const [provider, setProvider] = useState<DMSProvider | null>(null);

  const { userProfile, isAuthenticated, serverUrl, authToken } = useSelector(
    (state: RootState) => state.auth
  );

  // Initialize provider when authentication is available
  useEffect(() => {
    const initProvider = async () => {
      try {
        if (!serverUrl || !authToken) {
          setError('Authentication data missing. Please log in again.');
          return;
        }
    
        const config: ApiConfig = {
          baseUrl: serverUrl,
          timeout: 30000,
        };
    
        const dmsProvider = DMSFactory.createProvider('alfresco', config);
        dmsProvider.setToken(authToken);
        setProvider(dmsProvider);
      } catch (err) {
        console.error('Provider initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize browser');
      }
    };

    if (isAuthenticated && !provider) {
      initProvider();
    }
  }, [isAuthenticated, serverUrl, authToken]);

  // Load folder contents whenever currentFolderId changes
  useEffect(() => {
    if (provider && currentFolderId) {
      loadCurrentFolder();
    }
  }, [provider, currentFolderId]);

  const loadCurrentFolder = async () => {
    if (!provider) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('Loading folder:', currentFolderId); // Debug log

      // Fetch both folders and documents concurrently
      const [folders, documents] = await Promise.all([
        provider.getFolders(currentFolderId),
        provider.getDocuments(currentFolderId)
      ]);

      console.log('Loaded folders:', folders.length, 'documents:', documents.length); // Debug log

      const formattedItems: BrowseItem[] = [
        ...folders.map(folder => ({
          id: folder.id,
          type: 'folder' as const,
          data: folder
        })),
        ...documents.map(document => ({
          id: document.id,
          type: 'file' as const,
          data: document
        }))
      ];

      setItems(formattedItems);
    } catch (err) {
      console.error('Folder loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load folder contents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderPress = async (folder: Folder) => {
    console.log('Folder pressed:', folder.id, folder.name); // Debug log
    
    // Update breadcrumbs first
    const newBreadcrumbs = [...breadcrumbs, folder];
    setBreadcrumbs(newBreadcrumbs);
    
    // Then update current folder ID
    setCurrentFolderId(folder.id);
  };

  const handleFilePress = async (file: Document) => {
    if (!provider) return;

    try {
      const blob = await provider.downloadDocument(file.id);
      const url = URL.createObjectURL(blob);
      window.open(url);
    } catch (err) {
      console.error('File download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  const handleBackPress = () => {
    if (breadcrumbs.length > 0) {
      const newBreadcrumbs = [...breadcrumbs];
      const lastFolder = newBreadcrumbs.pop(); // Remove current folder
      setBreadcrumbs(newBreadcrumbs);
      
      // Set current folder ID to parent folder or root
      const parentFolderId = newBreadcrumbs.length > 0 
        ? newBreadcrumbs[newBreadcrumbs.length - 1].id 
        : '-my-';
      
      setCurrentFolderId(parentFolderId);
    }
  };

  const handleHomePress = () => {
    setBreadcrumbs([]);
    setCurrentFolderId('-my-');
  };

  const renderItem = ({ item }: { item: BrowseItem }) => {
    if (item.type === 'file') {
      return (
        <FileItem 
          file={item.data as Document} 
          onPress={() => handleFilePress(item.data as Document)}
        />
      );
    }
    return (
      <FolderItem 
        folder={item.data as Folder} 
        onPress={() => handleFolderPress(item.data as Folder)}
      />
    );
  };

  const renderBreadcrumbs = () => (
    <View style={styles.breadcrumbs}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.breadcrumbsContent}
      >
        <Button 
          mode="text"
          onPress={handleHomePress}
          icon={() => <Home size={20} color={theme.colors.primary} />}
        >
          Home
        </Button>
        {breadcrumbs.map((folder, index) => (
          <React.Fragment key={folder.id}>
            <Text style={styles.breadcrumbSeparator}>/</Text>
            <Button 
              mode="text"
              onPress={() => {
                const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
                setBreadcrumbs(newBreadcrumbs);
                setCurrentFolderId(folder.id);
              }}
            >
              {folder.name}
            </Button>
          </React.Fragment>
        ))}
      </ScrollView>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          mode="contained" 
          onPress={() => loadCurrentFolder()}
          style={{ marginTop: theme.spacing.base }}
        >
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderBreadcrumbs()}
      {breadcrumbs.length > 0 && (
        <Button 
          mode="text"
          onPress={handleBackPress}
          icon={() => <ChevronLeft size={20} color={theme.colors.primary} />}
          style={styles.backButton}
        >
          Back
        </Button>
      )}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>This folder is empty</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: theme.spacing.base,
    flexGrow: 1,
  },
  breadcrumbs: {
    backgroundColor: theme.colors.surfaceBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  breadcrumbsContent: {
    flexDirection: 'row',
    padding: theme.spacing.sm,
  },
  breadcrumbSeparator: {
    marginHorizontal: theme.spacing.xs,
    color: theme.colors.textSecondary,
    alignSelf: 'center',
    fontSize: theme.typography.sizes.base,
  },
  backButton: {
    margin: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.sizes.base,
    textAlign: 'center',
    marginBottom: theme.spacing.base,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default BrowseScreen;