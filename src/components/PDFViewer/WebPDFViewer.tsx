import React from 'react';
import { PDFViewerProps } from '@/src/api';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';

const WebPDFViewer: React.FC<PDFViewerProps> = ({ uri }) => {
    return (
        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
            <Viewer fileUrl={uri} />
        </Worker>
    );
};

export default WebPDFViewer;