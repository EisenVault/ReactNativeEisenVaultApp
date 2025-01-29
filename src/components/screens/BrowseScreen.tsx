// src/components/screens/BrowseScreen.tsx
//
// This component provides a browsing interface for document management systems (DMS).
// For Alfresco, it directly shows the contents of the Sites folder, skipping the Sites
// folder itself in the navigation hierarchy. It prevents navigation above the Sites level
// and provides a clean breadcrumb trail starting from the site contents.

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

// Define supported provider types
type ProviderType = 'alfresco' | 'angora';

// Constants for DMS providers and their specific configurations
const DMS_PROVIDERS = {
  ALFRESCO: 'alfresco' as ProviderType,
  ANGORA: 'angora' as ProviderType,
};

// Alfresco-specific constants
const ALFRESCO_CONSTANTS = {
  ROOT_ID: '-root-',           // Root folder reference
  SITES_NODE_TYPE: 'st:sites', // Alfresco Sites folder type
  SITES_FOLDER_NAME: 'Sites'   // Display name for sites folder
} as const;

// Interface for items displayed in the browse list
interface BrowseItem {
  id: string;
  type: 'file' | 'folder';
  data: Document | Folder;
}

// Style types for type safety
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

const BrowseScreen = () => {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>(ALFRESCO_CONSTANTS.ROOT_ID);
  const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([]);
  const [provider, setProvider] = useState<DMSProvider | null>(null);
  const [providerType, setProviderType] = useState<ProviderType>(DMS_PROVIDERS.ALFRESCO);
  // Track Sites folder ID to handle navigation and UI visibility
  const [sitesFolderId, setSitesFolderId] = useState<string | null>(null);

  // Get authentication state from Redux store
  const { userProfile, isAuthenticated, serverUrl, authToken } = useSelector(
    (state: RootState) => state.auth
  );

  // Initialize provider and navigate to initial folder
  useEffect(() => {
    let mounted = true;
    
    const initializeAndNavigate = async () => {
      try {
        if (!serverUrl || !authToken) {
          setError('Authentication data missing. Please log in again.');
          return;
        }
    
        const config: ApiConfig = {
          baseUrl: serverUrl,
          timeout: 30000,
        };
    
        const dmsProvider = DMSFactory.createProvider(providerType, config);
        dmsProvider.setToken(authToken);
        
        if (mounted) {
          setProvider(dmsProvider);
          
          // For Alfresco, navigate directly to sites contents
          if (providerType === DMS_PROVIDERS.ALFRESCO) {
            await findAndNavigateToSites(dmsProvider);
          }
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
      initializeAndNavigate();
    }

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, serverUrl, authToken, providerType]);

  /**
   * Finds the Sites folder and loads its contents directly
   * Handles platform-specific navigation behavior
   */
  const findAndNavigateToSites = async (dmsProvider: DMSProvider) => {
    try {
      console.log('Finding sites folder...');
      
      // First get the Sites folder using the nodeType filter
      const rootFolders = await dmsProvider.getFolders(ALFRESCO_CONSTANTS.ROOT_ID, {
        nodeType: ALFRESCO_CONSTANTS.SITES_NODE_TYPE
      });

      console.log('Found root folders:', rootFolders.length);

      if (rootFolders && rootFolders.length > 0) {
        const sitesFolder = rootFolders[0];
        setSitesFolderId(sitesFolder.id);
        console.log('Sites folder found:', sitesFolder.id);

        // Immediately load the contents of the Sites folder
        const [siteContents, documents] = await Promise.all([
          dmsProvider.getFolders(sitesFolder.id),
          dmsProvider.getDocuments(sitesFolder.id)
        ]);

        console.log('Loaded site contents:', siteContents.length, 'folders,', documents.length, 'documents');

        // Format all items
        const formattedItems: BrowseItem[] = [
          ...siteContents.map(folder => ({
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

        // Update state
        setItems(formattedItems);
        setBreadcrumbs([]); // Keep breadcrumbs empty at Sites level
        setCurrentFolderId(sitesFolder.id);
        
        // Ensure loading state is cleared
        setIsLoading(false);
        setError(null);
      } else {
        console.warn('Sites folder not found');
        setError('Sites folder not found. Please contact your administrator.');
      }
    } catch (err) {
      console.error('Failed to find Sites folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize browser');
      setIsLoading(false);
    }
  };

  // Load folder contents whenever currentFolderId changes
  useEffect(() => {
    if (provider && currentFolderId && currentFolderId !== sitesFolderId) {
      loadCurrentFolder();
    }
  }, [provider, currentFolderId]);

  /**
   * Loads the contents of the current folder
   */
  const loadCurrentFolder = async () => {
    if (!provider) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('Loading folder:', currentFolderId);

      // Fetch both folders and documents concurrently
      const [folders, documents] = await Promise.all([
        provider.getFolders(currentFolderId),
        provider.getDocuments(currentFolderId)
      ]);

      console.log('Loaded folders:', folders.length, 'documents:', documents.length);

      // Format items for display
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

  /**
   * Handles folder navigation
   * Updates breadcrumbs and loads the selected folder contents
   */
  const handleFolderPress = async (folder: Folder) => {
    console.log('Folder press - Starting navigation:', {
      folderId: folder.id,
      folderName: folder.name,
      currentBreadcrumbs: breadcrumbs.map(b => ({id: b.id, name: b.name})),
      isSitesFolder: folder.id === sitesFolderId,
      parentId: folder.parentId
    });
    
    setIsLoading(true);
    
    try {
      // Load the contents of the clicked folder
      const [folders, documents] = await Promise.all([
        provider!.getFolders(folder.id),
        provider!.getDocuments(folder.id)
      ]);

      // Only skip breadcrumb update if this is the Sites folder itself
      const isSitesFolder = folder.id === sitesFolderId;
      console.log('Navigation check:', {
        isSitesFolder,
        folderId: folder.id,
        sitesFolderId,
        currentPath: folder.path
      });

      if (!isSitesFolder) {
        // If we're already in a path, add to existing breadcrumbs
        if (breadcrumbs.length > 0) {
          const existingPath = breadcrumbs.map(b => b.id);
          if (!existingPath.includes(folder.id)) {
            const newBreadcrumbs = [...breadcrumbs, folder];
            console.log('Adding to existing breadcrumbs:', {
              oldLength: breadcrumbs.length,
              newLength: newBreadcrumbs.length,
              path: newBreadcrumbs.map(b => b.name).join(' > ')
            });
            setBreadcrumbs(newBreadcrumbs);
          }
        } else {
          // Starting a new path
          console.log('Starting new breadcrumb path with:', folder.name);
          setBreadcrumbs([folder]);
        }
      } else {
        console.log('Skipping breadcrumb update - at Sites level');
        setBreadcrumbs([]);
      }
      
      // Update current folder ID and items
      setCurrentFolderId(folder.id);
      setItems([
        ...folders.map(f => ({
          id: f.id,
          type: 'folder' as const,
          data: f
        })),
        ...documents.map(doc => ({
          id: doc.id,
          type: 'file' as const,
          data: doc
        }))
      ]);
    } catch (err) {
      console.error('Failed to load folder contents:', err);
      setError('Failed to load folder contents');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles file opening/downloading
   */
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

  /**
   * Handles back navigation
   * Prevents going above Sites level in Alfresco
   */
  const handleBackPress = () => {
    if (breadcrumbs.length > 0) {
      const newBreadcrumbs = [...breadcrumbs];
      newBreadcrumbs.pop();
      setBreadcrumbs(newBreadcrumbs);
      
      // For Alfresco, prevent going above sites level
      if (providerType === DMS_PROVIDERS.ALFRESCO && newBreadcrumbs.length === 0) {
        // Return to sites folder contents without showing Sites in breadcrumbs
        if (sitesFolderId) {
          setBreadcrumbs([]);
          setCurrentFolderId(sitesFolderId);
          loadCurrentFolder(); // Reload sites contents
          return;
        }
      }
      
      // Set current folder ID to parent folder
      const parentFolderId = newBreadcrumbs.length > 0 
        ? newBreadcrumbs[newBreadcrumbs.length - 1].id 
        : sitesFolderId || ALFRESCO_CONSTANTS.ROOT_ID;
      
      setCurrentFolderId(parentFolderId);
    }
  };

  /**
   * Handles home navigation
   * Returns to Sites contents in Alfresco
   */
  const handleHomePress = async () => {
    if (providerType === DMS_PROVIDERS.ALFRESCO && provider) {
      await findAndNavigateToSites(provider);
    } else {
      setBreadcrumbs([]);
      setCurrentFolderId(ALFRESCO_CONSTANTS.ROOT_ID);
    }
  };

  /**
   * Renders a list item (file or folder)
   */
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

  /**
   * Renders the breadcrumb navigation
   * Handles platform-specific icons for iOS compatibility
   */
  const renderBreadcrumbs = () => {
    console.log('Rendering breadcrumbs:', {
      hasBreadcrumbs: breadcrumbs.length > 0,
      breadcrumbsPath: breadcrumbs.map(b => b.name).join(' > '),
      currentFolderId,
      sitesFolderId,
      isAtSitesLevel: currentFolderId === sitesFolderId
    });
    
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
        {breadcrumbs.length > 0 && currentFolderId !== sitesFolderId && (
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