import { Platform } from 'react-native';

export default Platform.select({
    web: require('./WebPDFViewer').default,
    default: require('./NativePDFViewer').default,
});
