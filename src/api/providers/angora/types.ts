export interface AngoraNode {
    id: string;
    raw_file_name: string;
    materialize_path: string;
    is_folder: boolean;
    extension?: string;
    size: number;
    updated_at: string;
    created_at: string;
    created_by: string;
    edited_by: string;
    is_file: boolean;
    is_department: boolean;
}

export interface AngoraNodesResponse {
    data: AngoraNode[];
}
