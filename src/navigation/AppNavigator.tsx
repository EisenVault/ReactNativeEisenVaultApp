// src/navigation/AppNavigator.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

import BrowseScreen from '../components/screens/BrowseScreen';
import SearchScreen from '../components/screens/SearchScreen';
import SettingsScreen from '../components/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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
                }}
            />
        </Stack.Navigator>
    );
};

export const AppNavigator = () => (
    <NavigationContainer>
        <Tab.Navigator>
            <Tab.Screen 
                name="BrowseTab" 
                component={BrowseStack}
                options={{
                    headerShown: false,
                }}
            />
            <Tab.Screen name="Search" component={SearchScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    </NavigationContainer>
);