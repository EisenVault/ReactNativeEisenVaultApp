import { DMSProvider, Document } from '../api/types';
import { Platform } from 'react-native';
import { FileSystem } from './FileSystem';
import { Logger } from '../utils/Logger';

export class DocumentViewerService {
    static async getDocumentUri(document: Document, provider: DMSProvider): Promise<string> {
        Logger.info('Getting document URI', {
            component: 'DocumentViewerService',
            method: 'getDocumentUri',
            data: { documentId: document.id, mimeType: document.mimeType }
        });

        const content = await provider.getDocumentContent(document.id);

        if (Platform.OS === 'web') {
            return content;
        }

        const localPath = `${FileSystem.CachesDirectoryPath}/${document.id}_${document.name}`;
        await FileSystem.writeFile(localPath, content, 'base64');
        return `file://${localPath}`;
    }
}