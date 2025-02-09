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
import { Logger, DMSType } from '@/src/utils/Logger';

interface BrowseItem {
    id: string;
    type: 'file' | 'folder' | 'department';
    data: Document | Folder | Department;
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
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<BrowseItem[]>([]);
    const [currentDepartmentId, setCurrentDepartmentId] = useState<string>('');
    const [currentFolderId, setCurrentFolderId] = useState<string>('');
    const [breadcrumbs, setBreadcrumbs] = useState<Array<Department | Folder>>([]);
    const [provider, setProvider] = useState<DMSProvider | null>(null);
    
    const { userProfile, isAuthenticated, serverUrl, authToken, providerType } = useSelector(
        (state: RootState) => state.auth
    );

    useEffect(() => {
        let mounted = true;
        
        const initializeProvider = async (): Promise<void> => {
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
                Logger.error(
                    'Provider initialization error',
                    {
                        dms: providerType as DMSType,
                        component: 'BrowseScreen',
                        method: 'initializeProvider',
                        data: err
                    },
                    err instanceof Error ? err : undefined
                );
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

    const loadContents = async (parentId: string) => {
        try {
            setIsLoading(true);
            setError(null);

            if (!provider) {
                throw new Error('Provider not initialized');
            }

            const items = await provider.getChildren(parentId);
            setItems(items);
            
        } catch (err) {
            Logger.error('Failed to load contents', {
                component: 'BrowseScreen',
                method: 'loadContents',
                data: err
            });
            setError('Failed to load contents');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (provider && (currentDepartmentId || currentFolderId)) {
            loadContents(currentFolderId || currentDepartmentId);
        }
    }, [provider, currentDepartmentId, currentFolderId]);

    const handleDepartmentPress = async (department: Department): Promise<void> => {
        try {
            setCurrentDepartmentId(department.id);
            setCurrentFolderId('');
            setBreadcrumbs([department]);
        } catch (err) {
            Logger.error(
                'Failed to load department',
                {
                    dms: providerType as DMSType,
                    component: 'BrowseScreen',
                    method: 'handleDepartmentPress',
                    data: { departmentId: department.id, error: err }
                },
                err instanceof Error ? err : undefined
            );
            setError('Failed to load department');
        }
    };
    const handleFolderPress = async (folder: Folder): Promise<void> => {
        try {
            setCurrentFolderId(folder.id);
            
            if (breadcrumbs.length > 0) {
                const existingPath = breadcrumbs.map(b => b.id);
                if (!existingPath.includes(folder.id)) {
                    setBreadcrumbs([...breadcrumbs, folder]);
                }
            }
        } catch (err) {
            Logger.error(
                'Failed to load folder',
                {
                    dms: providerType as DMSType,
                    component: 'BrowseScreen',
                    method: 'handleFolderPress',
                    data: { folderId: folder.id, error: err }
                },
                err instanceof Error ? err : undefined
            );
            setError('Failed to load folder');
        }
    };

    const handleFilePress = async (file: Document): Promise<void> => {
        if (!provider) return;

        try {
            const blob = await provider.downloadDocument(file.id);
            const url = URL.createObjectURL(blob);
            window.open(url);
        } catch (err) {
            Logger.error(
                'File download error',
                {
                    dms: providerType as DMSType,
                    component: 'BrowseScreen',
                    method: 'handleFilePress',
                    data: { fileId: file.id, error: err }
                },
                err instanceof Error ? err : undefined
            );
            setError(err instanceof Error ? err.message : 'Failed to download file');
        }
    };

    const handleBackPress = (): void => {
        if (breadcrumbs.length > 0) {
            const newBreadcrumbs = [...breadcrumbs];
            newBreadcrumbs.pop();
            setBreadcrumbs(newBreadcrumbs);
            
            if (newBreadcrumbs.length === 0) {
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
        setBreadcrumbs([]);
        setCurrentDepartmentId('');
        setCurrentFolderId('');
        if (provider) {
            await loadDepartments(provider);
        }
    };
    const loadDepartments = async (dmsProvider: DMSProvider) => {
        Logger.info('Loading departments', {
            dms: providerType as DMSType,
            component: 'BrowseScreen',
            method: 'loadDepartments'
        });
        try {
            const departments = await dmsProvider.getDepartments();
            const browseItems: BrowseItem[] = departments.map(dept => ({
                id: dept.id,
                name: dept.name,
                path: dept.path || '',
                isFolder: true,
                createdBy: dept.createdBy || '',
                modifiedBy: dept.createdBy || '',
                lastModified: new Date().toISOString(), // Departments might not have this
                createdAt: new Date().toISOString(),    // Departments might not have this
                allowableOperations: [],                // Departments might have different permissions
                type: 'department' as const,
                data: dept
            }));
            setItems(browseItems);
        } catch (err) {
            Logger.error('Failed to load departments', {
                component: 'BrowseScreen',
                method: 'loadDepartments',
                data: err
            });
            setError('Failed to load departments');
        }finally {
            setIsLoading(false);
        }
    };

    const loadCurrentContent = async () => {
        if (!currentDepartmentId && !currentFolderId) {
            await loadDepartments(provider!);
            return;
        }
        await loadContents(currentFolderId || currentDepartmentId);
    };

    const renderItem = ({ item }: { item: BrowseItem }): React.ReactElement => {
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
            ) : (<View style={styles.contentContainer}>
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
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {currentDepartmentId || currentFolderId 
                                    ? 'This folder is empty'
                                    : 'No departments available'}
                            </Text>
                        </View>
                    }
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
