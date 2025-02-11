import { Platform } from 'react-native';

export const FileSystem = Platform.select({
    native: require('react-native-fs'),
    default: {
        CachesDirectoryPath: '/tmp',
        writeFile: async (path: string, content: string, encoding: string) => {
            // Web implementation using browser APIs
            const response = await fetch(content);
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        }
    }
});
