import { useAuth } from "@/contexts/authContext"; // Make sure this is the correct path
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { updateProfile } from 'firebase/auth';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    ScrollView,
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

const Register = () => {
    const router = useRouter();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { register, user } = useAuth();

    const handleRegister = async () => {
        if (!fullName.trim()) {
            Alert.alert('Invalid Input', 'Please enter your full name.');
            return;
        }
        if (!email.trim()) {
            Alert.alert('Invalid Input', 'Please enter your email address.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Weak Password', 'Password should be at least 6 characters.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Password mismatch', 'Passwords do not match!');
            return;
        }

        try {
            await register(email, password);
            if (user) {
                await updateProfile(user, { displayName: fullName });
            }
            Alert.alert('Success', 'Account created successfully!', [
                { text: 'OK', onPress: () => router.push('/auth/Login') },
            ]);
        } catch (error: any) {
            let message = 'Something went wrong.';
            if (error.code === 'auth/email-already-in-use') {
                message = 'This email is already in use.';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Invalid email address.';
            } else if (error.code === 'auth/weak-password') {
                message = 'Password should be at least 6 characters.';
            }
            Alert.alert('Registration Failed', message);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Image
                style={styles.logo}
                resizeMode="contain"
                source={require('../../assets/images/Logo.png')}
            />

            <Text style={styles.registerNowText}>Register Now</Text>
            <Text style={styles.registerInstruction}>
                Create an account to continue using the app
            </Text>

            <TextInput
                style={styles.inputField}
                placeholder="Full Name"
                placeholderTextColor="#aaa"
                value={fullName}
                onChangeText={setFullName}
            />

            <TextInput
                style={styles.inputField}
                placeholder="Email Address"
                placeholderTextColor="#aaa"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />

            <View style={styles.passwordContainer}>
                <TextInput
                    style={styles.passwordInput}
                    placeholder="Password"
                    placeholderTextColor="#aaa"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                />
                <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    style={styles.icon}
                >
                    <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color="#000" />
                </TouchableOpacity>
            </View>

            <View style={styles.passwordContainer}>
                <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm Password"
                    placeholderTextColor="#aaa"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    style={styles.icon}
                >
                    <Feather name={showConfirmPassword ? 'eye' : 'eye-off'} size={20} color="#000" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
                <Text style={styles.buttonText}>Register</Text>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
                <TouchableOpacity onPress={() => router.push('/auth/Login')}>
                    <Text style={styles.switchText}>Already have an account? Log in</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingHorizontal: scale(20),
    },
    logo: {
        width: scale(87),
        height: verticalScale(64.66),
        marginTop: verticalScale(60),
    },
    registerNowText: {
        fontSize: scale(28),
        color: '#000',
        marginTop: verticalScale(20),
    },
    registerInstruction: {
        fontSize: scale(16),
        color: '#000',
        textAlign: 'center',
        marginTop: verticalScale(10),
        width: scale(282),
    },
    inputField: {
        width: scale(300),
        height: verticalScale(40),
        paddingLeft: scale(10),
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: scale(5),
        fontSize: scale(16),
        marginTop: verticalScale(20),
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
        marginTop: verticalScale(20),
    },
    passwordInput: {
        flex: 1,
        fontSize: scale(16),
    },
    icon: {
        paddingHorizontal: 10,
    },
    registerButton: {
        height: verticalScale(56),
        width: scale(250),
        borderRadius: scale(5),
        backgroundColor: '#1E56A0',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: verticalScale(30),
    },
    buttonText: {
        fontSize: scale(24),
        color: '#fff',
        textAlign: 'center',
    },
    loginContainer: {
        marginTop: verticalScale(20),
        marginBottom: verticalScale(40),
    },
    switchText: {
        fontSize: scale(16),
        color: '#1E56A0',
        textDecorationLine: 'underline',
    },
});

export default Register;
