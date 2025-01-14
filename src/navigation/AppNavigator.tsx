// This sets up the navigation structure of the app
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BrowseScreen from '../components/screens/BrowseScreen';
import SearchScreen from '../components/screens/SearchScreen';
import SettingsScreen from '../components/screens/SettingsScreen';

// Create navigation objects
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack navigator for the Browse tab to handle nested navigation
const BrowseStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Browse" 
      component={BrowseScreen}
      options={{
        title: 'Documents',
        headerLargeTitle: true,  // iOS-style large header
      }}
    />
  </Stack.Navigator>
);

// Main navigation container with bottom tabs
export const AppNavigator = () => (
  <NavigationContainer>
    <Tab.Navigator>
      <Tab.Screen 
        name="BrowseTab" 
        component={BrowseStack}
        options={{
          title: 'Browse',
          headerShown: false, // Hide header as BrowseStack has its own
        }}
      />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  </NavigationContainer>
);