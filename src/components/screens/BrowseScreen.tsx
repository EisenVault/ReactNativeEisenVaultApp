// src/components/screens/BrowseScreen.tsx
//
// This component provides a browsing interface for document management systems (DMS).
// It is currently implemented for Alfresco DMS with plans to support Angora DMS.
// For Alfresco, it provides a specialized view that:
// - Starts directly at the Sites folder level
// - Hides the Sites folder from breadcrumb navigation
// - Prevents navigation above the Sites folder level

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

// Define supported provider types for the DMS system
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
  // Component state management
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

  // Initialize DMS provider and navigate to initial folder
  useEffect(() => {
    const initializeAndNavigate = async () => {
      try {
        if (!serverUrl || !authToken) {
          setError('Authentication data missing. Please log in again.');
          return;
        }
    
        // Create DMS provider configuration
        const config: ApiConfig = {
          baseUrl: serverUrl,
          timeout: 30000,
        };
    
        // Initialize the appropriate DMS provider
        const dmsProvider = DMSFactory.createProvider(providerType, config);
        dmsProvider.setToken(authToken);
        setProvider(dmsProvider);

        // For Alfresco, navigate directly to sites
        if (providerType === DMS_PROVIDERS.ALFRESCO) {
          await findAndNavigateToSites(dmsProvider);
        }
        // Future Angora initialization will go here
      } catch (err) {
        console.error('Provider initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize browser');
      }
    };

    if (isAuthenticated && !provider) {
      initializeAndNavigate();
    }
  }, [isAuthenticated, serverUrl, authToken, providerType]);

  /**
   * Finds and navigates to the Sites folder in Alfresco
   * Uses nodeType filter to find the specific Sites folder
   * Sets up initial navigation state without showing Sites in breadcrumbs
   */
  const findAndNavigateToSites = async (dmsProvider: DMSProvider) => {
    try {
      // Get the Sites folder using the nodeType filter
      const folders = await dmsProvider.getFolders(ALFRESCO_CONSTANTS.ROOT_ID, {
        nodeType: ALFRESCO_CONSTANTS.SITES_NODE_TYPE
      });

      if (folders && folders.length > 0) {
        const sitesFolder = folders[0]; // There should only be one Sites folder
        setSitesFolderId(sitesFolder.id); // Store Sites folder ID for navigation control
        setBreadcrumbs([]); // Don't show Sites in breadcrumbs
        setCurrentFolderId(sitesFolder.id);
      } else {
        console.warn('Sites folder not found');
        setError('Sites folder not found. Please contact your administrator.');
      }
    } catch (err) {
      console.error('Failed to find Sites folder:', err);
      throw err;
    }
  };

  // Load folder contents whenever currentFolderId changes
  useEffect(() => {
    if (provider && currentFolderId) {
      loadCurrentFolder();
    }
  }, [provider, currentFolderId]);

  /**
   * Loads the contents of the current folder
   * Fetches both folders and documents concurrently for efficiency
   */
  const loadCurrentFolder = async () => {
    if (!provider) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('Loading folder:', currentFolderId);

      // Fetch folders and documents in parallel
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
    console.log('Folder pressed:', folder.id, folder.name);
    
    // Update breadcrumbs first
    const newBreadcrumbs = [...breadcrumbs, folder];
    setBreadcrumbs(newBreadcrumbs);
    
    // Then update current folder ID
    setCurrentFolderId(folder.id);
  };

  /**
   * Handles file opening/downloading
   * Creates a blob URL and opens it in a new window
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
   * Special handling for Alfresco to prevent going above Sites level
   * and to hide Sites folder from breadcrumbs
   */
  const handleBackPress = () => {
    if (breadcrumbs.length > 0) {
      const newBreadcrumbs = [...breadcrumbs];
      newBreadcrumbs.pop();
      setBreadcrumbs(newBreadcrumbs);
      
      // For Alfresco, prevent going above sites level
      if (providerType === DMS_PROVIDERS.ALFRESCO && newBreadcrumbs.length === 0) {
        // Return to sites folder without adding it to breadcrumbs
        if (sitesFolderId) {
          setBreadcrumbs([]);
          setCurrentFolderId(sitesFolderId);
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
   * For Alfresco, returns to Sites folder without showing it in breadcrumbs
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
   * Renders a single list item (file or folder)
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
   * Shows current folder hierarchy with Home button
   */
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

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Error state
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

  // Main render
  return (
    <View style={styles.container}>
      {renderBreadcrumbs()}
      {/* Only show back button when not at Sites level */}
      {breadcrumbs.length > 0 && currentFolderId !== sitesFolderId && (
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

// Styles
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