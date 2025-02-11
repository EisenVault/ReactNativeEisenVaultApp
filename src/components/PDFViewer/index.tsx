import React from 'react';
import Pdf from 'react-native-pdf';
import { PDFViewerProps } from '../../api/types';

const NativePDFViewer: React.FC<PDFViewerProps> = ({ uri }) => {
    return (
        <Pdf
            source={{ uri, cache: true }}
            style={{ flex: 1 }}
            trustAllCerts={false}
        />
    );
};

export default NativePDFViewer;
