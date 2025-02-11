// src/components/common/FileItem.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { FileText } from 'lucide-react-native';
import { Document } from '../../api/types';
import theme from '../../theme/theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../api/types';



type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface FileItemProps {
    file: Document;
    onPress: (file: Document) => void;  // Keep existing onPress for browse functionality
}

interface Styles {
    container: ViewStyle;
    iconContainer: ViewStyle;
    content: ViewStyle;
    name: TextStyle;
    details: TextStyle;
}

const FileItem: React.FC<FileItemProps> = ({ file, onPress }) => {
    const navigation = useNavigation<NavigationProp>();

    const formatFileSize = (size: number): string => {
        const units = ['B', 'KB', 'MB', 'GB'];
        let value = size;
        let unitIndex = 0;

        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex++;
        }

        return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
    };

    const formatDate = (date: string): string => {
        return new Date(date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getIconColor = (mimeType: string = 'application/octet-stream'): string => {
        if (mimeType.startsWith('image/')) {
            return theme.colors.imageFile;
        }
        if (mimeType.startsWith('application/pdf')) {
            return theme.colors.pdfFile;
        }
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
            return theme.colors.success;
        }
        return theme.colors.defaultFile;
    };

    const handlePress = () => {
        if (file.isFolder) {
            onPress(file);
        } else {
            navigation.navigate('DocumentViewer', {
                documentId: file.id,
                name: file.name,
                mimeType: file.mimeType
            });
        }
    };
    return (
        <TouchableOpacity 
            onPress={handlePress}
            style={styles.container}
        >
            <View style={styles.iconContainer}>
                <FileText
                    size={24} 
                    color={getIconColor(file.mimeType)} 
                />
            </View>
            <View style={styles.content}>
                <Text style={styles.name}>{file.name}</Text>
                <Text style={styles.details}>
                    {formatFileSize(file.size)} • {formatDate(file.lastModified)}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create<Styles>({
    container: {
        flexDirection: 'row',
        padding: theme.spacing.base,
        backgroundColor: theme.colors.cardBackground,
        borderRadius: 8,
        marginBottom: theme.spacing.sm,
        alignItems: 'center'
    },
    iconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.base
    },
    content: {
        flex: 1,
        justifyContent: 'center'
    },
    name: {
        fontSize: theme.typography.sizes.base,
        color: theme.colors.textPrimary,
        marginBottom: 4
    },
    details: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary
    }
});

export default FileItem;