// This Redux slice handles the state for documents and folders
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Document, Folder } from '../../api/types';

interface DocumentsState {
  documents: Document[];     // List of documents in current folder
  folders: Folder[];        // List of folders in current folder
  currentPath: string;      // Current directory path
  isLoading: boolean;       // Loading state for async operations
  error: string | null;     // Error message if any
}

const initialState: DocumentsState = {
  documents: [],
  folders: [],
  currentPath: '/',
  isLoading: false,
  error: null,
};

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    // Redux actions to update the state
    setDocuments: (state, action: PayloadAction<Document[]>) => {
      state.documents = action.payload;
    },
    setFolders: (state, action: PayloadAction<Folder[]>) => {
      state.folders = action.payload;
    },
    setCurrentPath: (state, action: PayloadAction<string>) => {
      state.currentPath = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setDocuments,
  setFolders,
  setCurrentPath,
  setLoading,
  setError,
} = documentsSlice.actions;

export default documentsSlice.reducer;