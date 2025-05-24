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
  Timestamp, // Import Timestamp for checking type
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

const { width, height } = Dimensions.get('window');

// --- Updated Color Palette to better match the logo's blue ---
const Colors = {
  primaryBlue: '#2A72B8',
  darkBlue: '#1F558C',
  lightBlue: '#C9DCEC',
  lighterBlue: '#EAF3FA',
  white: '#FFFFFF',
  black: '#212121',
  mediumGrey: '#757575',
  lightGrey: '#BDBDBD',
};

const DashboardEmp: React.FC = () => {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);

  const [loading, setLoading] = useState(true);

  // Helper to get today's date in YYYY-MM-DD format
  const getTodayKey = () => new Date().toISOString().slice(0, 10);

  // --- Format time for display ---
  const formatTimeForDisplay = useCallback((date: Date | null): string => {
    return date ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
  }, []);

  // --- Load User and Attendance Data ---
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

      // Fetch user profile data
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
      } else {
        // If user document doesn't exist, create a basic one
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

      // Fetch today's attendance record from the 'daily' subcollection
      const attRef = doc(db, 'attendance', uid, 'daily', getTodayKey());
      const attSnap = await getDoc(attRef);

      if (attSnap.exists()) {
        const { checkInTime: ci, checkOutTime: co } = attSnap.data();

        // Safely convert Timestamp to Date object
        let ciDate: Date | null = null;
        if (ci instanceof Timestamp) {
            ciDate = ci.toDate();
        }

        let coDate: Date | null = null;
        if (co instanceof Timestamp) {
            coDate = co.toDate();
        }

        setCheckInTime(ciDate);
        setCheckOutTime(coDate);
      } else {
        setCheckInTime(null);
        setCheckOutTime(null);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Use useFocusEffect to reload data when the screen comes into focus
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

    // THIS IS THE CRUCIAL CHANGE: If a check-in time exists for today, prevent further check-ins.
    if (checkInTime) {
      Alert.alert('Already checked in', 'You have already checked in for today. Only one check-in per day is allowed.');
      return;
    }

    setLoading(true); // Indicate that a button action is loading
    const now = new Date(); // This `now` is for optimistic UI update and alert message only

    try {
      await setDoc(
        doc(db, 'attendance', userId, 'daily', getTodayKey()),
        {
          checkInTime: serverTimestamp(), // Use serverTimestamp for accuracy
          checkOutTime: null, // Ensure this is explicitly null for a new check-in
          updatedAt: serverTimestamp(),
          employeeId: userId,
        },
        { merge: true } // Use merge to avoid overwriting other fields if they exist
      );
      setCheckInTime(now); // Optimistically update UI with local time for immediate feedback
      setCheckOutTime(null); // Ensure checkOutTime is reset for a new check-in
      Alert.alert('Check-in Successful', `You checked in at ${formatTimeForDisplay(now)}.`);
    } catch (err) {
      console.error('Error saving check-in:', err);
      Alert.alert('Error', 'Could not save check-in. Please try again.');
    } finally {
      setLoading(false); // End loading indication
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
    if (checkOutTime) {
      Alert.alert('Already checked out', 'You have already checked out for today.');
      return;
    }

    setLoading(true); // Indicate that a button action is loading
    const now = new Date(); // This `now` is for optimistic UI update and alert message only

    try {
      await updateDoc(
        doc(db, 'attendance', userId, 'daily', getTodayKey()),
        {
          checkOutTime: serverTimestamp(), // Use serverTimestamp for accuracy
          updatedAt: serverTimestamp(),
        }
      );
      setCheckOutTime(now); // Optimistically update UI with local time for immediate feedback
      Alert.alert('Check-out Successful', `You checked out at ${formatTimeForDisplay(now)}.`);
    } catch (err) {
      console.error('Error saving check-out:', err);
      Alert.alert('Error', 'Could not save check-out. Please try again.');
    } finally {
      setLoading(false); // End loading indication
    }
  };

  // --- Calculate Hours Worked in H:M format ---
  const calculateHoursWorked = useCallback(() => {
    if (checkInTime && checkOutTime) {
      const diffMilliseconds = checkOutTime.getTime() - checkInTime.getTime();
      const totalMinutes = Math.floor(diffMilliseconds / (1000 * 60));

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      if (hours === 0 && minutes === 0) {
        return '0m';
      } else if (hours === 0) {
        return `${minutes}m`;
      } else if (minutes === 0) {
        return `${hours}h`;
      } else {
        return `${hours}h ${minutes}m`;
      }
    }
    // If checked in but not out, show current duration
    if (checkInTime && !checkOutTime) {
      const diffMilliseconds = new Date().getTime() - checkInTime.getTime();
      const totalMinutes = Math.floor(diffMilliseconds / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}m (ongoing)`;
    }
    return '0h 0m';
  }, [checkInTime, checkOutTime]);

  const currentDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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

      <LinearGradient
        colors={[Colors.primaryBlue, Colors.darkBlue]}
        style={styles.headerBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

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
          <View style={styles.defaultAvatar}>
            <Feather name="user" size={width * 0.25} color={Colors.primaryBlue} />
          </View>
          <Text style={styles.name}>
            {firstName} {lastName}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total hours today</Text>
          {loading && !checkInTime && !checkOutTime ? ( // Only show loading on initial data fetch
            <ActivityIndicator size="large" color={Colors.primaryBlue} style={{ marginVertical: 12 }} />
          ) : (
            <Text style={styles.cardValue}>{calculateHoursWorked()}</Text>
          )}

          <Text style={styles.timeLabel}>
            In: {formatTimeForDisplay(checkInTime)}
          </Text>
          <Text style={styles.timeLabel}>
            Out: {formatTimeForDisplay(checkOutTime)}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.checkInButton,
                (loading || !!checkInTime) && { opacity: 0.6 } // Disable if loading or if checkInTime exists
              ]}
              onPress={handleCheckIn}
              disabled={loading || !!checkInTime} // Disable if loading or if checkInTime exists
            >
              <Text style={styles.buttonText}>
                {loading && !checkInTime ? <ActivityIndicator color={Colors.white} /> : 'Check In'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.checkOutButton,
                (loading || !checkInTime || !!checkOutTime) && { opacity: 0.6 }
              ]}
              onPress={handleCheckOut}
              disabled={loading || !checkInTime || !!checkOutTime}
            >
              <Text style={styles.buttonTextCheckOut}>
                {loading && checkInTime && !checkOutTime ? <ActivityIndicator color={Colors.primaryBlue} /> : 'Check Out'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.cardDate}>Date: {currentDate}</Text>
        </View>

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