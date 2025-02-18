import { Platform } from 'react-native';

async function getPDFViewer() {
    if (Platform.OS === 'web') {
        const { default: WebPDFViewer } = await import('./WebPDFViewer');
        return WebPDFViewer;
    } else {
        //const { default: NativePDFViewer } = await import('./NativePDFViewer');
        //return NativePDFViewer;
    }
}

export default getPDFViewer;
