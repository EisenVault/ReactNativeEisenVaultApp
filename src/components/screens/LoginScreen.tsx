// src/components/screens/LoginScreen.tsx

import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, 
    View, 
    KeyboardAvoidingView, 
    Platform, 
    Alert,
    Linking,
    Image,
    Animated,
    Dimensions
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

// Get screen dimensions for responsive design
const windowWidth = Dimensions.get('window').width;

interface LoginScreenProps {
    onLoginSuccess: () => void;
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
    const [serverUrl, setServerUrl] = useState('');
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
        console.log('Showing error:', { title, message });
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
            console.log('Testing connection to:', url);
            
            // For native platforms, we'll skip the pre-flight check
            if (Platform.OS !== 'web') {
                console.log('Skipping connection test on native platform');
                return true;
            }

            const response = await fetch(`${url}/api/-default-/public/alfresco/versions/1`);
            console.log('Connection test response status:', response.status);
            
            // 401 is a valid response for Alfresco
            if (response.status === 401) {
                return true;
            }
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/json')) {
                throw new Error('Invalid server response type');
            }

            return true;
        } catch (error) {
            console.error('Connection test error:', error);
            
            // For native platforms, be more permissive
            if (Platform.OS !== 'web') {
                console.log('Proceeding despite connection test error on native platform');
                return true;
            }
            
            if (error instanceof Error) {
                if (error.message.includes('Failed to fetch')) {
                    showError('Connection Failed', 
                        'Unable to connect to the server. Please check:\n\n' +
                        '• The server URL is correct\n' +
                        '• Your internet connection is working\n' +
                        '• The server is accessible'
                    );
                } else {
                    showError('Server Error', 
                        'Unable to verify Alfresco server. Please check if the URL is correct.'
                    );
                }
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
            if (!serverUrl.trim()) {
                showError('Missing Information', 'Please enter a server URL');
                return;
            }
            if (!username.trim()) {
                showError('Missing Information', 'Please enter a username');
                return;
            }
            if (!password.trim()) {
                showError('Missing Information', 'Please enter a password');
                return;
            }

            setIsLoading(true);

            const formattedUrl = formatServerUrl(serverUrl);
            console.log('Formatted URL:', formattedUrl);
            
            if (!validateUrl(formattedUrl)) {
                return;
            }

            console.log('Testing connection...');
            const isConnected = await testConnection(formattedUrl);
            if (!isConnected) {
                return;
            }

            console.log('Attempting login...');
            const config: ApiConfig = {
                baseUrl: formattedUrl,
                timeout: 30000,
            };

            const provider = DMSFactory.createProvider('alfresco', config);
            await provider.login(username, password);
            
            onLoginSuccess();
        } catch (error) {
            console.error('Login error details:', error);
            
            let title = 'Login Failed';
            let message = 'An unexpected error occurred. Please try again.';
            
            if (error instanceof Error) {
                console.error('Error name:', error.name);
                console.error('Error message:', error.message);
                
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
                            onError={(error) => {
                                console.error('Logo loading error:', error);
                                setLogoLoaded(true);
                            }}
                        />
                    </Animated.View>

                    <Text style={styles.title}>EisenVault Login</Text>
                    <Text style={styles.subtitle}>Connect to your EisenVault Instance</Text>

                    <TextInput
                        mode="outlined"
                        label="Server URL"
                        value={serverUrl}
                        onChangeText={setServerUrl}
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
                            <ActivityIndicator color="white" />
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
        backgroundColor: '#f5f5f5',
    },
    keyboardAvoid: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    loginContainer: {
        padding: 20,
        borderRadius: 10,
        elevation: 4,
        backgroundColor: 'white',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {
                    width: 0,
                    height: 2,
                },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 24,
        width: '100%',
        paddingHorizontal: 20,
    },
    logo: {
        width: '100%',
        maxWidth: Math.min(200, windowWidth * 0.6),
        height: 60,
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 24,
        textAlign: 'center',
    },
    input: {
        marginBottom: 16,
    },
    button: {
        marginTop: 8,
        paddingVertical: 8,
    },
    buttonContent: {
        height: 40,
    },
    errorTitle: {
        color: '#d32f2f',
        fontWeight: 'bold',
    },
    errorMessage: {
        color: '#333',
        fontSize: 16,
        lineHeight: 24,
    },
});