// These interfaces define the shape of our document and folder objects
export interface Document {
    id: string;
    name: string;
    path: string;
    mimeType: string;         // Type of file (pdf, doc, etc.)
    size: number;             // File size in bytes
    lastModified: string;     // Last modified date
    isOfflineAvailable: boolean;  // Whether the file is saved for offline access
  }
  
  export interface Folder {
    id: string;
    name: string;
    path: string;            // Full path to the folder
    parentId: string | null; // ID of parent folder, null for root
  }