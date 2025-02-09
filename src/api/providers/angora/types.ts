export interface AngoraNodesResponse {
    data: {
        id: string;
        name: string;
        path: string;
        type: 'folder' | 'document';
        mimeType?: string;
        size?: number;
        createdAt: string;
        modifiedAt: string;
        createdBy: {
            id: string;
            displayName: string;
        };
        modifiedBy: {
            id: string;
            displayName: string;
        };
        permissions: string[];
    }[];
}
