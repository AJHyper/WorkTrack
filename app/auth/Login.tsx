import { auth } from "@/config/firebase";
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const guidelineBaseWidth = 360;
const guidelineBaseHeight = 640;
const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;

const Login = () => {
  const router = useRouter();
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
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/auth/DashboardEmp'); // Navigate to Dashboard
    } catch (error: any) {
      console.log('Login error:', error);
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/auth/ForgotPassword');
  };

  return (
    <View style={styles.container}>
      <Image
        style={styles.logo}
        resizeMode="contain"
        source={require('../../assets/images/Logo.png')}
      />

      <Text style={styles.loginNowText}>Log In Now</Text>
      <Text style={styles.loginInstruction}>Log in to continue using the app</Text>

      <TextInput
        style={styles.inputField}
        placeholder="Email Address"
        placeholderTextColor="#aaa"
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={setEmail}
        value={email}
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          placeholderTextColor="#aaa"
          secureTextEntry={!showPassword}
          onChangeText={setPassword}
          value={password}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(prev => !prev)}
          style={styles.icon}
        >
          <Feather
            name={showPassword ? 'eye' : 'eye-off'}
            size={20}
            color="#000"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Logging In...' : 'Log In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleForgotPassword}>
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center', // vertical center
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },
  logo: {
    width: scale(87 * 2), // 100% bigger
    height: verticalScale(64.66 * 2),
    marginBottom: verticalScale(20),
    marginTop: -verticalScale(height * 0.05), // push up 5% screen height
  },
  loginNowText: {
    fontSize: scale(28),
    color: '#000',
    marginBottom: verticalScale(8),
  },
  loginInstruction: {
    fontSize: scale(16),
    color: '#000',
    width: scale(282),
    textAlign: 'center',
    marginBottom: verticalScale(20),
  },
  inputField: {
    width: scale(300),
    height: verticalScale(40),
    paddingLeft: scale(10),
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: scale(5),
    fontSize: scale(16),
    marginBottom: verticalScale(15),
    backgroundColor: '#fff',
  },
  passwordContainer: {
    width: scale(300),
    height: verticalScale(40),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: scale(5),
    paddingHorizontal: scale(10),
    marginBottom: verticalScale(20),
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    fontSize: scale(16),
  },
  icon: {
    paddingHorizontal: 10,
  },
  loginButton: {
    height: verticalScale(56),
    width: scale(250),
    borderRadius: scale(5),
    backgroundColor: '#1E56A0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  buttonText: {
    fontSize: scale(24),
    color: '#fff',
    textAlign: 'center',
  },
  forgotPasswordText: {
    fontSize: scale(16),
    color: '#1E56A0',
    textDecorationLine: 'underline',
  },
});

export default Login;
