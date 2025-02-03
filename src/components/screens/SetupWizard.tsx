// src/components/screens/SetupWizard.tsx

import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    StyleSheet, 
    Image, 
    Platform, 
    Dimensions, 
    Animated,
    ViewStyle,
    TextStyle,
    ImageStyle 
} from 'react-native';
import { 
    Text, 
    Button, 
    Card, 
    TextInput, 
    ActivityIndicator,
    RadioButton,
    useTheme 
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { 
    setUserProfile, 
    setServerUrl as setServerUrlAction, 
    setAuthToken as setAuthTokenAction 
} from '../../store/slices/authSlice';
import { DMSFactory, ApiConfig } from '../../api';
import { ChevronRight, ChevronLeft, Server, Key } from 'lucide-react-native';
import theme from '../../theme/theme';

// Window dimensions for responsive design
const windowWidth = Dimensions.get('window').width;

/**
 * Storage keys for persistent data
 */
const StorageKeys = {
    INSTANCE_TYPE: '@EVSetup:instanceType',
    SERVER_URL: '@EVSetup:serverUrl',
    USERNAME: '@EVSetup:username',
    AUTH_TOKEN: '@EVSetup:authToken'
} as const;

/**
 * Setup wizard steps
 */
const SetupStep = {
    INSTANCE_TYPE: 0,
    SERVER_URL: 1,
    CREDENTIALS: 2
} as const;

type SetupStepType = typeof SetupStep[keyof typeof SetupStep];

/**
 * Instance types supported by the application
 */
const INSTANCE_TYPES = {
    CLASSIC: 'classic',
    ANGORA: 'angora'
} as const;

type InstanceType = typeof INSTANCE_TYPES[keyof typeof INSTANCE_TYPES];

/**
 * Props interface for the SetupWizard component
 */
interface SetupWizardProps {
    onLoginSuccess: () => void;
}

/**
 * Style type definitions for the component
 */
interface SetupWizardStyles {
    container: ViewStyle;
    card: ViewStyle;
    content: ViewStyle;
    logoContainer: ViewStyle;
    logo: ImageStyle;
    stepIndicator: ViewStyle;
    stepDot: ViewStyle;
    stepDotActive: ViewStyle;
    stepContent: ViewStyle;
    stepTitle: TextStyle;
    stepDescription: TextStyle;
    radioContainer: ViewStyle;
    radioOption: ViewStyle;
    radioLabel: TextStyle;
    radioDescription: TextStyle;
    inputContainer: ViewStyle;
    input: ViewStyle;
    errorText: TextStyle;
    buttonContainer: ViewStyle;
    button: ViewStyle;
    primaryButton: ViewStyle;
}

interface StepContentProps {
    instanceType: InstanceType | undefined;
    setInstanceType: (type: InstanceType) => void;
    instanceUrl: string;
    setInstanceUrl: (url: string) => void;
    username: string;
    setUsername: (username: string) => void;
    password: string;
    setPassword: (password: string) => void;
    showPassword: boolean;
    setShowPassword: (show: boolean) => void;
    error: string;
}/**
 * SetupWizard Component
 * Handles the initial setup process for the EisenVault application
 */
const SetupWizard: React.FC<SetupWizardProps> = ({ onLoginSuccess }) => {
    const dispatch = useDispatch();
    const paperTheme = useTheme();
    
    // State management
    const [currentStep, setCurrentStep] = useState<SetupStepType>(SetupStep.INSTANCE_TYPE);
    const [instanceType, setInstanceType] = useState<InstanceType>();
    const [instanceUrl, setInstanceUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        checkExistingSetup();
    }, []);

    /**
     * Formats and validates server URL
     */
    const formatAndValidateUrl = (url: string, type: InstanceType): string | null => {
        try {
            let formattedUrl = url.trim();
            if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
                formattedUrl = 'https://' + formattedUrl;
            }
            formattedUrl = formattedUrl.replace(/\/$/, '');
            new URL(formattedUrl);
            if (type === INSTANCE_TYPES.CLASSIC && !formattedUrl.endsWith('/alfresco')) {
                formattedUrl = `${formattedUrl}/alfresco`;
            }
            return formattedUrl;
        } catch (error) {
            return null;
        }
    };

    /**
     * Checks for existing setup and attempts auto-login
     */
    const checkExistingSetup = async (): Promise<void> => {
        try {
            const [storedToken, storedUrl, storedType] = await Promise.all([
                AsyncStorage.getItem(StorageKeys.AUTH_TOKEN),
                AsyncStorage.getItem(StorageKeys.SERVER_URL),
                AsyncStorage.getItem(StorageKeys.INSTANCE_TYPE)
            ]);
            
            if (storedToken && storedUrl && storedType && 
                (storedType === INSTANCE_TYPES.CLASSIC || storedType === INSTANCE_TYPES.ANGORA)) {
                
                const formattedUrl = formatAndValidateUrl(storedUrl, storedType);
                if (!formattedUrl) {
                    await AsyncStorage.multiRemove(Object.values(StorageKeys));
                    return;
                }

                const config: ApiConfig = { 
                    baseUrl: formattedUrl, 
                    timeout: 30000 
                };

                const provider = DMSFactory.createProvider(
                    storedType === INSTANCE_TYPES.CLASSIC ? 'alfresco' : 'angora',
                    config
                );
                
                provider.setToken(storedToken);
                
                try {
                    await provider.getDocuments('root');
                    dispatch(setAuthTokenAction(storedToken));
                    dispatch(setServerUrlAction(formattedUrl));
                    onLoginSuccess();
                } catch {
                    await AsyncStorage.multiRemove(Object.values(StorageKeys));
                }
            }
        } catch (error) {
            console.error('Setup check failed:', error);
        }
    };

    /**
     * Handles progression to next step or login
     */
    const handleNext = async (): Promise<void> => {
        setError('');
        switch (currentStep) {
            case SetupStep.INSTANCE_TYPE:
                if (!instanceType) {
                    setError('Please select your EisenVault version');
                    return;
                }
                setCurrentStep(SetupStep.SERVER_URL);
                break;

            case SetupStep.SERVER_URL:
                if (!instanceUrl || !instanceType) {
                    setError('Please enter your server URL');
                    return;
                }
                
                const formattedUrl = formatAndValidateUrl(instanceUrl, instanceType);
                if (!formattedUrl) {
                    setError('Please enter a valid URL');
                    return;
                }
                
                setInstanceUrl(formattedUrl);
                setCurrentStep(SetupStep.CREDENTIALS);
                break;

            case SetupStep.CREDENTIALS:
                await handleLogin();
                break;
        }
    };
    /**
    * Handles user login attempt
    */
   const handleLogin = async (): Promise<void> => {
       if (!username || !instanceUrl || !password || !instanceType) {
           setError('Please enter all required fields');
           return;
       }

       setLoading(true);
       setError('');

       try {
           const config: ApiConfig = {
               baseUrl: instanceUrl,
               timeout: 30000,
           };

           const provider = DMSFactory.createProvider(
               instanceType === INSTANCE_TYPES.CLASSIC ? 'alfresco' : 'angora',
               config
           );

           const response = await provider.login(username, password);

           // Store credentials
           await Promise.all([
               AsyncStorage.setItem(StorageKeys.INSTANCE_TYPE, instanceType),
               AsyncStorage.setItem(StorageKeys.SERVER_URL, instanceUrl),
               AsyncStorage.setItem(StorageKeys.USERNAME, username),
               AsyncStorage.setItem(StorageKeys.AUTH_TOKEN, response.token)
           ]);

           // Update Redux state
           dispatch(setAuthTokenAction(response.token));
           dispatch(setServerUrlAction(instanceUrl));
           dispatch(setUserProfile(response.user));

           onLoginSuccess();
       } catch (error) {
           let errorMessage = 'Login failed. Please check your credentials.';
           
           if (error instanceof Error) {
               if (error.message.includes('Network Error')) {
                   errorMessage = 'Unable to connect to server. Please check the URL and try again.';
               } else if (error.message.includes('401')) {
                   errorMessage = 'Invalid username or password.';
               } else if (error.message.includes('timeout')) {
                   errorMessage = 'Server is not responding. Please try again.';
               } else {
                   errorMessage = error.message;
               }
           }
           
           setError(errorMessage);
       } finally {
           setLoading(false);
       }
   };

   const renderStepContent = (currentStep: SetupStepType, props: StepContentProps) => {
       switch (currentStep) {
           case SetupStep.INSTANCE_TYPE:
               return (
                   <View style={styles.stepContent}>
                       <Text style={styles.stepTitle}>Welcome to EisenVault</Text>
                       <Text style={styles.stepDescription}>
                           Please select your EisenVault version to get started
                       </Text>
                       <View style={styles.radioContainer}>
                           <RadioButton.Group
                               onValueChange={(value: string) => {
                                   if (value === INSTANCE_TYPES.CLASSIC || value === INSTANCE_TYPES.ANGORA) {
                                       props.setInstanceType(value);
                                   }
                               }}
                               value={props.instanceType || ''}
                           >
                               <View style={styles.radioOption}>
                                   <RadioButton.Item
                                       label="EisenVault Classic"
                                       value={INSTANCE_TYPES.CLASSIC}
                                       labelStyle={styles.radioLabel}
                                   />
                                   <Text style={styles.radioDescription}>
                                       Traditional EisenVault with enterprise features
                                   </Text>
                               </View>
                               <View style={styles.radioOption}>
                                   <RadioButton.Item
                                       label="EisenVault Angora"
                                       value={INSTANCE_TYPES.ANGORA}
                                       labelStyle={styles.radioLabel}
                                   />
                                   <Text style={styles.radioDescription}>
                                       Next-generation EisenVault with modern interface
                                   </Text>
                               </View>
                           </RadioButton.Group>
                       </View>
                   </View>
               );

           case SetupStep.SERVER_URL:
               return (
                   <View style={styles.stepContent}>
                       <Text style={styles.stepTitle}>Server Configuration</Text>
                       <Text style={styles.stepDescription}>
                           Enter the URL of your EisenVault instance
                       </Text>
                       <View style={styles.inputContainer}>
                           <Server size={24} color={theme.colors.primary} />
                           <TextInput
                               mode="flat"
                               label="Server URL"
                               value={props.instanceUrl}
                               onChangeText={props.setInstanceUrl}
                               placeholder="https://your-instance.eisenvault.net"
                               autoCapitalize="none"
                               keyboardType="url"
                               style={styles.input}
                               error={!!props.error}
                           />
                       </View>
                   </View>
               );

           case SetupStep.CREDENTIALS:
               return (
                   <View style={styles.stepContent}>
                       <Text style={styles.stepTitle}>Login</Text>
                       <Text style={styles.stepDescription}>
                           Enter your credentials to access your account
                       </Text>
                       <View style={styles.inputContainer}>
                           <Key size={24} color={theme.colors.primary} />
                           <TextInput
                               mode="flat"
                               label="Username"
                               value={props.username}
                               onChangeText={props.setUsername}
                               autoCapitalize="none"
                               style={styles.input}
                           />
                       </View>
                       <View style={styles.inputContainer}>
                           <Key size={24} color={theme.colors.primary} />
                           <TextInput
                               mode="flat"
                               label="Password"
                               value={props.password}
                               onChangeText={props.setPassword}
                               secureTextEntry={!props.showPassword}
                               right={
                                   <TextInput.Icon
                                       icon={props.showPassword ? "eye-off" : "eye"}
                                       onPress={() => props.setShowPassword(!props.showPassword)}
                                   />
                               }
                               style={styles.input}
                           />
                       </View>
                   </View>
               );
       }
   };

   return (
       <SafeAreaView style={styles.container}>
           <Card style={styles.card}>
               <View style={styles.content}>
                   <View style={styles.logoContainer}>
                   <Image
                        source={require('../../assets/images/eisenvault-logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                        fadeDuration={0}
                        defaultSource={require('../../assets/images/eisenvault-logo.png')}
                    />
                   </View>

                   <View style={styles.stepIndicator}>
                        {[0, 1, 2].map((step: number) => (
                            <View
                                key={`step-${step}`}
                                style={[
                                    styles.stepDot,
                                    currentStep >= step && styles.stepDotActive
                                ]}
                            />
                        ))}
                    </View>

                    {renderStepContent(currentStep, {
                        instanceType,
                        setInstanceType,
                        instanceUrl,
                        setInstanceUrl,
                        username,
                        setUsername,
                        password,
                        setPassword,
                        showPassword,
                        setShowPassword,
                        error
                    })}

                    {error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : null}

                    <View style={styles.buttonContainer}>
                        {currentStep > 0 && (
                            <Button
                                mode="outlined"
                                onPress={() => setCurrentStep(prev => 
                                    prev > 0 ? prev - 1 as SetupStepType : prev
                                )}
                                style={styles.button}
                                icon={({ size, color }) => (
                                    <ChevronLeft size={size} color={color} />
                                )}
                            >
                                Back
                            </Button>
                        )}

                        <Button
                            mode="contained"
                            onPress={handleNext}
                            style={[styles.button, styles.primaryButton]}
                            icon={({ size, color }) => loading ? null : (
                                <ChevronRight size={size} color={color} />
                            )}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={theme.colors.textInverted} />
                            ) : currentStep === SetupStep.CREDENTIALS ? 'Login' : 'Next'}
                        </Button>
                    </View>
                </View>
            </Card>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create<SetupWizardStyles>({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        padding: theme.spacing.xl
    },
    card: {
        padding: theme.spacing.xl,
        borderRadius: theme.spacing.lg,
        backgroundColor: theme.colors.cardBackground,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            },
            android: {
                elevation: 5,
            },
        })
    },
    content: {
        opacity: 1
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl
    },
    logo: {
        width: windowWidth * 0.6,
        maxWidth: 200,
        height: 60
    },
    stepIndicator: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: theme.spacing.xl
    },
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.surfaceDisabled,
        marginHorizontal: 4
    },
    stepDotActive: {
        backgroundColor: theme.colors.primary,
        transform: [{ scale: 1.2 }]
    },
    stepContent: {
        marginBottom: theme.spacing.xl
    },
    stepTitle: {
        fontSize: theme.typography.sizes.xl,
        fontWeight: '600',
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
        textAlign: 'center'
    },
    stepDescription: {
        fontSize: theme.typography.sizes.base,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
        textAlign: 'center'
    },
    radioContainer: {
        marginTop: theme.spacing.base,
        paddingHorizontal: theme.spacing.base
    },
    radioOption: {
        marginBottom: theme.spacing.lg,
        backgroundColor: theme.colors.surfaceBackground,
        borderRadius: theme.spacing.base,
        padding: theme.spacing.base
    },
    radioLabel: {
        fontSize: theme.typography.sizes.base,
        color: theme.colors.textPrimary,
        fontWeight: '500'
    },
    radioDescription: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        marginLeft: theme.spacing.xl + theme.spacing.xs,
        marginTop: theme.spacing.xs,
        marginBottom: theme.spacing.sm
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceBackground,
        borderRadius: theme.spacing.base,
        padding: theme.spacing.base,
        marginBottom: theme.spacing.base,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    input: {
        flex: 1,
        backgroundColor: 'transparent',
        marginLeft: theme.spacing.base,
        height: 48
    },
    errorText: {
        color: theme.colors.error,
        fontSize: theme.typography.sizes.sm,
        textAlign: 'center',
        marginBottom: theme.spacing.base,
        marginTop: theme.spacing.xs
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: theme.spacing.lg,
        paddingHorizontal: theme.spacing.base
    },
    button: {
        minWidth: 120,
        borderRadius: theme.spacing.base
    },
    primaryButton: {
        backgroundColor: theme.colors.primary
    }
});

export default SetupWizard;