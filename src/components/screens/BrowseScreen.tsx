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
import DepartmentItem from '../common/DepartmentItem';
import { Document, Folder, Department, DMSProvider } from '../../api/types';
import { DMSFactory, ApiConfig } from '../../api';
import { ChevronLeft, Home } from 'lucide-react-native';
import { MaterialIcons } from '@expo/vector-icons';
import theme from '../../theme/theme';

// BrowseItem represents any item that can be displayed in the browser
// This unified type allows us to handle departments, folders and files in a single list
interface BrowseItem {
    id: string;
    type: 'file' | 'folder' | 'department';
    data: Document | Folder | Department;
}

// Style interfaces for type-safe styling
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
    // Core state management
    // isLoading: Controls loading indicator visibility
    // error: Stores any error messages
    // items: Current list of items being displayed
    // currentDepartmentId: Tracks the active department
    // currentFolderId: Tracks the active folder
    // breadcrumbs: Maintains navigation history
    // provider: DMS provider instance for API operations
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<BrowseItem[]>([]);
    const [currentDepartmentId, setCurrentDepartmentId] = useState<string>('');
    const [currentFolderId, setCurrentFolderId] = useState<string>('');
    const [breadcrumbs, setBreadcrumbs] = useState<Array<Department | Folder>>([]);
    const [provider, setProvider] = useState<DMSProvider | null>(null);

    // Get authentication data from Redux store
    const { userProfile, isAuthenticated, serverUrl, authToken, providerType } = useSelector(
        (state: RootState) => state.auth
    );

    // Initialize DMS provider when authentication is confirmed
    useEffect(() => {
        let mounted = true;
        
        const initializeProvider = async (): Promise<void> => {
            // Create and configure DMS provider based on auth data
            // This enables API operations for the selected DMS type
            try {
                if (!serverUrl || !authToken || !providerType) {
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
                    await loadDepartments(dmsProvider);
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
    }, [isAuthenticated, serverUrl, authToken, providerType]);

    // Load departments (top-level containers)
    const loadDepartments = async (dmsProvider: DMSProvider): Promise<void> => {
        // Fetch and display available departments
        // These are the root level containers in the DMS
        try {
            setIsLoading(true);
            setError(null);
            console.log('Loading departments...dmsProvider', dmsProvider);
            const departments = await dmsProvider.getDepartments();
            
            setItems(
                departments.map(dept => ({
                    id: dept.id,
                    type: 'department' as const,
                    data: dept
                }))
            );

            setIsLoading(false);
            setError(null);
        } catch (err) {
            console.error('Failed to load departments:', err);
            setError(err instanceof Error ? err.message : 'Failed to load departments');
            setIsLoading(false);
        }
    };

    // Load folder contents when department or folder changes
    useEffect(() => {
        if (provider && (currentDepartmentId || currentFolderId)) {
            loadCurrentContent();
        }
    }, [provider, currentDepartmentId, currentFolderId]);

    // Load current content (folders/files within department or folder)
    const loadCurrentContent = async (): Promise<void> => {
        // Fetch and display items within the selected container
        // Handles both folders and files
        if (!provider) return;

        try {
            setIsLoading(true);
            setError(null);

            const parentId = currentFolderId || currentDepartmentId;
            const [folders, documents] = await Promise.all([
                provider.getFolders(parentId),
                provider.getDocuments(parentId)
            ]);

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
            console.error('Content loading error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load content');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle department selection
    const handleDepartmentPress = async (department: Department): Promise<void> => {
        // Navigate into a department
        // Updates breadcrumbs and loads department contents
        try {
            setCurrentDepartmentId(department.id);
            setCurrentFolderId('');
            setBreadcrumbs([department]);
        } catch (err) {
            console.error('Failed to load department:', err);
            setError('Failed to load department');
        }
    };

    // Handle folder selection
    const handleFolderPress = async (folder: Folder): Promise<void> => {
        // Navigate into a folder
        // Updates breadcrumbs and loads folder contents
        try {
            setCurrentFolderId(folder.id);
            
            if (breadcrumbs.length > 0) {
                const existingPath = breadcrumbs.map(b => b.id);
                if (!existingPath.includes(folder.id)) {
                    setBreadcrumbs([...breadcrumbs, folder]);
                }
            }
        } catch (err) {
            console.error('Failed to load folder:', err);
            setError('Failed to load folder');
        }
    };

    // Handle file selection
    const handleFilePress = async (file: Document): Promise<void> => {
        // Handle file selection
        // Typically initiates file download or preview
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

    const handleBackPress = (): void => {
        // Navigate to previous level
        // Updates breadcrumbs and reloads appropriate content
        if (breadcrumbs.length > 0) {
            const newBreadcrumbs = [...breadcrumbs];
            newBreadcrumbs.pop();
            setBreadcrumbs(newBreadcrumbs);
            
            if (newBreadcrumbs.length === 0) {
                // Return to departments list
                setCurrentDepartmentId('');
                setCurrentFolderId('');
                if (provider) {
                    loadDepartments(provider);
                }
            } else {
                const lastItem = newBreadcrumbs[newBreadcrumbs.length - 1];
                if ('isDepartment' in lastItem && lastItem.isDepartment) {
                    setCurrentDepartmentId(lastItem.id);
                    setCurrentFolderId('');
                } else {
                    setCurrentFolderId(lastItem.id);
                }
            }
        }
    };

    const handleHomePress = async (): Promise<void> => {
        // Return to root level (departments list)
        // Resets navigation state
        setBreadcrumbs([]);
        setCurrentDepartmentId('');
        setCurrentFolderId('');
        if (provider) {
            await loadDepartments(provider);
        }
    };

    // Render methods
    const renderItem = ({ item }: { item: BrowseItem }): React.ReactElement => {
        // Renders appropriate component based on item type
        // Uses DepartmentItem, FileItem, or FolderItem
        switch (item.type) {
            case 'department':
                return (
                    <DepartmentItem 
                        department={item.data as Department} 
                        onPress={() => handleDepartmentPress(item.data as Department)}
                    />
                );
            case 'file':
                return (
                    <FileItem 
                        file={item.data as Document} 
                        onPress={() => handleFilePress(item.data as Document)}
                    />
                );
            case 'folder':
                return (
                    <FolderItem 
                        folder={item.data as Folder} 
                        onPress={() => handleFolderPress(item.data as Folder)}
                    />
                );
        }
    };

    const renderBreadcrumbs = (): React.ReactElement => {
        // Displays navigation hierarchy
        // Enables direct navigation to previous levels
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
                            Departments
                        </Button>
                        {breadcrumbs.map((item, index) => (
                            <View key={`${item.id}-${index}`} style={styles.breadcrumbItem}>
                                <Text style={styles.breadcrumbSeparator}>/</Text>
                                <Button 
                                    mode="text"
                                    onPress={() => {
                                        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
                                        setBreadcrumbs(newBreadcrumbs);
                                        if ('isDepartment' in item && item.isDepartment) {
                                            setCurrentDepartmentId(item.id);
                                            setCurrentFolderId('');
                                        } else {
                                            setCurrentFolderId(item.id);
                                        }
                                    }}
                                    style={styles.breadcrumbButton}
                                    labelStyle={styles.breadcrumbLabel}
                                >
                                    {item.name}
                                </Button>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>
        );
    };

    // Main render logic with conditional states
    // Handles loading, error, and content display states
    return (
        <SafeAreaView style={styles.container}>
            {isLoading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : error ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Button 
                        mode="contained" 
                        onPress={() => {
                            if (currentDepartmentId || currentFolderId) {
                                loadCurrentContent();
                            } else if (provider) {
                                loadDepartments(provider);
                            }
                        }}
                        style={{ marginTop: theme.spacing.base }}
                    >
                        Retry
                    </Button>
                </View>
            ) : (
                <View style={styles.contentContainer}>
                    {renderBreadcrumbs()}
                    {(currentDepartmentId || currentFolderId) && (
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
                                <Text style={styles.emptyText}>
                                    {currentDepartmentId || currentFolderId 
                                        ? 'This folder is empty'
                                        : 'No departments available'}
                                </Text>
                            </View>
                        )}
                    />
                </View>
            )}
        </SafeAreaView>
    );
};

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
