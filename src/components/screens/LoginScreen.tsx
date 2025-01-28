// src/components/screens/LoginScreen.tsx

import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, 
    View, 
    KeyboardAvoidingView, 
    Platform, 
    Animated,
    Dimensions,
    Image,
    TextStyle,
    ViewStyle,
    ImageStyle
} from 'react-native';
import { 
    TextInput, 
    Button, 
    Surface, 
    Text, 
    ActivityIndicator,
    Portal,
    Dialog,
    Paragraph
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DMSFactory, ApiConfig } from '../../api';
import { useDispatch } from 'react-redux';
import { setUserProfile, setServerUrl, setAuthToken } from '../../store/slices/authSlice';
import { AuthResponse } from '../../api';
import theme from '../../theme/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Window dimensions for responsive design
const windowWidth = Dimensions.get('window').width;

// Logger utility for consistent logging format
const Logger = {
    debug: (message: string, data?: any) => {
        console.debug(`[LoginScreen] ${message}`, data || '');
    },
    error: (message: string, error?: any) => {
        console.error(`[LoginScreen] ${message}`, error || '');
    },
    info: (message: string, data?: any) => {
        console.info(`[LoginScreen] ${message}`, data || '');
    }
};

interface LoginScreenProps {
    onLoginSuccess: () => void;
}

interface ErrorDialogProps {
    visible: boolean;
    title: string;
    message: string;
    onDismiss: () => void;
}

interface Styles {
    container: ViewStyle;
    keyboardAvoid: ViewStyle;
    loginContainer: ViewStyle;
    logoContainer: ViewStyle;
    logo: ImageStyle;
    title: TextStyle;
    subtitle: TextStyle;
    input: ViewStyle;
    button: ViewStyle;
    buttonContent: ViewStyle;
    errorTitle: TextStyle;
    errorMessage: TextStyle;
}

/**
 * Error Dialog Component
 * Displays error messages in a modal dialog
 */
const ErrorDialog: React.FC<ErrorDialogProps> = ({ visible, title, message, onDismiss }) => (
    <Portal>
        <Dialog visible={visible} onDismiss={onDismiss}>
            <Dialog.Title style={styles.errorTitle}>{title}</Dialog.Title>
            <Dialog.Content>
                <Paragraph style={styles.errorMessage}>{message}</Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
                <Button onPress={onDismiss}>OK</Button>
            </Dialog.Actions>
        </Dialog>
    </Portal>
);

/**
 * Login Screen Component
 * Handles user authentication and initial setup
 */
export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const dispatch = useDispatch();
    
    // State management
    const [localServerUrl, setLocalServerUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errorDialogVisible, setErrorDialogVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState({ title: '', message: '' });
    const [fadeAnim] = useState(new Animated.Value(0));
    const [logoLoaded, setLogoLoaded] = useState(false);

    // Handle logo fade-in animation on load
    useEffect(() => {
        if (logoLoaded) {
            Logger.debug('Logo loaded, starting fade animation');
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }).start();
        }
    }, [logoLoaded]);

    /**
     * Shows error dialog with given title and message
     * Also logs the error for debugging
     */
    const showError = (title: string, message: string) => {
        Logger.error('Error occurred', { title, message });
        setErrorMessage({ title, message });
        setErrorDialogVisible(true);
    };

    /**
     * Validates the server URL format
     */
    const validateUrl = (url: string): boolean => {
        try {
            const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
            if (!urlPattern.test(url)) {
                showError('Invalid URL', 'Please enter a valid URL starting with http:// or https://');
                return false;
            }

            new URL(url);
            Logger.debug('URL validation successful', { url });
            return true;
        } catch (error) {
            Logger.error('URL validation failed', error);
            showError('Invalid URL', 'Please enter a valid server URL');
            return false;
        }
    };

    /**
     * Formats the server URL to ensure proper structure
     */
    const formatServerUrl = (url: string): string => {
        let formattedUrl = url.trim();
        
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = 'https://' + formattedUrl;
        }
        
        formattedUrl = formattedUrl.replace(/\/$/, '');
        
        if (!formattedUrl.endsWith('alfresco')) {
            formattedUrl = `${formattedUrl}/alfresco`;
        }
        
        Logger.debug('URL formatted', { original: url, formatted: formattedUrl });
        return formattedUrl;
    };

    /**
     * Handles the login process
     */
    const handleLogin = async () => {
        try {
            if (!localServerUrl.trim() || !username.trim() || !password.trim()) {
                showError('Missing Information', 'Please fill in all fields');
                return;
            }

            setIsLoading(true);

            Logger.info('Starting login process', {
                platform: Platform.OS,
                serverUrl: localServerUrl,
                username
            });

            const formattedUrl = formatServerUrl(localServerUrl);
            if (!validateUrl(formattedUrl)) {
                setIsLoading(false);
                return;
            }

            // Store server URL
            try {
                await AsyncStorage.setItem('serverUrl', formattedUrl);
                Logger.debug('Server URL stored successfully');
            } catch (storageError) {
                Logger.error('Failed to store server URL', storageError);
                // Continue anyway as this is not critical
            }
            
            dispatch(setServerUrl(formattedUrl));

            const config: ApiConfig = {
                baseUrl: formattedUrl,
                timeout: Platform.OS === 'ios' ? 60000 : 30000, // Longer timeout for iOS
            };

            Logger.debug('Creating DMS provider');
            const provider = DMSFactory.createProvider('alfresco', config);

            Logger.debug('Attempting authentication');
            try {
                const authResponse = await provider.login(username, password);
                Logger.info('Login successful');
        
                dispatch(setAuthToken(authResponse.token));
                dispatch(setUserProfile(authResponse.user));
                dispatch(setServerUrl(formattedUrl));
        
                onLoginSuccess();
            } catch (authError) {
                Logger.error('Authentication failed', authError);
                throw authError;
            }
        } catch (error) {
            let title = 'Login Failed';
            let message = 'An unexpected error occurred. Please try again.';
            
            if (error instanceof Error) {
                Logger.error('Login error details', {
                    type: error.constructor.name,
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
                
                if (error.message.includes('timeout')) {
                    title = 'Connection Timeout';
                    message = 'The server is taking too long to respond. Please try again. If this persists, check your internet connection.';
                } else if (error.message.includes('401') || 
                          error.message.includes('Authentication failed') || 
                          error.message.includes('Unauthorized')) {
                    title = 'Authentication Failed';
                    message = 'Invalid username or password. Please try again.';
                } else if (error.message.includes('Network request failed')) {
                    title = 'Network Error';
                    message = 'Unable to connect to the server. Please check your internet connection.';
                }
            }
            
            showError(title, message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoid}
            >
                <Surface style={styles.loginContainer}>
                    <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
                        <Image
                            source={require('../../assets/images/eisenvault-logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                            onLoad={() => setLogoLoaded(true)}
                            onError={() => setLogoLoaded(true)}
                        />
                    </Animated.View>

                    <Text style={styles.title}>EisenVault Login</Text>
                    <Text style={styles.subtitle}>Connect to your EisenVault Instance</Text>

                    <TextInput
                        mode="outlined"
                        label="Server URL"
                        value={localServerUrl}
                        onChangeText={setLocalServerUrl}
                        autoCapitalize="none"
                        keyboardType="url"
                        autoCorrect={false}
                        style={styles.input}
                        placeholder="https://your-server.eisenvault.com"
                        disabled={isLoading}
                    />

                    <TextInput
                        mode="outlined"
                        label="Username"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={styles.input}
                        disabled={isLoading}
                    />

                    <TextInput
                        mode="outlined"
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        right={
                            <TextInput.Icon 
                                icon={showPassword ? 'eye-off' : 'eye'} 
                                onPress={() => setShowPassword(!showPassword)}
                            />
                        }
                        style={styles.input}
                        disabled={isLoading}
                    />

                    <Button
                        mode="contained"
                        onPress={handleLogin}
                        disabled={isLoading}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={theme.colors.textInverted} />
                        ) : (
                            'Login'
                        )}
                    </Button>
                </Surface>
            </KeyboardAvoidingView>

            <ErrorDialog
                visible={errorDialogVisible}
                title={errorMessage.title}
                message={errorMessage.message}
                onDismiss={() => setErrorDialogVisible(false)}
            />
        </SafeAreaView>
    );
};

// Styles defined using StyleSheet for better performance
const styles = StyleSheet.create<Styles>({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surfaceBackground,
    },
    keyboardAvoid: {
        flex: 1,
        justifyContent: 'center',
        padding: theme.spacing.xl,
    },
    loginContainer: {
        padding: theme.spacing.xl,
        borderRadius: theme.spacing.base,
        backgroundColor: theme.colors.background,
        ...(Platform.OS === 'ios' ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
        } : {
            elevation: 5,
        }),
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        width: '100%',
        paddingHorizontal: theme.spacing.xl,
    },
    logo: {
        width: windowWidth * 0.6,
        maxWidth: 200,
        height: 60,
        marginBottom: theme.spacing.lg,
    } as ImageStyle,
    title: {
        fontSize: theme.typography.sizes['2xl'],
        fontWeight: '700',
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
        color: theme.colors.textPrimary,
    } as TextStyle,
    subtitle: {
        fontSize: theme.typography.sizes.base,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
        textAlign: 'center',
    } as TextStyle,
    input: {
        marginBottom: theme.spacing.base,
        backgroundColor: theme.colors.background,
    } as ViewStyle,
    button: {
        marginTop: theme.spacing.sm,
        backgroundColor: theme.colors.primary,
    } as ViewStyle,
    buttonContent: {
        height: 48,
    } as ViewStyle,
    errorTitle: {
        color: theme.colors.error,
        fontWeight: '600',
    } as TextStyle,
    errorMessage: {
        color: theme.colors.textPrimary,
        fontSize: theme.typography.sizes.base,
        lineHeight: 24,
    } as TextStyle,
});

export default LoginScreen;