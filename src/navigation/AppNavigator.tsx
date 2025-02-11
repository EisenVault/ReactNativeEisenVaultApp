// src/navigation/AppNavigator.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { RootStackParamList } from '../api';
import DocumentViewer from '../components/DocumentViewer';

import { View, StyleSheet, Platform } from 'react-native';
import { 
    Folder, 
    Search, 
    Settings,
    User
} from 'lucide-react-native'; // Make sure to install lucide-react-native


// Import screens
import BrowseScreen from '../components/screens/BrowseScreen';
import SearchScreen from '../components/screens/SearchScreen';
import SettingsScreen from '../components/screens/SettingsScreen';

// Define navigator types
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Primary colors used throughout the navigation
 */
const COLORS = {
    primary: '#2563eb', // Modern blue
    background: '#ffffff',
    text: '#1f2937',
    inactive: '#9ca3af',
    headerBackground: '#f8fafc'
};

/**
 * Stack navigator for the Browse section
 * Includes the browse screen with a customized welcome header
 */
const BrowseStack = () => {
    const userProfile = useSelector((state: RootState) => state.auth.userProfile);
    const welcomeMessage = userProfile?.firstName 
        ? `Welcome, ${userProfile.firstName}`
        : 'Welcome';

    return (
        <Stack.Navigator>
            <Stack.Screen 
                name="Browse" 
                component={BrowseScreen}
                options={{
                    title: welcomeMessage,
                    headerLargeTitle: true,
                    headerLargeTitleStyle: styles.headerLargeTitle,
                    headerStyle: styles.header,
                    headerTintColor: COLORS.text,
                    headerShadowVisible: false,
                }}
            />
                <Stack.Screen 
                    name="DocumentViewer" 
                    component={DocumentViewer}
                    options={({ route }) => ({
                        title: route.params.name
                    })}
    />
        </Stack.Navigator>
    );
};

/**
 * Main App Navigator component
 * Sets up the bottom tab navigation with custom styling and icons
 */
export const AppNavigator = () => (
    <NavigationContainer>
        <Tab.Navigator
            screenOptions={{
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.inactive,
                tabBarLabelStyle: styles.tabBarLabel,
                headerStyle: styles.header,
                headerTitleStyle: styles.headerTitle,
                headerShadowVisible: false,
                tabBarHideOnKeyboard: true,
            }}
        >
            <Tab.Screen 
                name="BrowseTab" 
                component={BrowseStack}
                options={{
                    headerShown: false,
                    tabBarLabel: 'Browse',
                    tabBarIcon: ({ color, size }) => (
                        <View style={styles.iconContainer}>
                            <Folder stroke={color} width={size} height={size} />
                        </View>
                    ),
                }}
            />
            <Tab.Screen 
                name="Search" 
                component={SearchScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <View style={styles.iconContainer}>
                            <Search stroke={color} width={size} height={size} />
                        </View>
                    ),
                }} 
            />
            <Tab.Screen 
                name="Settings" 
                component={SettingsScreen} 
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <View style={styles.iconContainer}>
                            <Settings stroke={color} width={size} height={size} />
                        </View>
                    ),
                }}
            />
        </Tab.Navigator>
    </NavigationContainer>
);

/**
 * Styles for the navigation components
 */
const styles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.headerBackground,
    },
    headerTitle: {
        color: COLORS.text,
        fontSize: 17,
        fontWeight: '600',
    },
    headerLargeTitle: {
        color: COLORS.text,
        fontSize: 34,
        fontWeight: 'bold',
    },
    tabBar: {
        backgroundColor: COLORS.background,
        borderTopColor: '#e5e7eb',
        borderTopWidth: 1,
        height: Platform.OS === 'ios' ? 88 : 60,
        paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        paddingTop: 8,
        elevation: 0,
    },
    tabBarLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});