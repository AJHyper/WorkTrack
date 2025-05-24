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
import { db } from '../config/firebase';

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

interface User {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

export default function NewProjectScreen() {
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

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const userName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
        fetchedUsers.push({
          id: doc.id,
          name: userName || data.email || 'Unknown User',
          firstName: data.firstName,
          lastName: data.lastName,
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
      Alert.alert('Missing Fields', 'Please fill in all fields and assign at least one user.');
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

      const assignedUsersData = selectedUsers.map(u => {
        const userInList = usersList.find(user => user.id === u.id);
        const consistentName = userInList && (userInList.firstName || userInList.lastName)
          ? `${userInList.firstName || ''} ${userInList.lastName || ''}`.trim()
          : u.name;

        return { id: u.id, name: consistentName };
      });

      const projectData = {
        title: projectName.trim(),
        description: description.trim(),
        startDate: startDate.trim(),
        location: location.trim(),
        status: 'In Progress',
        assignedUsers: assignedUsersData,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      };

      await addDoc(collection(db, 'projects'), projectData);

      Alert.alert('Success', `Project "${projectName.trim()}" created successfully!`);

      // Reset form
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
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Feather name="arrow-left" size={28} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Project</Text>
          <View style={styles.rightPlaceholder} />
        </View>
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
          <TouchableOpacity style={[styles.input, styles.dateInput]} onPress={showDatePicker}>
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

        <TouchableOpacity
          onPress={handleSubmit}
          style={styles.button}
          activeOpacity={0.8}
          disabled={submittingProject}
        >
          {submittingProject ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.buttonText}>Create Project</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Users</Text>

            {loadingUsers ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={Colors.primaryBlue} />
                <Text style={styles.modalLoadingText}>Loading users...</Text>
              </View>
            ) : (
              <FlatList
                data={usersList}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const selected = selectedUsers.some(u => u.id === item.id);
                  return (
                    <TouchableOpacity
                      onPress={() => toggleUserSelection(item)}
                      style={styles.employeeItem}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          { backgroundColor: selected ? Colors.primaryBlue : Colors.lightGrey },
                        ]}
                      >
                        {selected && <Feather name="check" size={18} color={Colors.white} />}
                      </View>
                      <Text style={styles.employeeName}>{item.name}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <TouchableOpacity
              style={[styles.button, styles.modalDoneButton]}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.lighterBlue,
  },
  gradientBackground: {
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  rightPlaceholder: {
    width: 34, // To balance back button size on right side
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontWeight: '600',
    fontSize: 16,
    color: Colors.black,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    color: Colors.black,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
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
    backgroundColor:Colors.primaryBlue,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: Colors.primaryBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    },
    buttonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 18,
    },
    modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    paddingHorizontal: 24,
    },
    modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    maxHeight: '80%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    },
    modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
    color: Colors.primaryBlue,
    textAlign: 'center',
    },
    modalLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    },
    modalLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.mediumGrey,
    },
    employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomColor: Colors.lightGrey,
    borderBottomWidth: 0.5,
    },
    checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: Colors.lightGrey,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    },
    employeeName: {
    fontSize: 16,
    color: Colors.black,
    },
    modalDoneButton: {
    marginTop: 12,
    },
    });
