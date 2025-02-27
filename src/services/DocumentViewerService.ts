import { DMSProvider, Document } from '../api/types';
import { Platform } from 'react-native';
import { FileSystem } from './FileSystem';
import { Logger } from '../utils/Logger';

export class DocumentViewerService {
        // In DocumentViewerService.tsx
        static async getDocumentUri(document: Document, provider: DMSProvider): Promise<string | null> {
            Logger.info('Getting document URI', {
                component: 'DocumentViewerService',
                method: 'getDocumentUri',
                data: { documentId: document.id, mimeType: document.mimeType }
            });
    
            try {
                const content = await provider.getDocumentContent(document.id);
    
                if (!content) {
                    Logger.warn('getDocumentContent returned empty content', {
                        component: 'DocumentViewerService',
                        method: 'getDocumentUri',
                        data: { documentId: document.id }
                    });
                    return null;
                }
    
                if (Platform.OS === 'web') {
                    const webURI =  `data:application/pdf;base64,${content}`;
                    Logger.info('Web URI Found: ', {
                        component: 'DocumentViewerService',
                        method: 'getDocumentUri',
                        data: { webURI }
                    });
                    return webURI;
                }
    
                const localPath = `${FileSystem.CachesDirectoryPath}/${document.id}_${document.name}`;
                Logger.info('Local Path: ', {
                    component: 'DocumentViewerService',
                    method: 'getDocumentUri',
                    data: { localPath }
                });
    
                // Add detailed error handling around writeFile
                try {
                    await FileSystem.writeFile(localPath, content, 'base64');
                    Logger.info("File written successfully", {
                        component: 'DocumentViewerService',
                        method: 'getDocumentUri',
                        data: { localPath }
                    });
                    const fileURI = `file://${localPath}`;
                    Logger.info("Returning file URI", {
                        component: 'DocumentViewerService',
                        method: 'getDocumentUri',
                        data: { fileURI }
                    });
                    return fileURI;
                } catch (writeFileError) {
                    Logger.error('FileSystem.writeFile failed', {
                        component: 'DocumentViewerService',
                        method: 'getDocumentUri',
                        data: { localPath }
                    }, writeFileError instanceof Error ? writeFileError : undefined);
                    return null; // Return null if writeFile fails
                }
    
            } catch (error) {
                Logger.error('Failed to get document URI', {
                    component: 'DocumentViewerService',
                    method: 'getDocumentUri',
                    data: { documentId: document.id }
                }, error instanceof Error ? error : undefined);
                return null;
            }
        }
    
    }
