export interface AlfrescoNodesResponse {
    list: {
        entries: Array<{
            entry: {
                id: string;
                name: string;
                nodeType: string;
                isFolder: boolean;
                isFile: boolean;
                modifiedAt: string;
                createdAt: string;
                createdByUser: {
                    id: string;
                    displayName: string;
                };
                modifiedByUser: {
                    id: string;
                    displayName: string;
                };
                content?: {
                    mimeType: string;
                    sizeInBytes: number;
                };
                path: {
                    elements: Array<{
                        id: string;
                        name: string;
                    }>;
                };
                allowableOperations: string[];
            };
        }>;
    };
}
