import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
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


type DocumentViewerScreenProps = {
    route: RouteProp<RootStackParamList, 'DocumentViewer'>;
};

const DocumentViewer: React.FC<DocumentViewerScreenProps> = ({ route }) => {
    const { documentId, name, mimeType } = route.params;
    const [documentUri, setDocumentUri] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [PDFViewer, setPDFViewer] = useState<React.ComponentType<any> | null>(null);
    const { serverUrl, authToken, providerType } = useSelector((state: RootState) => state.auth);

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
    

    useEffect(() => {
        loadDocument();
    }, [document]);

    useEffect(() => {
        const loadPDFViewer = async () => {
          const PDFViewerComponent = await getPDFViewer();
          setPDFViewer(PDFViewerComponent);
        };
    
        loadPDFViewer();
      }, []);

    const loadDocument = async () => {
        try {
            if (!providerType || !serverUrl || !authToken) {
                throw new Error('Missing authentication data');
            }

            const config = { baseUrl: serverUrl, timeout: 30000 };
            const provider = DMSFactory.createProvider(providerType, config);
            provider.setToken(authToken);

            const uri = await DocumentViewerService.getDocumentUri(document, provider);
            setDocumentUri(uri);
            setIsLoading(false);
        } catch (error) {
            Logger.error('Failed to load document', {
                component: 'DocumentViewer',
                method: 'loadDocument',
                data: { documentId: document.id }
            }, error instanceof Error ? error : undefined);
            setIsLoading(false);
        }
    };

    const renderViewer = () => {
        if (!documentUri) return null;

        switch (true) {
            case document.mimeType === 'application/pdf':
                if (PDFViewer) {
                    return <PDFViewer uri={documentUri} />;
                } else {
                    return <ActivityIndicator />;
                }
            
            case document.mimeType.startsWith('image/'):
                return (
                    <ImageViewer
                        imageUrls={[{ url: documentUri }]}
                        enableSwipeDown
                        saveToLocalByLongPress={false}
                    />
                );
            
            default:
                FileViewer.open(documentUri, {
                    showOpenWithDialog: true,
                    displayName: document.name,
                });
                return null;
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {renderViewer()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    }
});

export default DocumentViewer;