import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

const { width, height } = Dimensions.get('window');

interface DashboardProps {
  firstName: string; // from profile page
  lastName: string;  // from profile page
  profileImageUri?: string; // optional profile image URI from profile page
}

const Dashboard: React.FC<DashboardProps> = ({ firstName, lastName, profileImageUri }) => {
  const router = useRouter();
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);

  const handleCheckIn = () => {
    if (checkInTime && !checkOutTime) {
      Alert.alert('Already checked in', 'You have already checked in and not checked out yet.');
      return;
    }
    setCheckInTime(new Date());
    setCheckOutTime(null);
  };

  const handleCheckOut = () => {
    if (!checkInTime) {
      Alert.alert('Check in first', 'Please check in before checking out.');
      return;
    }
    if (checkOutTime) {
      Alert.alert('Already checked out', 'You have already checked out.');
      return;
    }
    setCheckOutTime(new Date());
  };

  const calculateHoursWorked = () => {
    if (checkInTime && checkOutTime) {
      const diff = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      return diff.toFixed(2);
    }
    return '0';
  };

  const currentDate = new Date().toLocaleDateString();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />

      {/* Blue Circular Header */}
      <View style={styles.headerBackground} />

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          router.push('/auth/Login');
          Alert.alert('Logged out', 'You have successfully logged out.');
        }}
        accessibilityLabel="Log out"
        accessibilityRole="button"
      >
        <Feather name="log-out" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Image
            source={
              profileImageUri
                ? { uri: profileImageUri }
                : require('../../assets/images/Profile.png')
            }
            style={styles.avatar}
          />
          <Text style={styles.name}>{firstName} {lastName}</Text>
        </View>

        {/* Work Hours Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total hours worked today</Text>
          <Text style={styles.cardValue}>{calculateHoursWorked()} Hours</Text>

          <Text style={styles.timeLabel}>Checked In at: {checkInTime ? checkInTime.toLocaleTimeString() : '--'}</Text>
          <Text style={styles.timeLabel}>Checked Out at: {checkOutTime ? checkOutTime.toLocaleTimeString() : '--'}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.checkInButton}
              onPress={handleCheckIn}
              accessibilityLabel="Check in for work"
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Check In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkOutButton, !checkInTime && { opacity: 0.5 }]}
              onPress={handleCheckOut}
              disabled={!checkInTime}
              accessibilityLabel="Check out from work"
              accessibilityRole="button"
            >
              <Text style={styles.buttonTextCheckOut}>Check Out</Text>
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
            accessibilityLabel="Go to Profile"
            accessibilityRole="button"
          >
            <Feather name="user" size={24} color="#1E3A8A" />
            <Text style={styles.exploreLabel}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exploreTile}
            onPress={() => router.push('/IndividualAttendance')}
            accessibilityLabel="View my logs"
            accessibilityRole="button"
          >
            <Feather name="calendar" size={24} color="#1E3A8A" />
            <Text style={styles.exploreLabel}>My Logs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exploreTile}
            onPress={() => router.push('/ProjectDetails')}
            accessibilityLabel="View tasks"
            accessibilityRole="button"
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
  container: {
    flex: 1,
    backgroundColor: '#E6F0FF',
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
  profileSection: {
    marginTop: height * 0.07,
    alignItems: 'center',
  },
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
  cardLabel: {
    fontSize: 16,
    color: '#000',
  },
  cardValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginVertical: 10,
  },
  timeLabel: {
    fontSize: 14,
    color: '#000',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
  },
  checkInButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 1,
    marginRight: 6,
  },
  checkOutButton: {
    backgroundColor: '#D6E9FF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 1,
    marginLeft: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  buttonTextCheckOut: {
    color: '#1E3A8A',
    fontSize: 16,
    textAlign: 'center',
  },
  cardDate: {
    marginTop: 8,
    fontSize: 14,
    color: '#000',
  },
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
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    width: (width * 0.85 - 24) / 3,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  exploreLabel: {
    marginTop: 8,
    fontSize: 13,
    color: '#1E3A8A',
    textAlign: 'center',
  },
});

export default Dashboard;
