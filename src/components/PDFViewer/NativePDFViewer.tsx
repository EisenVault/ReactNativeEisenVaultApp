import React from 'react';
import Pdf from 'react-native-pdf';
import { StyleSheet, View } from 'react-native';
import { PDFViewerProps } from '../../api/types';

const NativePDFViewer: React.FC<PDFViewerProps> = ({ uri }) => {
    return (
        <View style={styles.container}>
            <Pdf
                source={{ uri, cache: true }}
                style={styles.pdf}
                trustAllCerts={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    pdf: {
        flex: 1,
        width: '100%',
        height: '100%',
    }
});

export default NativePDFViewer;