// src/components/common/DepartmentItem.tsx

import React from 'react';
import { StyleSheet, View, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { Folder as FolderIcon } from 'lucide-react-native';
import { Department } from '../../api/types';
import theme from '../../theme/theme';

interface Props {
    department: Department;
    onPress: (department: Department) => void;
}

interface Styles {
    container: ViewStyle;
    contentContainer: ViewStyle;
    icon: ViewStyle;
    textContainer: ViewStyle;
    title: TextStyle;
    description: TextStyle;
}
const DepartmentItem: React.FC<Props> = ({ department, onPress }) => {
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => onPress(department)}
            activeOpacity={0.7}
        >
            <View style={styles.contentContainer}>
                <View style={styles.icon}>
                    <FolderIcon size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title} numberOfLines={1}>
                        {department.name}
                    </Text>
                    {department.description && (
                        <Text style={styles.description} numberOfLines={1}>
                            {department.description}
                        </Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};
const styles = StyleSheet.create<Styles>({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: 8,
        marginVertical: 4,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
    },
    contentContainer: {
        flexDirection: 'row',
        padding: theme.spacing.base,
        alignItems: 'center',
    },
    icon: {
        marginRight: theme.spacing.base,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: theme.typography.sizes.base,
        fontWeight: 'bold',
        color: theme.colors.textPrimary, // Using textPrimary instead of text
    },
    description: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
});

export default DepartmentItem;