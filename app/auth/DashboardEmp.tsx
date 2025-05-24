import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

const { width, height } = Dimensions.get('window');

// --- Updated Color Palette to better match the logo's blue ---
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

const DashboardEmp: React.FC = () => {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null); // Now correctly managed in state

  const [loading, setLoading] = useState(true);

  // Helper to get today's date in YYYY-MM-DD format
  const getTodayKey = () => new Date().toISOString().slice(0, 10);

  // --- Load User and Attendance Data ---
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        // If no user, redirect to login
        router.push('/auth/Login');
        return;
      }
      const uid = user.uid;
      setUserId(uid);

      // Fetch user profile data
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
      } else {
        // Create a basic user document if it doesn't exist
        await setDoc(
          doc(db, 'users', uid),
          {
            email: user.email,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
        setFirstName('');
        setLastName('');
      }

      // Fetch today's attendance record
      const attRef = doc(db, 'attendance', uid, 'dailyRecords', getTodayKey());
      const attSnap = await getDoc(attRef);
      if (attSnap.exists()) {
        const { checkInTime: ci, checkOutTime: co } = attSnap.data();
        setCheckInTime(ci ? new Date(ci) : null);
        setCheckOutTime(co ? new Date(co) : null); // Correctly set checkOutTime from Firestore
      } else {
        // Reset times if no record found for today
        setCheckInTime(null);
        setCheckOutTime(null);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]); // Added router to the dependency array

  // Effect to load data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // --- Handle Check-In ---
  const handleCheckIn = async () => {
    if (!userId) {
      Alert.alert('Error', 'User not identified. Please log in again.');
      return;
    }

    // Prevent re-checking in if already checked in and not checked out
    if (checkInTime && !checkOutTime) {
      Alert.alert('Already checked in', 'You have already checked in for today.');
      return;
    }

    const now = new Date();
    setCheckInTime(now); // Optimistically update UI
    setCheckOutTime(null); // Ensure checkOutTime is reset for a new check-in

    try {
      await setDoc(
        doc(db, 'attendance', userId, 'dailyRecords', getTodayKey()),
        {
          checkInTime: now.toISOString(),
          checkOutTime: null, // Explicitly set checkOutTime to null on check-in
          updatedAt: serverTimestamp(),
          employeeId: userId,
        },
        { merge: true } // Use merge to avoid overwriting other fields if they exist
      );
      Alert.alert('Check-in Successful', `You checked in at ${now.toLocaleTimeString()}.`);
    } catch (err) {
      console.error('Error saving check-in:', err);
      Alert.alert('Error', 'Could not save check-in. Please try again.');
      setCheckInTime(null); // Revert state on error
      setCheckOutTime(null); // Revert state on error
    }
  };

  // --- Handle Check-Out ---
  const handleCheckOut = async () => {
    if (!userId) {
      Alert.alert('Error', 'User not identified. Please log in again.');
      return;
    }
    if (!checkInTime) {
      Alert.alert('Check in first', 'You must check in before checking out.');
      return;
    }
    // Prevent re-checking out if already checked out
    if (checkOutTime) {
      Alert.alert('Already checked out', 'You have already checked out for today.');
      return;
    }

    const now = new Date();

    try {
      await updateDoc(
        doc(db, 'attendance', userId, 'dailyRecords', getTodayKey()),
        {
          checkOutTime: now.toISOString(),
          updatedAt: serverTimestamp(),
        }
      );
      setCheckOutTime(now); // Correctly update local state after successful Firestore write
      Alert.alert('Check-out Successful', `You checked out at ${now.toLocaleTimeString()}.`);
    } catch (err) {
      console.error('Error saving check-out:', err);
      Alert.alert('Error', 'Could not save check-out. Please try again.');
      // If there's an error, the local state naturally won't have been updated, so no revert needed
    }
  };

  // --- Calculate Hours Worked in H:M format ---
  const calculateHoursWorked = () => {
    if (checkInTime && checkOutTime) {
      const diffMilliseconds = checkOutTime.getTime() - checkInTime.getTime();
      const totalMinutes = Math.floor(diffMilliseconds / (1000 * 60)); // Total minutes worked

      const hours = Math.floor(totalMinutes / 60); // Get full hours
      const minutes = totalMinutes % 60; // Get remaining minutes

      if (hours === 0 && minutes === 0) {
        return '0m'; // If less than a minute, show '0m'
      } else if (hours === 0) {
        return `${minutes}m`; // Only minutes
      } else if (minutes === 0) {
        return `${hours}h`; // Only hours
      } else {
        return `${hours}h ${minutes}m`; // Both hours and minutes
      }
    }
    return '0h 0m'; // Default display when no times are available
  };

  // --- Current Date for Display ---
  const currentDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // --- Navigate to My Logs ---
  const handleMyLogsPress = () => {
    if (userId) {
      router.push({
        pathname: '/IndividualAttendance',
        params: { employeeId: userId },
      });
    } else {
      Alert.alert('Error', 'User ID not available. Please log in again.');
      router.push('/auth/Login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.darkBlue} />

      {/* Header Background Gradient */}
      <LinearGradient
        colors={[Colors.primaryBlue, Colors.darkBlue]}
        style={styles.headerBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

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
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.defaultAvatar}>
            <Feather name="user" size={width * 0.25} color={Colors.primaryBlue} />
          </View>
          <Text style={styles.name}>
            {firstName} {lastName}
          </Text>
        </View>

        {/* Attendance Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total hours today</Text>
          <Text style={styles.cardValue}>{calculateHoursWorked()}</Text> {/* Display H:M format */}

          <Text style={styles.timeLabel}>
            In: {checkInTime ? checkInTime.toLocaleTimeString() : '--:--'}
          </Text>
          <Text style={styles.timeLabel}>
            Out: {checkOutTime ? checkOutTime.toLocaleTimeString() : '--:--'}
          </Text>

          <View style={styles.buttonRow}>
            {/* Check In Button */}
            <TouchableOpacity
              style={[
                styles.checkInButton,
                (checkInTime && !checkOutTime) && { opacity: 0.6 } // Disable if already checked in and not checked out
              ]}
              onPress={handleCheckIn}
              disabled={loading || (!!checkInTime && !checkOutTime)}
            >
              <Text style={styles.buttonText}>
                {loading ? <ActivityIndicator color={Colors.white} /> : 'Check In'}
              </Text>
            </TouchableOpacity>

            {/* Check Out Button */}
            <TouchableOpacity
              style={[
                styles.checkOutButton,
                (loading || !checkInTime || !!checkOutTime) && { opacity: 0.6 } // Disable if loading, not checked in, or already checked out
              ]}
              onPress={handleCheckOut}
              disabled={loading || !checkInTime || !!checkOutTime}
            >
              <Text style={styles.buttonTextCheckOut}>
                {loading ? <ActivityIndicator color={Colors.primaryBlue} /> : 'Check Out'}
              </Text>
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
            onPress={handleMyLogsPress}
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lighterBlue },
  scrollView: { alignItems: 'center', paddingBottom: 40 },
  headerBackground: {
    position: 'absolute',
    width: width * 1.2,
    height: height * 0.45,
    borderBottomLeftRadius: width,
    borderBottomRightRadius: width,
    top: 0,
    left: -width * 0.1,
  },
  logoutButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight! + 10 : 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  profileSection: {
    marginTop: height * 0.07,
    alignItems: 'center',
    marginBottom: 20,
  },
  defaultAvatar: {
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: width * 0.2,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  name: {
    marginTop: 0,
    fontSize: width * 0.07,
    color: Colors.white,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20, // Slightly more rounded corners
    padding: 24,
    marginTop: 20,
    width: width * 0.9,
    alignItems: 'center',
    ...Platform.select({
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
  cardLabel: { fontSize: 16, color: Colors.mediumGrey, marginBottom: 4 },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.black,
    marginVertical: 12,
  },
  timeLabel: { fontSize: 15, color: Colors.black, marginVertical: 4 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    marginBottom: 10,
  },
  checkInButton: {
    backgroundColor: Colors.primaryBlue,
    paddingVertical: 16,
    borderRadius: 12, // Slightly more rounded buttons
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
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
    backgroundColor: Colors.lightBlue,
    paddingVertical: 16,
    borderRadius: 12, // Slightly more rounded buttons
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryBlue,
  },
  buttonText: { color: Colors.white, fontSize: 17, textAlign: 'center', fontWeight: '600' },
  buttonTextCheckOut: { color: Colors.primaryBlue, fontSize: 17, textAlign: 'center', fontWeight: '600' },
  cardDate: { marginTop: 12, fontSize: 15, color: Colors.mediumGrey },
  exploreTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 25,
    color: Colors.darkBlue,
    alignSelf: 'flex-start',
    marginLeft: width * 0.05,
  },
  exploreGrid: {
    flexDirection: 'row',
    width: width * 0.9,
    justifyContent: 'space-around',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  exploreTile: {
    width: '30%',
    backgroundColor: Colors.white,
    borderRadius: 16, // More rounded tiles
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  exploreLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.darkBlue,
    textAlign: 'center',
  },
});

export default DashboardEmp;