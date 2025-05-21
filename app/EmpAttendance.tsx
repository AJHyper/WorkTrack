import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AttendanceItem = {
  date: string;
  day: string;
  name: string;
  status: 'Present' | 'Absent';
  hours: number;
};

const mockAttendanceData: AttendanceItem[] = [
  { date: '28-04-2025', day: 'Monday', name: 'Alfred Jokelin', status: 'Present', hours: 8.5 },
  { date: '28-04-2025', day: 'Monday', name: 'John Doe', status: 'Absent', hours: 0 },
  { date: '28-04-2025', day: 'Monday', name: 'Jane Smith', status: 'Present', hours: 9 },
];

const EmpAttendance: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date('2025-04-28'));
  const [showPicker, setShowPicker] = useState<boolean>(false);

  // Format Date object to DD-MM-YYYY string
  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const selectedDate = formatDate(date);

  const filteredData = mockAttendanceData.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      item.date === selectedDate
  );

  const onChangeDate = (event: any, selectedDateValue?: Date) => {
    setShowPicker(Platform.OS === 'ios'); // iOS keeps it open, Android closes after selection
    if (selectedDateValue) {
      setDate(selectedDateValue);
    }
  };

  const goBack = () => {
    router.back();
  };

  return (
    <>
      {/* Match StatusBar from AttendanceDetailsScreen */}
      <StatusBar barStyle="light-content" backgroundColor="#003399" />

      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Feather name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Employee Attendance</Text>
          <View style={styles.rightPlaceholder} />
        </View>

        <View style={styles.container}>
          <View style={styles.filters}>
            <TextInput
              style={styles.input}
              placeholder="Search by name"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={styles.datePickerButton}
              activeOpacity={0.7}
            >
              <Text style={styles.datePickerText}>{selectedDate}</Text>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onChangeDate}
                maximumDate={new Date()} // optional, restrict future dates
              />
            )}
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { flex: 2 }]}>Date</Text>
            <Text style={[styles.headerText, { flex: 2 }]}>Day</Text>
            <Text style={[styles.headerText, { flex: 3 }]}>Name</Text>
            <Text style={[styles.headerText, { flex: 2, textAlign: 'center' }]}>Status</Text>
            <Text style={[styles.headerText, { flex: 2, textAlign: 'center' }]}>Hours</Text>
          </View>

          <FlatList
            data={filteredData}
            keyExtractor={(item, index) => item.name + index}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }: { item: AttendanceItem }) => (
              <View style={styles.dataRow}>
                <Text style={[styles.dataText, { flex: 2 }]}>{item.date}</Text>
                <Text style={[styles.dataText, { flex: 2 }]}>{item.day}</Text>
                <Text style={[styles.dataText, { flex: 3 }]}>{item.name}</Text>
                <Text
                  style={[
                    styles.dataText,
                    {
                      flex: 2,
                      textAlign: 'center',
                      color: item.status === 'Present' ? 'green' : 'red',
                    },
                  ]}
                >
                  {item.status}
                </Text>
                <Text style={[styles.dataText, { flex: 2, textAlign: 'center' }]}>{item.hours}</Text>
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E6F0FF', // same as AttendanceDetailsScreen background
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
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  filters: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    fontSize: 14,
    marginBottom: 10,
  },
  datePickerButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
  },
  datePickerText: {
    fontSize: 14,
    color: '#333',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#333',
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  dataText: {
    fontSize: 12,
    color: '#555',
  },
});

export default EmpAttendance;
