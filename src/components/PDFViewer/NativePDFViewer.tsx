import React, { useState } from 'react';
import Pdf from 'react-native-pdf';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native'; // Correct import
import { PDFViewerProps } from '../../api/types';

const NativePDFViewer: React.FC<PDFViewerProps> = (props) => {
    const [loading, setLoading] = useState(true);
    const uri = props?.uri;

    if (!uri) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Pdf
                source={{ uri, cache: true }}
                style={styles.pdf}
                trustAllCerts={false}
                onLoadComplete={() => setLoading(false)}
                onError={() => setLoading(false)}
            />
            {loading && (
                <View style={styles.container}>
                    <ActivityIndicator size="large" />
                </View>
            )}
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pdf: {
        flex: 1,
        width: '100%',
        height: '100%',
    }
});

export default NativePDFViewer;