import React from 'react';
import { PDFViewerProps } from '@/src/api';
import {  Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { Logger } from '@/src/utils/Logger';

const DEFAULT_PDF_URI = 'https://mag.wcoomd.org/uploads/2018/05/blank.pdf'; // Empty PDF or loading PDF

const WebPDFViewer: React.FC<PDFViewerProps> = (props ) => {
    Logger.info('Loading WebPDFViewer', {
            component: 'WebPDFViewer.tsx',
                            method: 'Constructor',
                            data: { props }
                        }
        );

    const uri = props?.uri || DEFAULT_PDF_URI;
    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Viewer fileUrl={uri} />
        </div>
    );
};


export default WebPDFViewer;