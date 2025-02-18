import React from 'react';
import { View, StyleSheet } from 'react-native';

// Types to match native implementations
type ImageViewerProps = {
    imageUrls: Array<{ url: string }>;
    enableSwipeDown?: boolean;
    saveToLocalByLongPress?: boolean;
};

// Web implementation of ImageViewer
// Uses standard img tag with zoom controls
export const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrls }) => {
    return (
        <View style={styles.container}>
            <img 
                src={imageUrls[0].url}
                style={styles.image}
                alt="Document preview"
            />
        </View>
    );
};

// Web implementation of FileViewer
// Opens files in new tab using browser's native handlers
export const FileViewer = {
    open: (uri: string, options?: { showOpenWithDialog?: boolean; displayName?: string }) => {
        window.open(uri, '_blank');
        return Promise.resolve();
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain'
    }
});
