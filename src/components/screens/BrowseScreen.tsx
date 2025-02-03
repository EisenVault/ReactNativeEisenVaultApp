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
  Platform,
  SafeAreaView 
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import FileItem from '../common/FileItem';
import FolderItem from '../common/FolderItem';
import { Document, Folder, DMSProvider } from '../../api/types';
import { DMSFactory, ApiConfig } from '../../api';
import { ChevronLeft, Home } from 'lucide-react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '../../theme/theme';

// Type Definitions
type ProviderType = 'alfresco' | 'angora';

// Angora API configuration
const ANGORA_API = {
  DEPARTMENTS_ENDPOINT: 'departments',
  CHILDREN_ENDPOINT: 'children',
  FOLDERS_PARAM: 'only_folders=true'
} as const;

interface BrowseItem {
  id: string;
  type: 'file' | 'folder';
  data: Document | Folder;
}

interface Styles {
  container: ViewStyle;
  contentContainer: ViewStyle;
  centerContainer: ViewStyle;
  listContent: ViewStyle;
  breadcrumbs: ViewStyle;
  breadcrumbsContent: ViewStyle;
  breadcrumbsContainer: ViewStyle;
  breadcrumbRow: ViewStyle;
  breadcrumbItem: ViewStyle;
  breadcrumbButton: ViewStyle;
  breadcrumbLabel: TextStyle;
  breadcrumbSeparator: TextStyle;
  backButton: ViewStyle;
  errorText: TextStyle;
  emptyContainer: ViewStyle;
  emptyText: TextStyle;
}
const BrowseScreen: React.FC = () => {
  // State management with proper typing
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('');
  const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([]);
  const [provider, setProvider] = useState<DMSProvider | null>(null);

  // Redux state
  const { userProfile, isAuthenticated, serverUrl, authToken } = useSelector(
    (state: RootState) => state.auth
  );

  // Initialize provider
  useEffect(() => {
    let mounted = true;
    
    const initializeProvider = async (): Promise<void> => {
      try {
        if (!serverUrl || !authToken) {
          setError('Authentication data missing. Please log in again.');
          return;
        }
    
        const config: ApiConfig = {
          baseUrl: serverUrl,
          timeout: 30000,
        };
    
        const dmsProvider = DMSFactory.createProvider('angora', config);
        dmsProvider.setToken(authToken);
        
        if (mounted) {
          setProvider(dmsProvider);
          await loadInitialContent(dmsProvider);
        }
      } catch (err) {
        console.error('Provider initialization error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize browser');
        }
      }
    };

    if (isAuthenticated && !provider) {
      setIsLoading(true);
      initializeProvider();
    }

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, serverUrl, authToken]);

  // Load initial content
  const loadInitialContent = async (dmsProvider: DMSProvider): Promise<void> => {
    try {
      // For Angora, get root level departments
      const rootFolders = await dmsProvider.getFolders('', { 
        nodeType: ANGORA_API.DEPARTMENTS_ENDPOINT 
      });
      const documents: Document[] = []; // Root level has no documents in Angora

      const formattedItems: BrowseItem[] = [
        ...rootFolders.map(folder => ({
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
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Failed to load initial content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load content');
      setIsLoading(false);
    }
  };
  // Load content when folder changes
  useEffect(() => {
    if (provider && currentFolderId) {
      loadCurrentFolder();
    }
  }, [provider, currentFolderId]);

  // Load folder contents
  const loadCurrentFolder = async () => {
    if (!provider) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('Loading folder:', currentFolderId);

      // For Angora, we use departments endpoint
      const path = currentFolderId 
        ? `departments/${currentFolderId}/children`
        : 'departments';

      // Fetch both folders and documents concurrently
      const [folders, documents] = await Promise.all([
        provider.getFolders(path),
        provider.getDocuments(path)
      ]);

      console.log('Loaded:', { folderCount: folders.length, documentCount: documents.length });

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

  // Handle folder navigation
  const handleFolderPress = async (folder: Folder): Promise<void> => {
    try {
      setCurrentFolderId(folder.id);
      
      if (breadcrumbs.length > 0) {
        const existingPath = breadcrumbs.map(b => b.id);
        if (!existingPath.includes(folder.id)) {
          setBreadcrumbs([...breadcrumbs, folder]);
        }
      } else {
        setBreadcrumbs([folder]);
      }
    } catch (err) {
      console.error('Failed to load folder contents:', err);
      setError('Failed to load folder contents');
    }
  };

  // Handle file operations
  const handleFilePress = async (file: Document): Promise<void> => {
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

  // Navigation handlers
  const handleBackPress = (): void => {
    if (breadcrumbs.length > 0) {
      const newBreadcrumbs = [...breadcrumbs];
      newBreadcrumbs.pop();
      setBreadcrumbs(newBreadcrumbs);
      
      const parentFolderId = newBreadcrumbs.length > 0 
        ? newBreadcrumbs[newBreadcrumbs.length - 1].id 
        : '';
      
      setCurrentFolderId(parentFolderId);
    }
  };

  const handleHomePress = async (): Promise<void> => {
    setBreadcrumbs([]);
    setCurrentFolderId('');
    if (provider) {
      await loadInitialContent(provider);
    }
  };
  // Render list items
  const renderItem = ({ item }: { item: BrowseItem }): React.ReactElement => {
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

  // Render breadcrumb navigation
  const renderBreadcrumbs = (): React.ReactElement => {
    return (
      <View style={styles.breadcrumbs}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.breadcrumbsContent}
          contentContainerStyle={styles.breadcrumbsContainer}
        >
          <View style={styles.breadcrumbRow}>
            <Button 
              key="home-button"
              mode="text"
              onPress={handleHomePress}
              icon={() => Platform.select({
                ios: <MaterialIcons name="home" size={20} color={theme.colors.primary} />,
                default: <Home size={20} color={theme.colors.primary} />
              })}
            >
              Home
            </Button>
            {breadcrumbs.map((folder, index) => (
              <View key={`${folder.id}-${index}`} style={styles.breadcrumbItem}>
                <Text style={styles.breadcrumbSeparator}>/</Text>
                <Button 
                  mode="text"
                  onPress={() => {
                    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
                    setBreadcrumbs(newBreadcrumbs);
                    setCurrentFolderId(folder.id);
                  }}
                  style={styles.breadcrumbButton}
                  labelStyle={styles.breadcrumbLabel}
                >
                  {folder.name}
                </Button>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
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
      </SafeAreaView>
    );
  }

  // Main render
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        {renderBreadcrumbs()}
        {breadcrumbs.length > 0 && (
          <Button 
            mode="text"
            onPress={handleBackPress}
            icon={() => Platform.select({
              ios: <MaterialIcons name="chevron-left" size={20} color={theme.colors.primary} />,
              default: <ChevronLeft size={20} color={theme.colors.primary} />
            })}
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
    </SafeAreaView>
  );
};
// Styles
const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flex: 1,
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
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 54,
  },
  breadcrumbsContent: {
    flexDirection: 'row',
  },
  breadcrumbsContainer: {
    flexGrow: 1,
    alignItems: 'center',
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 54,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbButton: {
    minHeight: 36,
    justifyContent: 'center',
  },
  breadcrumbLabel: {
    fontSize: 14,
  },
  breadcrumbSeparator: {
    marginHorizontal: 4,
    color: '#757575',
    fontSize: 14,
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