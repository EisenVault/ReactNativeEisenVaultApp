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

const windowWidth = Dimensions.get('window').width;

interface LoginScreenProps {
    onLoginSuccess: () => void;
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
interface ErrorDialogProps {
    visible: boolean;
    title: string;
    message: string;
    onDismiss: () => void;
}


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

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const dispatch = useDispatch();
    
    const [localServerUrl, setLocalServerUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errorDialogVisible, setErrorDialogVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState({ title: '', message: '' });
    const [fadeAnim] = useState(new Animated.Value(0));
    const [logoLoaded, setLogoLoaded] = useState(false);

    useEffect(() => {
        if (logoLoaded) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }).start();
        }
    }, [logoLoaded]);

    const showError = (title: string, message: string) => {
        setErrorMessage({ title, message });
        setErrorDialogVisible(true);
    };

    const validateUrl = (url: string): boolean => {
        try {
            const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
            if (!urlPattern.test(url)) {
                showError('Invalid URL', 'Please enter a valid URL starting with http:// or https://');
                return false;
            }

            new URL(url);
            return true;
        } catch (error) {
            showError('Invalid URL', 'Please enter a valid server URL');
            return false;
        }
    };

    const testConnection = async (url: string): Promise<boolean> => {
        try {
            if (Platform.OS !== 'web') {
                return true;
            }

            const response = await fetch(`${url}/api/-default-/public/alfresco/versions/1`);
            
            if (response.status === 401) {
                return true;
            }
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            return true;
        } catch (error) {
            if (Platform.OS !== 'web') {
                return true;
            }
            
            if (error instanceof Error) {
                const errorMessage = error.message.includes('Failed to fetch')
                    ? 'Unable to connect to the server. Please check:\n\n' +
                      '• The server URL is correct\n' +
                      '• Your internet connection is working\n' +
                      '• The server is accessible'
                    : 'Unable to verify Alfresco server. Please check if the URL is correct.';
                
                showError('Connection Failed', errorMessage);
            }
            return false;
        }
    };

    const formatServerUrl = (url: string): string => {
        let formattedUrl = url.trim();
        
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = 'https://' + formattedUrl;
        }
        
        formattedUrl = formattedUrl.replace(/\/$/, '');
        
        if (!formattedUrl.endsWith('alfresco')) {
            formattedUrl = `${formattedUrl}/alfresco`;
        }
        
        return formattedUrl;
    };

    const handleLogin = async () => {
        try {
            if (!localServerUrl.trim() || !username.trim() || !password.trim()) {
                showError('Missing Information', 'Please fill in all fields');
                return;
            }
    
            setIsLoading(true);
    
            const formattedUrl = formatServerUrl(localServerUrl);
            if (!validateUrl(formattedUrl)) {
                return;
            }
    
            const isConnected = await testConnection(formattedUrl);
            if (!isConnected) {
                return;
            }
    
            localStorage.setItem('serverUrl', formattedUrl);
            dispatch(setServerUrl(formattedUrl));
    
            const config: ApiConfig = {
                baseUrl: formattedUrl,
                timeout: 30000,
            };
    
            const provider = DMSFactory.createProvider('alfresco', config);
            const authResponse = await provider.login(username, password);
    
            dispatch(setAuthToken(authResponse.token));
            dispatch(setUserProfile(authResponse.user));
            dispatch(setServerUrl(formattedUrl));
    
            onLoginSuccess();
        } catch (error) {
            let title = 'Login Failed';
            let message = 'An unexpected error occurred. Please try again.';
            
            if (error instanceof Error) {
                if (error.message.includes('401') || 
                    error.message.includes('Authentication failed') || 
                    error.message.includes('Unauthorized')) {
                    title = 'Authentication Failed';
                    message = 'Invalid username or password. Please try again.';
                } else if (error.message.includes('Network request failed')) {
                    title = 'Network Error';
                    message = 'Unable to connect to the server. Please check your internet connection.';
                } else if (error.message.includes('timeout')) {
                    title = 'Connection Timeout';
                    message = 'The server is taking too long to respond. Please try again.';
                } else if (error.message.includes('JSON')) {
                    title = 'Server Error';
                    message = 'Received invalid response from server. Please verify the server URL.';
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surfaceBackground,
    } as ViewStyle,
    keyboardAvoid: {
        flex: 1,
        justifyContent: 'center',
        padding: theme.spacing.xl,
    } as ViewStyle,
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
    } as ViewStyle,
    logoContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        width: '100%',
        paddingHorizontal: theme.spacing.xl,
    } as ViewStyle,
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