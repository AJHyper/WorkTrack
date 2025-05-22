import { auth } from '@/config/firebase';
import { Buffer } from 'buffer';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  View
} from 'react-native';
global.Buffer = global.Buffer || Buffer;

const { width, height } = Dimensions.get('window');
const scale = (size: number) => (width / 360) * size;
const verticalScale = (size: number) => (height / 640) * size;

const Loading = () => {
  const router = useRouter();

  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Animate logo scale and fade in
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      // Start infinite pulse animation for loading text
      Animated.loop(
        Animated.sequence([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(textOpacity, {
            toValue: 0.5,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();

    const timer = setTimeout(() => {
      const user = auth.currentUser;

      if (user?.email) {
        if (user.email === 'alfredjokelin123@gmail.com') {
          router.replace('/auth/DashboardEmp');
        } else {
          router.replace('/auth/BossDashboard');
        }
      } else {
        router.replace('/auth/Login');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [logoOpacity, logoScale, router, textOpacity]);

  return (
    <View style={styles.container}>
      <Animated.Image
        style={[
          styles.logo,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
        resizeMode="contain"
        source={require('../assets/images/Logo.png')}
      />
      <Animated.Text style={[styles.loadingText, { opacity: textOpacity }]}>
        Loading...
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: scale(87 * 2),
    height: verticalScale(64.66 * 2),
    marginBottom: verticalScale(20),
  },
  loadingText: {
    fontSize: scale(18),
    color: '#1E56A0',
    fontWeight: '600',
  },
});

export default Loading;
