import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
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
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

const { width, height } = Dimensions.get('window');

const Dashboard: React.FC = () => {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);
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

      // Load user profile
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setProfilePhoto(data.profilePhoto || null);
      }

      // Load today's attendance
      const attRef = doc(db, 'attendance', uid, 'daily', getTodayKey());
      const attSnap = await getDoc(attRef);
      if (attSnap.exists()) {
        const { checkInTime: ci, checkOutTime: co } = attSnap.data();
        setCheckInTime(ci ? new Date(ci) : null);
        setCheckOutTime(co ? new Date(co) : null);
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
    if (!userId) return;
    if (checkInTime && !checkOutTime) {
      Alert.alert('Already checked in', 'You have already checked in.');
      return;
    }
    const now = new Date();
    setCheckInTime(now);
    setCheckOutTime(null);

    try {
      await setDoc(
        doc(db, 'attendance', userId, 'daily', getTodayKey()),
        {
          checkInTime: now.toISOString(),
          checkOutTime: null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Error saving check-in:', err);
      Alert.alert('Error', 'Could not save check-in');
    }
  };

  const handleCheckOut = async () => {
    if (!userId) return;
    if (!checkInTime) {
      Alert.alert('Check in first', 'You must check in before checking out.');
      return;
    }
    if (checkOutTime) {
      Alert.alert('Already checked out', 'You have already checked out.');
      return;
    }
    const now = new Date();
    setCheckOutTime(now);

    try {
      await updateDoc(
        doc(db, 'attendance', userId, 'daily', getTodayKey()),
        {
          checkOutTime: now.toISOString(),
          updatedAt: serverTimestamp(),
        }
      );
    } catch (err) {
      console.error('Error saving check-out:', err);
      Alert.alert('Error', 'Could not save check-out');
    }
  };

  const calculateHoursWorked = () => {
    if (checkInTime && checkOutTime) {
      const diff =
        (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      return diff.toFixed(2);
    }
    return '0';
  };

  const currentDate = new Date().toLocaleDateString();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />

      <View style={styles.headerBackground} />
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          auth.signOut();
          router.push('/auth/Login');
        }}
      >
        <Feather name="log-out" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.profileSection}>
          <Image
            source={
              profilePhoto
                ? { uri: profilePhoto }
                : require('../../assets/images/Profile.png')
            }
            style={styles.avatar}
          />
          <Text style={styles.name}>
            {firstName} {lastName}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total hours today</Text>
          <Text style={styles.cardValue}>{calculateHoursWorked()} hrs</Text>

          <Text style={styles.timeLabel}>
            In: {checkInTime ? checkInTime.toLocaleTimeString() : '--'}
          </Text>
          <Text style={styles.timeLabel}>
            Out: {checkOutTime ? checkOutTime.toLocaleTimeString() : '--'}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.checkInButton}
              onPress={handleCheckIn}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Check In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkOutButton, !checkInTime && { opacity: 0.5 }]}
              onPress={handleCheckOut}
              disabled={!checkInTime || loading}
            >
              <Text style={styles.buttonTextCheckOut}>Check Out</Text>
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
            <Feather name="user" size={24} color="#1E3A8A" />
            <Text style={styles.exploreLabel}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exploreTile}
            onPress={() => router.push('/IndividualAttendance')}
          >
            <Feather name="calendar" size={24} color="#1E3A8A" />
            <Text style={styles.exploreLabel}>My Logs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exploreTile}
            onPress={() => router.push('/ProjectDetails')}
          >
            <Feather name="briefcase" size={24} color="#1E3A8A" />
            <Text style={styles.exploreLabel}>Tasks</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E6F0FF' },
  scrollView: { alignItems: 'center', paddingBottom: 40 },
  headerBackground: {
    position: 'absolute',
    width: width * 1.2,
    height: height * 0.45,
    borderBottomLeftRadius: width,
    borderBottomRightRadius: width,
    backgroundColor: '#1E3A8A',
    top: 0,
    left: -width * 0.1,
  },
  logoutButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight! + 10 : 50,
    left: 20,
    zIndex: 10,
  },
  profileSection: { marginTop: height * 0.07, alignItems: 'center' },
  avatar: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  name: {
    marginTop: 12,
    fontSize: width * 0.07,
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#B3D4FC',
    borderColor: '#1E3A8A',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    width: width * 0.85,
    alignItems: 'center',
  },
  cardLabel: { fontSize: 16, color: '#000' },
  cardValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginVertical: 10,
  },
  timeLabel: { fontSize: 14, color: '#000' },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 8,
  },
  checkInButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 10,
    flex: 1,
    marginRight: 6,
  },
  checkOutButton: {
    backgroundColor: '#D6E9FF',
    paddingVertical: 14,
    borderRadius: 10,
    flex: 1,
    marginLeft: 6,
  },
  buttonText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  buttonTextCheckOut: { color: '#1E3A8A', fontSize: 16, textAlign: 'center' },
  cardDate: { marginTop: 8, fontSize: 14, color: '#000' },
  exploreTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 20,
    color: '#1E3A8A',
  },
  exploreGrid: {
    flexDirection: 'row',
    width: width * 0.85,
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  exploreTile: {
    width: '30%',
    backgroundColor: '#B3D4FC',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  exploreLabel: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
});

export default Dashboard;
