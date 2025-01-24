// src/components/screens/SettingsScreen.tsx

import React from 'react';
import { View, ScrollView, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { List, Divider, Button, Text } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { 
  LogOut, 
  User, 
  Server, 
  Shield, 
  Info,
  ChevronRight
} from 'lucide-react-native';
import { RootState } from '../../store/store';
import { clearAuth } from '../../store/slices/authSlice';
import theme from '../../theme/theme';

interface Styles {
  container: ViewStyle;
  profileSection: ViewStyle;
  avatarContainer: ViewStyle;
  avatarText: TextStyle;
  profileName: TextStyle;
  profileEmail: TextStyle;
  logoutContainer: ViewStyle;
  logoutButton: ViewStyle;
  logoutButtonContent: ViewStyle;
}

const SettingsScreen = () => {
  const dispatch = useDispatch();
  const { userProfile, serverUrl } = useSelector((state: RootState) => state.auth);

  const handleLogout = async () => {
    try {
      dispatch(clearAuth());
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleServerConfig = () => {
    console.log('Open server configuration');
  };

  const handleSecuritySettings = () => {
    console.log('Open security settings');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {userProfile?.firstName?.[0]}{userProfile?.lastName?.[0]}
          </Text>
        </View>
        <Text style={styles.profileName}>
          {userProfile?.displayName}
        </Text>
        <Text style={styles.profileEmail}>
          {userProfile?.email}
        </Text>
      </View>

      <Divider />

      <List.Section>
        <List.Subheader>Account Settings</List.Subheader>
        
        <List.Item
          title="Profile"
          description="Manage your account information"
          left={props => <User {...props} size={24} />}
          right={props => <ChevronRight {...props} size={24} />}
          onPress={() => {}}
        />

        <List.Item
          title="Server Configuration"
          description={serverUrl || 'Configure server settings'}
          left={props => <Server {...props} size={24} />}
          right={props => <ChevronRight {...props} size={24} />}
          onPress={handleServerConfig}
        />

        <List.Item
          title="Security"
          description="Privacy and security settings"
          left={props => <Shield {...props} size={24} />}
          right={props => <ChevronRight {...props} size={24} />}
          onPress={handleSecuritySettings}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>About</List.Subheader>
        
        <List.Item
          title="App Information"
          description="Version 1.0.0"
          left={props => <Info {...props} size={24} />}
          right={props => <ChevronRight {...props} size={24} />}
          onPress={() => {}}
        />
      </List.Section>

      <View style={styles.logoutContainer}>
        <Button 
          mode="contained" 
          onPress={handleLogout}
          icon={() => <LogOut size={20} color={theme.colors.textInverted} />}
          style={styles.logoutButton}
          contentStyle={styles.logoutButtonContent}
        >
          Logout
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  profileSection: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceBackground,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.base,
  },
  avatarText: {
    color: theme.colors.textInverted,
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: '600',
  },
  profileName: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  profileEmail: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
  logoutContainer: {
    padding: theme.spacing.xl,
  },
  logoutButton: {
    backgroundColor: theme.colors.error,
  },
  logoutButtonContent: {
    height: 48,
  },
});

export default SettingsScreen;