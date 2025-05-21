import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
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

const employeesList = [
  'Alice Johnson',
  'Bob Smith',
  'Charlie Davis',
  'Diana Evans',
  'Ethan Clark',
];

const NewProjectScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [location, setLocation] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // State for date picker visibility
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const toggleEmployeeSelection = (name: string) => {
    setSelectedEmployees((prev) => {
      if (prev.includes(name)) {
        return prev.filter((emp) => emp !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  const handleSubmit = () => {
    if (
      !projectName.trim() ||
      !description.trim() ||
      !startDate.trim() ||
      !location.trim() ||
      selectedEmployees.length === 0
    ) {
      Alert.alert(
        'Missing Fields',
        'Please fill in all fields and assign at least one employee.'
      );
      return;
    }

    Alert.alert(
      'Project Created',
      `Project "${projectName.trim()}" assigned to ${selectedEmployees.join(
        ', '
      )} has been saved.`
    );

    // Clear form
    setProjectName('');
    setDescription('');
    setStartDate('');
    setLocation('');
    setSelectedEmployees([]);
  };

  // Show date picker
  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  // Hide date picker
  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  // Handle date picked from calendar
  const handleConfirm = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are zero indexed
    const year = date.getFullYear();
    setStartDate(`${day}-${month}-${year}`);
    hideDatePicker();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#003399" />
      <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Project</Text>
        <View style={styles.rightPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Project Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter project name"
            value={projectName}
            onChangeText={setProjectName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Project Description</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Enter project description"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity
            style={[styles.input, { justifyContent: 'center' }]}
            onPress={showDatePicker}
          >
            <Text style={{ color: startDate ? '#000' : '#888' }}>
              {startDate || 'Select start date'}
            </Text>
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
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Assign to Employees</Text>
          <TouchableOpacity
            style={[styles.input, { justifyContent: 'center' }]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={{ color: selectedEmployees.length ? '#000' : '#888' }}>
              {selectedEmployees.length
                ? selectedEmployees.join(', ')
                : 'Select employees'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Create Project</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal for multi-select */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Employees</Text>
            <FlatList
              data={employeesList}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const selected = selectedEmployees.includes(item);
                return (
                  <TouchableOpacity
                    style={styles.employeeItem}
                    onPress={() => toggleEmployeeSelection(item)}
                  >
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={selected ? '#1976D2' : '#555'}
                    />
                    <Text style={styles.employeeName}>{item}</Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={[styles.button, { marginTop: 10 }]}
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
    backgroundColor: '#E8F0FE',
  },
  header: {
    backgroundColor: '#003399',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    height: 56,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  rightPlaceholder: {
    width: 32,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#1976D2',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  employeeName: {
    fontSize: 16,
    marginLeft: 12,
  },
});

export default NewProjectScreen;
