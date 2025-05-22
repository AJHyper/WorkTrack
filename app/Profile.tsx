import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; // Import LinearGradient
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
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

import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const { width } = Dimensions.get('window');

// --- Consistent Color Palette from DashboardEmp.tsx ---
const Colors = {
  primaryBlue: '#2A72B8',      // A deeper, more prominent blue from the logo's vibe
  darkBlue: '#1F558C',         // An even darker shade for headers/strong accents
  lightBlue: '#C9DCEC',        // A softer, light blue for backgrounds/cards
  lighterBlue: '#EAF3FA',      // Very subtle light blue for overall background
  white: '#FFFFFF',
  black: '#212121',            // Dark grey for main text
  mediumGrey: '#757575',       // For secondary text
  lightGrey: '#BDBDBD',        // For borders/dividers
};

const Profile: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  // Removed userIdDisplay state as it's no longer needed for display

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
      if (usr) {
        setUser(usr);
        setEmail(usr.email || '');
        // Removed setUserIdDisplay(usr.uid);

        const docRef = doc(db, 'users', usr.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setPhoneNumber(data.phoneNumber || '');
        }
      } else {
        setUser(null);
        setEmail('');
        // Removed setUserIdDisplay(null);
        setFirstName('');
        setLastName('');
        setPhoneNumber('');
      }
    });
    return unsubscribe;
  }, []);

  const goBack = () => {
    router.back();
  };

  const saveChanges = async () => {
    if (!user) {
      Alert.alert('Error', 'User not logged in!');
      return;
    }

    try {
      setLoading(true);
      await setDoc(
        doc(db, 'users', user.uid),
        { firstName, lastName, phoneNumber },
        { merge: true }
      );
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile changes.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.darkBlue} />

      {/* Header with LinearGradient, matching Dashboard aesthetic */}
      <LinearGradient
        colors={[Colors.primaryBlue, Colors.darkBlue]}
        style={[styles.header, { paddingTop: insets.top, height: 60 + insets.top }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={{ position: 'absolute', left: 16, top: insets.top + 10 }}
          onPress={goBack}
        >
          <Feather name="arrow-left" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
      </LinearGradient>

      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Profile Card Section */}
          <View style={styles.profileCard}>
            {/* User ID (read-only) - REMOVED THIS SECTION */}

            {/* Email Address (read-only) */}
            <Text style={styles.label}>Email Address</Text>
            <Text style={[styles.input, styles.readOnly]}>{email}</Text>

            {/* First Name */}
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              placeholderTextColor={Colors.mediumGrey}
            />

            {/* Last Name */}
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              placeholderTextColor={Colors.mediumGrey}
            />

            {/* Phone Number */}
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Enter phone number"
              placeholderTextColor={Colors.mediumGrey}
              keyboardType="phone-pad"
            />

            {/* Save Changes Button */}
            <TouchableOpacity onPress={saveChanges} style={styles.saveButton} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.lighterBlue, // Use lighter blue for background
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({ // Subtle shadow for the header
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerTitle: {
    color: Colors.white, // White text
    fontSize: 24, // Slightly smaller than dashboard name, more typical for header
    fontWeight: 'bold',
    textAlign: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20, // Add vertical padding to the scrollable content
    paddingHorizontal: 20, // Horizontal padding for the content
    alignItems: 'center', // Center the card
  },
  profileCard: { // New style for the main content card
    backgroundColor: Colors.white,
    borderRadius: 16, // Consistent with dashboard cards/tiles
    padding: 24,
    width: width * 0.9, // Match dashboard card width
    ...Platform.select({ // Add shadow for depth
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  label: {
    fontSize: 14,
    color: Colors.darkBlue, // Use darkBlue for labels
    marginBottom: 6,
    fontWeight: '600', // Semibold
  },
  input: {
    backgroundColor: Colors.lighterBlue, // Use a very light blue for input background
    padding: 12,
    borderRadius: 8, // Consistent rounded corners
    borderColor: Colors.lightGrey, // Lighter border color
    borderWidth: 1,
    fontSize: 15, // Slightly larger font for inputs
    marginBottom: 16,
    color: Colors.black, // Dark text for input
  },
  readOnly: {
    backgroundColor: Colors.lightBlue, // Slightly darker light blue for read-only fields
    color: Colors.mediumGrey, // Grey text for read-only
    fontWeight: 'normal',
  },
  saveButton: {
    backgroundColor: Colors.primaryBlue, // Primary blue for the main action button
    paddingVertical: 14, // Consistent padding
    borderRadius: 10, // Consistent rounded corners
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
    ...Platform.select({ // Add shadow to button
      ios: {
        shadowColor: Colors.primaryBlue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  saveButtonText: {
    color: Colors.white,
    fontWeight: '600', // Semibold
    fontSize: 17, // Consistent font size
  },
});

export default Profile;