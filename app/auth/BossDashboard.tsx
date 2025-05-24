import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'; // <--- Corrected this line

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

const { width, height } = Dimensions.get('window');

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
  const [profilePictureBase64, setProfilePictureBase64] = useState<string | null>(null);

  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);

  const [loading, setLoading] = useState(true);
  const [isOperationInProgress, setIsOperationInProgress] = useState(false); // New state for overall operation

  const getTodayKey = () => new Date().toISOString().slice(0, 10);

  const formatTimeForDisplay = useCallback((date: Date | null): string => {
    return date
      ? date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : '--:--';
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

      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setProfilePictureBase64(data.profilePicture || null);
      } else {
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
        setProfilePictureBase64(null);
      }

      const attRef = doc(db, 'attendance', uid, 'daily', getTodayKey());
      const attSnap = await getDoc(attRef);

      if (attSnap.exists()) {
        const { checkInTime: ci, checkOutTime: co } = attSnap.data();

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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // --- Helper function to pick and upload image ---
  const pickAndUploadImage = async () => {
    setIsOperationInProgress(true); // Disable other buttons
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Sorry, we need camera roll permissions to change your profile picture!'
      );
      setIsOperationInProgress(false); // Re-enable if permission denied
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3, // VERY IMPORTANT: Compress heavily to stay within Firestore 1MB limit
      base64: true,
    });

    if (result.canceled) {
      setIsOperationInProgress(false); // Re-enable if cancelled
      return;
    }

    if (result.assets && result.assets.length > 0) {
      const selectedImage = result.assets[0];
      const base64String = selectedImage.base64;

      if (!base64String) {
        Alert.alert('Error', 'Could not get image data in Base64 format.');
        setIsOperationInProgress(false); // Re-enable if no base64
        return;
      }

      const dataUri = `data:image/jpeg;base64,${base64String}`; // Assuming JPEG after compression

      try {
        if (userId) {
          const userDocRef = doc(db, 'users', userId);
          await updateDoc(userDocRef, {
            profilePicture: dataUri,
            updatedAt: serverTimestamp(),
          });
          setProfilePictureBase64(dataUri);
          Alert.alert('Success', 'Profile picture updated!');
        } else {
          Alert.alert('Error', 'User not identified. Please log in again.');
        }
      } catch (error: any) {
        console.error('Error uploading profile picture:', error);
        if (error.code === 'resource-exhausted') {
          Alert.alert(
            'Error',
            'Image is too large. Please select a smaller image or reduce quality further.'
          );
        } else {
          Alert.alert('Error', 'Failed to upload profile picture: ' + error.message);
        }
      } finally {
        setIsOperationInProgress(false); // Re-enable buttons
      }
    } else {
      setIsOperationInProgress(false); // Re-enable if no assets found
    }
  };

  // --- Handle Delete Profile Picture ---
  const handleDeleteProfilePicture = async () => {
    if (!userId) {
      Alert.alert('Error', 'User not identified. Please log in again.');
      return;
    }

    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete your profile picture?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsOperationInProgress(true); // Disable other buttons during deletion
            try {
              const userDocRef = doc(db, 'users', userId);
              await updateDoc(userDocRef, {
                profilePicture: null, // Set to null to remove the image
                updatedAt: serverTimestamp(),
              });
              setProfilePictureBase64(null); // Update UI
              Alert.alert('Success', 'Profile picture deleted!');
            } catch (error) {
              console.error('Error deleting profile picture:', error);
              Alert.alert('Error', 'Failed to delete profile picture.');
            } finally {
              setIsOperationInProgress(false); // Re-enable buttons
            }
          },
        },
      ]
    );
  };

  // --- Main handler for avatar Pressable ---
  const handleAvatarPress = () => {
    // Only allow avatar press if no operation is in progress
    if (isOperationInProgress) return;

    Alert.alert(
      'Profile Picture Options',
      'What would you like to do?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Choose New Photo',
          onPress: pickAndUploadImage,
        },
        // Only show delete option if a photo exists
        profilePictureBase64
          ? {
              text: 'Delete Photo',
              onPress: handleDeleteProfilePicture,
              style: 'destructive',
            }
          : {}, // Empty object for non-existent option
      ],
      { cancelable: true }
    );
  };

  // --- Handle Check-In ---
  const handleCheckIn = async () => {
    if (isOperationInProgress) return; // Prevent multiple operations

    if (!userId) {
      Alert.alert('Error', 'User not identified. Please log in again.');
      return;
    }

    if (checkInTime) {
      Alert.alert(
        'Already checked in',
        'You have already checked in for today. Only one check-in per day is allowed.'
      );
      return;
    }

    setIsOperationInProgress(true); // Disable other buttons
    const now = new Date();

    try {
      await setDoc(
        doc(db, 'attendance', userId, 'daily', getTodayKey()),
        {
          checkInTime: serverTimestamp(),
          checkOutTime: null,
          updatedAt: serverTimestamp(),
          employeeId: userId,
        },
        { merge: true }
      );
      setCheckInTime(now);
      setCheckOutTime(null);
      Alert.alert('Check-in Successful', `You checked in at ${formatTimeForDisplay(now)}.`);
    } catch (err) {
      console.error('Error saving check-in:', err);
      Alert.alert('Error', 'Could not save check-in. Please try again.');
    } finally {
      setIsOperationInProgress(false); // Re-enable buttons
    }
  };

  // --- Handle Check-Out ---
  const handleCheckOut = async () => {
    if (isOperationInProgress) return; // Prevent multiple operations

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

    setIsOperationInProgress(true); // Disable other buttons
    const now = new Date();

    try {
      await updateDoc(
        doc(db, 'attendance', userId, 'daily', getTodayKey()),
        {
          checkOutTime: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
      setCheckOutTime(now);
      Alert.alert('Check-out Successful', `You checked out at ${formatTimeForDisplay(now)}.`);
    } catch (err) {
      console.error('Error saving check-out:', err);
      Alert.alert('Error', 'Could not save check-out. Please try again.');
    } finally {
      setIsOperationInProgress(false); // Re-enable buttons
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
    if (isOperationInProgress) return; // Prevent navigation during operation
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

  // --- New handlers for the added buttons ---
  const handleNewProjectPress = () => {
    if (isOperationInProgress) return;
    router.push('/NewProject');
  };

  const handleAllLogsPress = () => {
    if (isOperationInProgress) return;
    router.push('/EmpAttendance');
  };

  const handleAllProjectsPress = () => {
    if (isOperationInProgress) return;
    router.push('/AllProjects');
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
        disabled={isOperationInProgress} // Disable logout during operation
      >
        <Feather name="log-out" size={24} color={Colors.white} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.profileSection}>
          {/* Profile Picture Display with Options */}
          <Pressable
            onPress={handleAvatarPress}
            style={styles.avatarContainer}
            disabled={isOperationInProgress} // Disable avatar press during operation
          >
            {isOperationInProgress ? (
              <ActivityIndicator size="large" color={Colors.primaryBlue} />
            ) : profilePictureBase64 ? (
              <Image source={{ uri: profilePictureBase64 }} style={styles.profileImage} />
            ) : (
              <View style={styles.defaultAvatar}>
                <Feather name="user" size={width * 0.25} color={Colors.primaryBlue} />
              </View>
            )}
            <View style={styles.editIconContainer}>
              <Feather name="edit-2" size={18} color={Colors.white} />
            </View>
          </Pressable>

          <Text style={styles.name}>
            {firstName} {lastName}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total hours today</Text>
          {loading && !checkInTime && !checkOutTime ? (
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
                (isOperationInProgress || !!checkInTime) && { opacity: 0.6 }, // Disable if any operation is in progress or already checked in
              ]}
              onPress={handleCheckIn}
              disabled={isOperationInProgress || !!checkInTime} // Disable if any operation is in progress or already checked in
            >
              <Text style={styles.buttonText}>
                {isOperationInProgress && !checkInTime ? ( // Show activity indicator only for check-in during operation
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  'Check In'
                )}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.checkOutButton,
                (isOperationInProgress || !checkInTime || !!checkOutTime) && { opacity: 0.6 }, // Disable if any operation is in progress or not checked in or already checked out
              ]}
              onPress={handleCheckOut}
              disabled={isOperationInProgress || !checkInTime || !!checkOutTime} // Disable if any operation is in progress or not checked in or already checked out
            >
              <Text style={styles.buttonTextCheckOut}>
                {isOperationInProgress && checkInTime && !checkOutTime ? ( // Show activity indicator only for check-out during operation
                  <ActivityIndicator color={Colors.primaryBlue} />
                ) : (
                  'Check Out'
                )}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.cardDate}>Date: {currentDate}</Text>
        </View>

        <Text style={styles.exploreTitle}>Explore</Text>
        <View style={styles.exploreGrid}>
          <TouchableOpacity
            style={[styles.exploreTile, isOperationInProgress && { opacity: 0.6 }]}
            onPress={() => router.push('/Profile')}
            disabled={isOperationInProgress}
          >
            <Feather name="user" size={24} color={Colors.darkBlue} />
            <Text style={styles.exploreLabel}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exploreTile, isOperationInProgress && { opacity: 0.6 }]}
            onPress={handleMyLogsPress}
            disabled={isOperationInProgress}
          >
            <Feather name="calendar" size={24} color={Colors.darkBlue} />
            <Text style={styles.exploreLabel}>My Logs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exploreTile, isOperationInProgress && { opacity: 0.6 }]}
            onPress={() => router.push('/ProjectDetails')}
            disabled={isOperationInProgress}
          >
            <Feather name="briefcase" size={24} color={Colors.darkBlue} />
            <Text style={styles.exploreLabel}>Tasks</Text>
          </TouchableOpacity>

          {/* New Buttons */}
          <TouchableOpacity
            style={[styles.exploreTile, isOperationInProgress && { opacity: 0.6 }]}
            onPress={handleNewProjectPress}
            disabled={isOperationInProgress}
          >
            <Feather name="plus-circle" size={24} color={Colors.darkBlue} />
            <Text style={styles.exploreLabel}>New Project</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exploreTile, isOperationInProgress && { opacity: 0.6 }]}
            onPress={handleAllLogsPress}
            disabled={isOperationInProgress}
          >
            <Feather name="list" size={24} color={Colors.darkBlue} />
            <Text style={styles.exploreLabel}>All Logs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exploreTile, isOperationInProgress && { opacity: 0.6 }]}
            onPress={handleAllProjectsPress}
            disabled={isOperationInProgress}
          >
            <Feather name="folder" size={24} color={Colors.darkBlue} />
            <Text style={styles.exploreLabel}>All Projects</Text>
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
  avatarContainer: {
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
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: width * 0.2,
    resizeMode: 'cover',
  },
  defaultAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: width * 0.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: Colors.primaryBlue,
    borderRadius: 15,
    padding: 6,
    zIndex: 1,
  },
  name: {
    marginTop: 0,
    fontSize: width * 0.07,
    color: Colors.white,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
    width: '30%', // Adjust width if you want more items per row or different spacing
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15, // Added margin for spacing between rows
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