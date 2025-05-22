import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAuth } from 'firebase/auth';
import { addDoc, collection, getDocs, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase'; // Your Firebase instance

// --- Consistent Color Palette ---
const Colors = {
  primaryBlue: '#2A72B8',
  darkBlue: '#1F558C',
  lightBlue: '#C9DCEC',
  lighterBlue: '#EAF3FA',
  white: '#FFFFFF',
  black: '#212121',
  mediumGrey: '#757575',
  lightGrey: '#BDBDBD',
  successGreen: '#4CAF50',
  warningOrange: '#FF9800',
  errorRed: '#F44336',
};

// Interface for user data fetched from Firestore
interface User {
  id: string;
  name: string; // This will be the combined firstName + lastName
  firstName?: string; // Added for clarity
  lastName?: string;  // Added for clarity
  email?: string;
  role?: string;
}

const NewProjectScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = getAuth();

  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [location, setLocation] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submittingProject, setSubmittingProject] = useState(false);

  // Fetch ALL users from Firestore
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Prioritize firstName and lastName for the 'name' field
        const userName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
        fetchedUsers.push({
          id: doc.id,
          name: userName || data.email || 'Unknown User', // Fallback if names are empty
          firstName: data.firstName, // Store for completeness
          lastName: data.lastName,   // Store for completeness
          email: data.email,
          role: data.role,
        });
      });
      setUsersList(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load user list.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleUserSelection = (user: User) => {
    setSelectedUsers((prev) => {
      if (prev.some((u) => u.id === user.id)) {
        return prev.filter((u) => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleSubmit = async () => {
    if (
      !projectName.trim() ||
      !description.trim() ||
      !startDate.trim() ||
      !location.trim() ||
      selectedUsers.length === 0
    ) {
      Alert.alert(
        'Missing Fields',
        'Please fill in all fields and assign at least one user.'
      );
      return;
    }

    setSubmittingProject(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to create a project.');
        setSubmittingProject(false);
        return;
      }

      // Ensure the 'name' in assignedUsers is consistent with how it's queried
      const assignedUsersData = selectedUsers.map(u => {
        // Re-derive name from firstName/lastName if available, or use existing 'name'
        const userInList = usersList.find(user => user.id === u.id);
        const consistentName = userInList && (userInList.firstName || userInList.lastName)
          ? `${userInList.firstName || ''} ${userInList.lastName || ''}`.trim()
          : u.name; // Fallback to existing name if firstName/lastName not found

        return { id: u.id, name: consistentName };
      });

      const projectData = {
        title: projectName.trim(),
        description: description.trim(),
        startDate: startDate.trim(),
        location: location.trim(),
        status: 'In Progress',
        assignedUsers: assignedUsersData, // Use the consistently formatted names
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      };

      // --- Debugging Log ---
      console.log("Project Data being sent to Firestore:", JSON.stringify(projectData, null, 2));
      // --- End Debugging Log ---

      await addDoc(collection(db, 'projects'), projectData);

      Alert.alert('Success', `Project "${projectName.trim()}" created successfully!`);

      setProjectName('');
      setDescription('');
      setStartDate('');
      setLocation('');
      setSelectedUsers([]);

      router.back();
    } catch (error) {
      console.error('Error creating project:', error);
      Alert.alert('Error', 'Failed to create project. Please try again.');
    } finally {
      setSubmittingProject(false);
    }
  };

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);

  const handleConfirm = (date: Date) => {
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    setStartDate(formattedDate);
    hideDatePicker();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.darkBlue} />

      <LinearGradient
        colors={[Colors.primaryBlue, Colors.darkBlue]}
        style={[styles.header, { paddingTop: insets.top }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Project</Text>
        <View style={styles.rightPlaceholder} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Project Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter project name"
            placeholderTextColor={Colors.mediumGrey}
            value={projectName}
            onChangeText={setProjectName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Project Description</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
            placeholder="Enter project description"
            placeholderTextColor={Colors.mediumGrey}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity
            style={[styles.input, styles.dateInput]}
            onPress={showDatePicker}
          >
            <Text style={{ color: startDate ? Colors.black : Colors.mediumGrey }}>
              {startDate || 'Select start date'}
            </Text>
            <Feather name="calendar" size={20} color={Colors.mediumGrey} />
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            onConfirm={handleConfirm}
            onCancel={hideDatePicker}
            maximumDate={new Date(2100, 11, 31)}
            minimumDate={new Date(2000, 0, 1)}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Project location"
            placeholderTextColor={Colors.mediumGrey}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Assign to Users</Text>
          <TouchableOpacity
            style={[styles.input, styles.assignEmployeesInput]}
            onPress={() => setModalVisible(true)}
            disabled={loadingUsers}
          >
            {loadingUsers ? (
              <ActivityIndicator size="small" color={Colors.primaryBlue} />
            ) : (
              <Text style={{ color: selectedUsers.length ? Colors.black : Colors.mediumGrey }}>
                {selectedUsers.length
                  ? selectedUsers.map(u => u.name).filter(Boolean).join(', ')
                  : 'Select users'}
              </Text>
            )}
            <Feather name="users" size={20} color={Colors.mediumGrey} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submittingProject}>
          {submittingProject ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>Create Project</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal for multi-select user assignment */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Users</Text>
            {loadingUsers ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={Colors.primaryBlue} />
                <Text style={styles.modalLoadingText}>Loading users...</Text>
              </View>
            ) : usersList.length === 0 ? (
              <View style={styles.modalLoading}>
                <Feather name="alert-triangle" size={40} color={Colors.mediumGrey} />
                <Text style={styles.modalLoadingText}>No users found.</Text>
              </View>
            ) : (
              <FlatList
                data={usersList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const selected = selectedUsers.some(u => u.id === item.id);
                  return (
                    <TouchableOpacity
                      style={styles.employeeItem}
                      onPress={() => toggleUserSelection(item)}
                    >
                      <Feather
                        name={selected ? 'check-square' : 'square'}
                        size={24}
                        color={selected ? Colors.primaryBlue : Colors.mediumGrey}
                      />
                      <Text style={styles.employeeName}>{item.name}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
            <TouchableOpacity
              style={[styles.button, styles.modalDoneButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.lighterBlue,
  },
  header: {
    backgroundColor: Colors.darkBlue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    ...Platform.select({
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
  backButton: {
    paddingVertical: 10,
    paddingRight: 10,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  rightPlaceholder: {
    width: 28,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkBlue,
    marginBottom: 8,
  },
  input: {
    minHeight: 50,
    borderColor: Colors.lightGrey,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: Colors.white,
    fontSize: 16,
    color: Colors.black,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignEmployeesInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    backgroundColor: Colors.primaryBlue,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primaryBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  buttonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 25,
    width: '90%',
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkBlue,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  modalLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.mediumGrey,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lighterBlue,
  },
  employeeName: {
    fontSize: 16,
    marginLeft: 15,
    color: Colors.black,
  },
  modalDoneButton: {
    marginTop: 20,
    backgroundColor: Colors.darkBlue,
  }
});

export default NewProjectScreen;
