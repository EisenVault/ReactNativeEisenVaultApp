import { PDFViewerProps } from '@/src/api';
const WebPDFViewer: React.FC<PDFViewerProps> = ({ uri }) => {
    return (
        <iframe 
            src={uri}
            style={{ width: '100%', height: '100%', border: 'none' }}
        />
    );
};
