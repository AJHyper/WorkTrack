import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { auth } from '../../config/firebase';

const { width, height } = Dimensions.get('window');

const Colors = {
  primaryBlue: '#2A72B8',
  darkBlue: '#1F558C',
  lightBlue: '#C9DCEC',
  lighterBlue: '#EAF3FA',
  white: '#FFFFFF',
  black: '#212121',
  mediumGrey: '#757575',
  lightGrey: '#BDBDBD',
  red: '#D32F2F',
  green: '#4CAF50',
  orange: '#FFC107',
};

const Login: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user; // Get the authenticated user object

      // --- Hierarchy-based login logic ---
      if (user && user.email) {
        if (user.email === 'joklynthomas@gmail.com') {
          router.replace('/auth/BossDashboard');
        } else {
          router.replace('/auth/DashboardEmp');
        }
      } else {
        // Fallback if user or user.email is unexpectedly null (shouldn't happen after successful signIn)
        router.replace('/auth/DashboardEmp');
      }
      // --- End Hierarchy-based login logic ---

    } catch (error: any) {
      console.log('Login error:', error);
      let errorMessage = 'Login failed. Please check your credentials.';
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password.';
      }
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/auth/ForgotPassword');
  };

  const handleRegister = () => {
    router.push('/auth/Register');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.darkBlue} />

      <LinearGradient
        colors={[Colors.primaryBlue, Colors.darkBlue]}
        style={[styles.headerBackground, { paddingTop: insets.top + (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image
              style={styles.logo}
              resizeMode="contain"
              source={require('../../assets/images/Logo.png')}
            />
          </View>
          <Text style={styles.welcomeText}>Log In Now</Text>
          <Text style={styles.subtitleText}>Log in to continue using the app</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={Colors.mediumGrey}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={setEmail}
              value={email}
            />

            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor={Colors.mediumGrey}
                secureTextEntry={!showPassword}
                onChangeText={setPassword}
                value={password}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.passwordVisibilityToggle}
              >
                <Feather
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color={Colors.mediumGrey}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotPasswordLink} onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.buttonText}>Log In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRegister} style={styles.registerLink}>
              <Text style={styles.registerLinkText}>
                Don't have an account?{' '}
                <Text style={styles.registerLinkHighlight}>Register</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.lighterBlue,
  },
  headerBackground: {
    position: 'absolute',
    width: width * 1.2,
    height: height * 0.45,
    borderBottomLeftRadius: width,
    borderBottomRightRadius: width,
    top: 0,
    left: -width * 0.1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
    paddingHorizontal: width * 0.05,
  },
  logoContainer: {
    marginTop: height * 0.07,
    alignItems: 'center',
    marginBottom: height * 0.05,
  },
  logoWrapper: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 15,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 15,
  },
  logo: {
    width: width * 0.25,
    height: width * 0.25 * (64.66 / 87),
  },
  welcomeText: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 0,
  },
  subtitleText: {
    fontSize: width * 0.04,
    color: Colors.white,
    marginTop: 5,
    opacity: 0.8,
    textAlign: 'center',
    width: '80%',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: height * 0.35,
    paddingBottom: 40,
  },
  formContainer: {
    width: width * 0.85,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 25,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: Colors.lighterBlue,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    fontSize: 16,
    color: Colors.black,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: Colors.lighterBlue,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.black,
  },
  passwordVisibilityToggle: {
    padding: 5,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 10,
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  forgotPasswordText: {
    fontSize: 15,
    color: Colors.primaryBlue,
    fontWeight: '600',
  },
  loginButton: {
    width: '100%',
    backgroundColor: Colors.primaryBlue,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: Colors.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerLink: {
    marginTop: 20,
    padding: 10,
  },
  registerLinkText: {
    fontSize: 15,
    color: Colors.mediumGrey,
  },
  registerLinkHighlight: {
    color: Colors.primaryBlue,
    fontWeight: 'bold',
  },
});

export default Login;