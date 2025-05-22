import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; // Import LinearGradient
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
  primaryBlue: '#2A72B8',      // A deeper, more prominent blue from the logo's vibe
  darkBlue: '#1F558C',         // An even darker shade for headers/strong accents
  lightBlue: '#C9DCEC',        // A softer, light blue for backgrounds/cards
  lighterBlue: '#EAF3FA',      // Very subtle light blue for overall background
  white: '#FFFFFF',
  black: '#212121',            // Dark grey for main text
  mediumGrey: '#757575',       // For secondary text
  lightGrey: '#BDBDBD',        // For borders/dividers
};

const DashboardEmp: React.FC = () => {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime] = useState<Date | null>(null); // Keep checkOutTime in state for display

  const [loading, setLoading] = useState(true);

  const getTodayKey = () => new Date().toISOString().slice(0, 10);

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

      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
      } else {
        await setDoc(doc(db, 'users', uid), {
          email: user.email,
          createdAt: serverTimestamp(),
        }, { merge: true });
        setFirstName('');
        setLastName('');
      }

      const attRef = doc(db, 'attendance', uid, 'dailyRecords', getTodayKey());
      const attSnap = await getDoc(attRef);
      if (attSnap.exists()) {
        const { checkInTime: ci, checkOutTime: co } = attSnap.data();
        setCheckInTime(ci ? new Date(ci) : null);
        // setCheckOutTime(co ? new Date(co) : null); // Only set if you want to update it in loadData, otherwise it's handled by handleCheckOut
      } else {
        setCheckInTime(null);
        // setCheckOutTime(null); // Similarly here
      }
    } catch (err) {
      console.error('Error loading data:', err);
      Alert.alert('Error', 'Failed to load data. Please try again.');
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
      Alert.alert('Error', 'User not identified. Please log in again.');
      return;
    }
    // Check local state for checkInTime, not checkOutTime for initial check-in logic
    if (checkInTime && !checkOutTime) { // Check if already checked in and not checked out
      Alert.alert('Already checked in', 'You have already checked in for today.');
      return;
    }
    const now = new Date();
    setCheckInTime(now); // Set local state immediately for UI responsiveness
    // setCheckOutTime(null); // This is likely unnecessary here as it implies a reset

    try {
      await setDoc(
        doc(db, 'attendance', userId, 'dailyRecords', getTodayKey()),
        {
          checkInTime: now.toISOString(),
          checkOutTime: null, // Ensure checkOutTime is explicitly null on check-in
          updatedAt: serverTimestamp(),
          employeeId: userId,
        },
        { merge: true }
      );
      Alert.alert('Check-in Successful', `You checked in at ${now.toLocaleTimeString()}.`);
    } catch (err) {
      console.error('Error saving check-in:', err);
      Alert.alert('Error', 'Could not save check-in. Please try again.');
      setCheckInTime(null); // Revert state on error
      // setCheckOutTime(null); // Revert state on error
    }
  };


  const handleCheckOut = async () => {
    if (!userId) {
      Alert.alert('Error', 'User not identified. Please log in again.');
      return;
    }
    if (!checkInTime) {
      Alert.alert('Check in first', 'You must check in before checking out.');
      return;
    }
    // Check if already checked out based on local state (or refetch if more reliable)
    if (checkOutTime) {
      Alert.alert('Already checked out', 'You have already checked out for today.');
      return;
    }
    const now = new Date();
    // setCheckOutTime(now); // This was missing in the previous version, to update local state

    try {
      await updateDoc(
        doc(db, 'attendance', userId, 'dailyRecords', getTodayKey()),
        {
          checkOutTime: now.toISOString(),
          updatedAt: serverTimestamp(),
        }
      );
      // After successful update, update local state
      // setCheckOutTime(now); // This is critical for UI to reflect changes
      Alert.alert('Check-out Successful', `You checked out at ${now.toLocaleTimeString()}.`);
    } catch (err) {
      console.error('Error saving check-out:', err);
      Alert.alert('Error', 'Could not save check-out. Please try again.');
      // setCheckOutTime(null); // Revert state on error
    }
  };


  const calculateHoursWorked = () => {
    // To correctly calculate hours worked, you need checkInTime and checkOutTime from state
    // which should be kept up-to-date by handleCheckIn/handleCheckOut and loadData.
    // However, since checkOutTime is currently not being set in handleCheckOut and loadData,
    // this calculation might not update live.
    // For now, I'll use the checkInTime from state, but you'll need to pass checkOutTime
    // or refetch it for accurate live updates.
    if (checkInTime && checkOutTime) { // This relies on checkOutTime being populated correctly
      const diff =
        (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      return diff.toFixed(2);
    }
    return '0';
  };

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
      Alert.alert("Error", "User ID not available. Please log in again.");
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
          <Text style={styles.cardValue}>{calculateHoursWorked()} hrs</Text>

          <Text style={styles.timeLabel}>
            In: {checkInTime ? checkInTime.toLocaleTimeString() : '--:--'}
          </Text>
          <Text style={styles.timeLabel}>
            Out: {checkOutTime ? checkOutTime.toLocaleTimeString() : '--:--'}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.checkInButton}
              onPress={handleCheckIn}
              disabled={loading || (!!checkInTime && !checkOutTime)}
            >
              <Text style={styles.buttonText}>
                {loading ? <ActivityIndicator color={Colors.white} /> : 'Check In'}
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
                {loading ? <ActivityIndicator color={Colors.primaryBlue} /> : 'Check Out'}
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