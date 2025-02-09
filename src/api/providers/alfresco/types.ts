export interface AlfrescoNode {
    id: string;
    name: string;
    nodeType: string;
    isFolder: boolean;
    isFile: boolean;
    modifiedAt: string;
    createdAt: string;
    createdByUser: { id: string; displayName: string };
    modifiedByUser: { id: string; displayName: string };
    content?: { mimeType: string; sizeInBytes: number };
    path: { elements: Array<{ name: string }> };
    allowableOperations: string[];
    properties: Record<string, any>;  // Adding properties field
}

export interface AlfrescoNodesResponse {
    list: {
        entries: Array<{
            entry: AlfrescoNode;
        }>;
    };
}