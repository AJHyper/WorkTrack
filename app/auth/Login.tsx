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
      router.replace('/auth/DashboardEmp'); // ✅ Replace with your home screen
    } catch (error: any) {
      console.log('Login error:', error);
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    router.push('/auth/Register');
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
        style={[styles.inputField, styles.mobileInput]}
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

      <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
        <Text style={styles.registerText}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  logo: {
    width: scale(87),
    height: verticalScale(64.66),
    position: 'absolute',
    top: verticalScale(160),
  },
  loginNowText: {
    fontSize: scale(28),
    color: '#000',
    position: 'absolute',
    top: verticalScale(215),
  },
  loginInstruction: {
    fontSize: scale(16),
    color: '#000',
    position: 'absolute',
    top: verticalScale(250),
    width: scale(282),
    textAlign: 'center',
  },
  inputField: {
    position: 'absolute',
    width: scale(300),
    height: verticalScale(40),
    paddingLeft: scale(10),
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: scale(5),
    fontSize: scale(16),
  },
  mobileInput: {
    top: verticalScale(285),
  },
  passwordContainer: {
    position: 'absolute',
    top: verticalScale(340),
    width: scale(300),
    height: verticalScale(40),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: scale(5),
    paddingHorizontal: scale(10),
  },
  passwordInput: {
    flex: 1,
    fontSize: scale(16),
  },
  icon: {
    paddingHorizontal: 10,
  },
  loginButton: {
    position: 'absolute',
    top: verticalScale(410),
    height: verticalScale(56),
    width: scale(250),
    borderRadius: scale(5),
    backgroundColor: '#1E56A0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: scale(24),
    color: '#fff',
    textAlign: 'center',
  },
  registerButton: {
    position: 'absolute',
    top: verticalScale(475),
    height: verticalScale(40),
    width: scale(250),
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: scale(16),
    color: '#1E56A0',
  },
});

export default Login;
