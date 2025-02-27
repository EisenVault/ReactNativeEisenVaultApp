import React from 'react';
import { Platform } from 'react-native';
import type { PDFViewerProps } from '../../api/types';
import { Logger } from '../../utils/Logger';

const getPDFViewer = async (): Promise<React.ComponentType<PDFViewerProps>> => {
    
    Logger.info('Trying to load PDFViewer component', {
        component: 'PDFViewer index.ts',
                        method: 'getPDFViewer',
                        data: { Platform: Platform.OS }
                    }
    );
    //if (Platform.OS === 'web') {
        const { default: WebPDFViewer } = await import('./WebPDFViewer');
        return WebPDFViewer;
    //}
    //const { default: PDFViewerComponent } = await import('./NativePDFViewer');
    //return PDFViewerComponent;
};

export default getPDFViewer;