import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp, // Ensure Timestamp is imported
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../../config/firebase'; // Ensure these are correctly imported

const { width, height } = Dimensions.get('window');

// --- Consistent Color Palette from other Dashboard components ---
const Colors = {
  primaryBlue: '#2A72B8', // A deeper, more prominent blue from the logo's vibe
  darkBlue: '#1F558C', // An even darker shade for headers/strong accents
  lightBlue: '#C9DCEC', // A softer, light blue for backgrounds/cards
  lighterBlue: '#EAF3FA', // Very subtle light blue for overall background
  white: '#FFFFFF',
  black: '#212121', // Dark grey for main text
  mediumGrey: '#757575', // For secondary text
  lightGrey: '#BDBDBD', // For borders/dividers
};

const BossDashboard: React.FC = () => {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false); // For check-in/out button presses

  const getTodayKey = () => new Date().toISOString().slice(0, 10);

  const formatTimeForDisplay = useCallback((date: Date | null): string => {
    // Using ternary: If date exists, format it, otherwise return '--:--'
    return date ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        router.push('/auth/Login');
        return;
      }
      const uid = user.uid;
      setUserId(uid);

      // Load user profile
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setProfilePhoto(data.profilePhoto || null);
      }

      // Load today's attendance
      const attRef = doc(db, 'attendance', uid, 'daily', getTodayKey()); // Uses 'daily'
      const attSnap = await getDoc(attRef);
      if (attSnap.exists()) {
        const data = attSnap.data();
        // Ensure checkInTime and checkOutTime are correctly converted from Firestore Timestamps
        setCheckInTime(data.checkInTime instanceof Timestamp ? data.checkInTime.toDate() : null);
        setCheckOutTime(data.checkOutTime instanceof Timestamp ? data.checkOutTime.toDate() : null);
      } else {
        setCheckInTime(null);
        setCheckOutTime(null);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleCheckIn = async () => {
    if (!userId) {
      Alert.alert('Error', 'User not logged in.');
      return;
    }
    if (checkInTime) {
      Alert.alert('Already Checked In', 'You have already checked in today. You can only check in once per day.');
      return;
    }

    setButtonLoading(true);

    try {
      // Use serverTimestamp() directly in Firestore for consistency
      await setDoc(
        doc(db, 'attendance', userId, 'daily', getTodayKey()), // Uses 'daily'
        {
          checkInTime: serverTimestamp(),
          checkOutTime: null, // Ensure this is explicitly null for check-in
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      Alert.alert('Success', 'Checked in successfully!');
      // Re-load data after successful check-in to get the server's timestamp
      await loadData();
    } catch (err) {
      console.error('Error saving check-in:', err);
      Alert.alert('Error', 'Could not save check-in');
      // On error, revert optimism by re-loading data
      await loadData();
    } finally {
      setButtonLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!userId) {
      Alert.alert('Error', 'User not logged in.');
      return;
    }
    if (!checkInTime) {
      Alert.alert('Check In First', 'You must check in before checking out.');
      return;
    }
    if (checkOutTime) {
      Alert.alert('Already Checked Out', 'You have already checked out today.');
      return;
    }

    setButtonLoading(true);

    try {
      // Use serverTimestamp() directly in Firestore for consistency
      await updateDoc(
        doc(db, 'attendance', userId, 'daily', getTodayKey()), // Uses 'daily'
        {
          checkOutTime: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
      Alert.alert('Success', 'Checked out successfully!');
      // **Crucially, re-load data after successful check-out to get the server's timestamp**
      await loadData();
    } catch (err) {
      console.error('Error saving check-out:', err);
      Alert.alert('Error', 'Could not save check-out');
      // On error, re-load data to revert optimism
      await loadData();
    } finally {
      setButtonLoading(false);
    }
  };

  const calculateHoursWorked = useCallback(() => {
    // This calculation remains the same, as it operates on the Date objects
    // that are correctly set by loadData after Firestore interactions.
    if (checkInTime && checkOutTime) {
      const diff = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      return diff >= 0 ? diff.toFixed(2) : '0.00';
    }
    if (checkInTime && !checkOutTime) {
      const now = new Date();
      const diff = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      return diff >= 0 ? diff.toFixed(2) : '0.00';
    }
    return '0.00';
  }, [checkInTime, checkOutTime]);

  const currentDate = new Date().toLocaleDateString();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.darkBlue} />

      {/* Header Background (curved shape) */}
      <View style={styles.headerBackground} />

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          auth.signOut();
          router.push('/auth/Login');
        }}
      >
        <Feather name="log-out" size={24} color={Colors.white} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.profileSection}>
          <Image
            source={
              profilePhoto
                ? { uri: profilePhoto }
                : require('../../assets/images/Profile.png') // Ensure this path is correct
            }
            style={styles.avatar}
          />
          <Text style={styles.name}>
            {firstName} {lastName}
          </Text>
        </View>

        {/* Attendance Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total hours today</Text>
          {/* Ternary for conditional rendering of ActivityIndicator or Text */}
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primaryBlue} style={{ marginVertical: 10 }} />
          ) : (
            <Text style={styles.cardValue}>{calculateHoursWorked()} hrs</Text>
          )}

          <Text style={styles.timeLabel}>
            In: {formatTimeForDisplay(checkInTime)}
          </Text>
          <Text style={styles.timeLabel}>
            Out: {formatTimeForDisplay(checkOutTime)}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.checkInButton, (buttonLoading || checkInTime) && styles.disabledButton]}
              onPress={handleCheckIn}
              disabled={buttonLoading || !!checkInTime}
            >
              {/* Ternary for conditional rendering of ActivityIndicator or Text */}
              {buttonLoading && !checkInTime ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.buttonText}>Check In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkOutButton, (buttonLoading || !checkInTime || checkOutTime) && styles.disabledButton]}
              onPress={handleCheckOut}
              disabled={buttonLoading || !checkInTime || !!checkOutTime}
            >
              {/* Ternary for conditional rendering of ActivityIndicator or Text */}
              {buttonLoading && checkInTime && !checkOutTime ? (
                <ActivityIndicator color={Colors.primaryBlue} />
              ) : (
                <Text style={styles.buttonTextCheckOut}>Check Out</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.cardDate}>Date: {currentDate}</Text>
        </View>

        {/* Explore Section */}
        <Text style={styles.exploreTitle}>Explore</Text>
        <View style={styles.exploreGrid}>
          <TouchableOpacity
            style={styles.exploreTile}
            onPress={() => router.push('/Profile')}
          >
            <Feather name="user" size={24} color={Colors.darkBlue} />
            <Text style={styles.exploreLabel}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exploreTile}
            onPress={() => router.push('/IndividualAttendance')}
          >
            <Feather name="calendar" size={24} color={Colors.darkBlue} />
            <Text style={styles.exploreLabel}>My Logs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exploreTile}
            onPress={() => router.push('/ProjectDetails')}
          >
            <Feather name="briefcase" size={24} color={Colors.darkBlue} />
            <Text style={styles.exploreLabel}>Tasks</Text>
          </TouchableOpacity>
          {/* New buttons added below */}
          <TouchableOpacity
            style={styles.exploreTile}
            onPress={() => router.push('/NewProject')}
          >
            <Feather name="plus-circle" size={24} color={Colors.darkBlue} />
            <Text style={styles.exploreLabel}>New Project</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exploreTile}
            onPress={() => router.push('/EmpAttendance')}
          >
            <Feather name="users" size={24} color={Colors.darkBlue} />
            <Text style={styles.exploreLabel}>Team Logs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exploreTile}
            onPress={() => router.push('/AllProjects')}
          >
            <Feather name="layers" size={24} color={Colors.darkBlue} />
            <Text style={styles.exploreLabel}>All Projects</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lighterBlue, // Consistent background color
  },
  scrollView: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  headerBackground: {
    position: 'absolute',
    width: width * 1.2,
    height: height * 0.45,
    borderBottomLeftRadius: width,
    borderBottomRightRadius: width,
    backgroundColor: Colors.darkBlue, // Use dark blue for the curved header
    top: 0,
    left: -width * 0.1,
    ...Platform.select({ // Add shadow to the header background
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  logoutButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight! + 10 : 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    // Add subtle shadow to the button itself for pop
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  profileSection: { marginTop: height * 0.07, alignItems: 'center' },
  avatar: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    borderWidth: 3, // Slightly thicker border
    borderColor: Colors.white, // White border for contrast
    backgroundColor: Colors.white, // Fallback background for image
    // Add shadow to avatar for depth
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  name: {
    marginTop: 12,
    fontSize: width * 0.07,
    color: Colors.white, // White text for name
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: Colors.white, // White background for the card
    borderRadius: 16, // Consistent rounded corners
    padding: 20,
    marginTop: 20,
    width: width * 0.9, // Adjusted width for consistency
    alignItems: 'center',
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
  cardLabel: {
    fontSize: 15, // Slightly smaller font
    color: Colors.mediumGrey, // Medium grey for labels
  },
  cardValue: {
    fontSize: 26, // Larger and more prominent
    fontWeight: 'bold',
    color: Colors.primaryBlue, // Primary blue for the main value
    marginVertical: 10,
  },
  timeLabel: {
    fontSize: 15, // Consistent font size
    color: Colors.black, // Dark text for times
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 15, // Increased vertical margin
  },
  checkInButton: {
    backgroundColor: Colors.primaryBlue, // Primary blue for check-in
    paddingVertical: 14, // Consistent padding
    borderRadius: 10, // Consistent rounded corners
    flex: 1,
    marginRight: 8, // Increased margin
    alignItems: 'center',
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
  checkOutButton: {
    backgroundColor: Colors.lightBlue, // Light blue for check-out
    paddingVertical: 14, // Consistent padding
    borderRadius: 10, // Consistent rounded corners
    flex: 1,
    marginLeft: 8, // Increased margin
    alignItems: 'center',
    borderWidth: 1, // Add border for visual separation
    borderColor: Colors.primaryBlue, // Primary blue border for check-out button
    ...Platform.select({ // Add shadow to button
      ios: {
        shadowColor: Colors.lightBlue, // Use light blue for shadow
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600', // Semibold
    textAlign: 'center',
  },
  buttonTextCheckOut: {
    color: Colors.primaryBlue, // Primary blue text for check-out button
    fontSize: 16,
    fontWeight: '600', // Semibold
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.6, // Slightly more opaque for disabled state
  },
  cardDate: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.mediumGrey, // Medium grey for date
  },
  exploreTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 25, // Increased vertical margin
    color: Colors.darkBlue, // Dark blue for title
    alignSelf: 'flex-start', // Align to left
    marginLeft: width * 0.05, // Match card alignment
  },
  exploreGrid: {
    flexDirection: 'row',
    width: width * 0.9, // Consistent width
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  exploreTile: {
    width: '31%', // Adjusted width to fit 3 tiles with spacing
    backgroundColor: Colors.white, // White background for tiles
    borderRadius: 12, // Consistent rounded corners
    padding: 18, // Slightly reduced padding
    alignItems: 'center',
    marginBottom: 15, // Consistent spacing
    ...Platform.select({ // Add shadow
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  exploreLabel: {
    marginTop: 10,
    fontSize: 13, // Slightly smaller font for labels
    fontWeight: '600', // Semibold
    color: Colors.darkBlue, // Dark blue for labels
    textAlign: 'center', // Center text
  },
});

export default BossDashboard;