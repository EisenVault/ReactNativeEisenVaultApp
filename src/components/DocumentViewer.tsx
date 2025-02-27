import React, { useState, useEffect, useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Document } from '../api/types';
import { DocumentViewerService } from '../services/DocumentViewerService';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { DMSFactory } from '../api/factory';
import { Logger } from '../utils/Logger';
import { ImageViewer, FileViewer } from './viewers/index';
import theme from '../theme/theme';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../api/types';
import getPDFViewer from './PDFViewer';
import { DMSProvider } from '../api/types';

// Props type definition for the DocumentViewer screen
type DocumentViewerScreenProps = {
    route: RouteProp<RootStackParamList, 'DocumentViewer'>;
};

const DocumentViewer: React.FC<DocumentViewerScreenProps> = ({ route }) => {
    // 1. Extract route params (no hooks)
    const { documentId, name, mimeType } = route.params;
    
    // 2. All useState hooks first
    const [documentUri, setDocumentUri] = useState<string | null>(null);
    const [PDFViewer, setPDFViewer] = useState<React.ComponentType<any> | null>(null);
    const [provider, setProvider] = useState<DMSProvider | null>(null);

    // 3. Redux selector (contains useContext and other hooks internally)
    const { serverUrl, authToken, providerType } = useSelector((state: RootState) => state.auth);
    
    // 4. All useMemo hooks after
    useMemo(() => {
        if (providerType && serverUrl) {
            const config = { baseUrl: serverUrl, timeout: 30000 };
            setProvider(DMSFactory.createProvider(providerType, config));
        }
    }, [providerType, serverUrl]);

    // Construct document object with required metadata
    const document: Document = {
        id: documentId,
        name: name,
        mimeType: mimeType,
        path: '',
        size: 0,
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        createdBy: '',
        modifiedBy: '',
        isFolder: false,
        isDepartment: false,
        isOfflineAvailable: false,
        allowableOperations: [],
        type: 'file',
        data: {
            id: documentId,
            name: name,
            type: 'file',
            mimeType: mimeType,
            isFolder: false,
            isDepartment: false
        } as Document
    };

    // Handle opening non-PDF/non-image files with system viewer
    useEffect(() => {
        if (documentUri && !document.mimeType.startsWith('image/') && document.mimeType !== 'application/pdf') {
            FileViewer.open(documentUri, {
                showOpenWithDialog: true,
                displayName: document.name,
            });
        }
    }, [documentUri, document.mimeType, document.name]);

    // Load PDF viewer component dynamically
    useEffect(() => {
        let mounted = true;
        
        const loadViewer = async () => {
            const ViewerComponent = await getPDFViewer();
            if (mounted && ViewerComponent) {
                setPDFViewer(ViewerComponent);
            }
        };

        loadViewer();
        return () => { mounted = false; };
    }, []);

    // Load document content when provider and auth are available
    useEffect(() => {
        if (!provider || !authToken) return;
        
        const loadDocument = async () => {
            try {
                provider.setToken(authToken);
                const uri = await DocumentViewerService.getDocumentUri(document, provider);
                setDocumentUri(uri);
            } catch (error) {
                Logger.error('Failed to load document', {
                    component: 'DocumentViewer',
                    method: 'loadDocument',
                    data: { documentId: document.id }
                }, error instanceof Error ? error : undefined);
            }
        };
    
        loadDocument();
    }, [document, provider, authToken]);
    

    // Render appropriate viewer based on document type
    const renderViewer = () => {
        if (!documentUri) {
            return <ActivityIndicator />;
        }

        switch (true) {
            case document.mimeType === 'application/pdf':
                if (!PDFViewer) {
                    return <ActivityIndicator />;
                }
                return <PDFViewer uri={documentUri} />;

            case document.mimeType.startsWith('image/'):
                return (
                    <ImageViewer
                        imageUrls={[{ url: documentUri }]}
                        enableSwipeDown
                        saveToLocalByLongPress={false}
                    />
                );

            default:
                return null; // FileViewer.open is handled in useEffect
        }
    };

    // Component must return JSX
    return (
        <View style={styles.container}>
            {renderViewer()}
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background
    },
});

export default DocumentViewer;