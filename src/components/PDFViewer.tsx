import React from 'react';
import Pdf from 'react-native-pdf';
import { Dimensions, StyleSheet } from 'react-native';

interface PDFViewerProps {
    uri: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ uri }) => {
    const source = { uri, cache: true };
    
    return (
        <Pdf
            source={source}
            style={styles.pdf}
            trustAllCerts={false}
            onLoadComplete={(numberOfPages) => {
                console.log(`PDF loaded with ${numberOfPages} pages`);
            }}
        />
    );
};

const styles = StyleSheet.create({
    pdf: {
        flex: 1,
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    }
});

export default PDFViewer;
