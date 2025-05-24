import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

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

interface AttendanceItem {
  id: string;
  date: string;
  day: string;
  name: string;
  status: 'Present' | 'Absent';
  checkInTime: string;
  checkOutTime: string;
  hours: string;
}

const EmpAttendance: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Helper to format Date object to YYYY-MM-DD string for Firestore document IDs
  const formatDateKey = (date: Date) => date.toISOString().slice(0, 10);

  // Helper to format Date object to DD-MM-YY string for display
  const formatDateForDisplay = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  // Helper to format time for display
  const formatTimeForDisplay = useCallback((date: Date | null): string => {
    return date ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
  }, []);

  // Helper to calculate hours worked
  const calculateHoursWorked = useCallback((checkIn: Date | null, checkOut: Date | null): string => {
    if (!checkIn || isNaN(checkIn.getTime())) {
      return '0.00';
    }
    const actualCheckOut = checkOut && !isNaN(checkOut.getTime()) ? checkOut : new Date();

    const diff = (actualCheckOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    return diff >= 0 ? diff.toFixed(2) : '0.00';
  }, []);

  // --- Main data loading function ---
  const loadAllEmployeeAttendance = useCallback(async () => {
    setLoading(true);
    setAttendanceData([]);

    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const selectedDateKey = formatDateKey(selectedDate);
      const dayOfWeek = selectedDate.toLocaleDateString('en-GB', { weekday: 'long' });

      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const employees: { uid: string; firstName: string; lastName: string }[] = [];
      usersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        employees.push({
          uid: docSnap.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
        });
      });

      const fetchedAttendance: AttendanceItem[] = [];

      for (const employee of employees) {
        const attendanceDocRef = doc(db, 'attendance', employee.uid, 'daily', selectedDateKey);
        const attendanceSnap = await getDoc(attendanceDocRef);

        let status: 'Present' | 'Absent' = 'Absent';
        let checkInDateObj: Date | null = null;
        let checkOutDateObj: Date | null = null;
        let hours = '0.00';

        if (attendanceSnap.exists()) {
          const data = attendanceSnap.data();

          if (data.checkInTime instanceof Timestamp) {
            checkInDateObj = data.checkInTime.toDate();
          } else if (typeof data.checkInTime === 'string') {
            const parsed = new Date(data.checkInTime);
            if (!isNaN(parsed.getTime())) checkInDateObj = parsed;
          }

          if (data.checkOutTime instanceof Timestamp) {
            checkOutDateObj = data.checkOutTime.toDate();
          } else if (typeof data.checkOutTime === 'string') {
            const parsed = new Date(data.checkOutTime);
            if (!isNaN(parsed.getTime())) checkOutDateObj = parsed;
          }

          if (checkInDateObj) {
            const calculatedHours = parseFloat(calculateHoursWorked(checkInDateObj, checkOutDateObj));
            if (checkOutDateObj === null || calculatedHours > 0) {
              status = 'Present';
              hours = calculatedHours.toFixed(2);
            } else {
              status = 'Absent';
              hours = '0.00';
            }
          }
        }

        fetchedAttendance.push({
          id: employee.uid,
          date: formatDateForDisplay(selectedDate), // Still needed internally for fetching, but hidden in UI
          day: dayOfWeek,
          name: `${employee.firstName} ${employee.lastName}`.trim(),
          status: status,
          checkInTime: formatTimeForDisplay(checkInDateObj),
          checkOutTime: formatTimeForDisplay(checkOutDateObj),
          hours: hours,
        });
      }

      fetchedAttendance.sort((a, b) => a.name.localeCompare(b.name));

      setAttendanceData(fetchedAttendance);
    } catch (error) {
      console.error('Error loading all employee attendance:', error);
      Alert.alert('Error', 'Failed to load employee attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, currentUser, calculateHoursWorked, formatTimeForDisplay]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        router.push('/auth/Login');
      }
    });
    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      loadAllEmployeeAttendance();
    }
  }, [currentUser, selectedDate, loadAllEmployeeAttendance]);

  const onChangeDate = (event: any, selectedDateValue?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDateValue) {
      setSelectedDate(selectedDateValue);
    }
  };

  const goBack = () => {
    router.back();
  };

  const renderItem = ({ item }: { item: AttendanceItem }) => (
    <View style={styles.dataRow}>
      {/* Date column is effectively hidden by styling */}
      <Text style={[styles.dataText, styles.columnDate]}></Text>
      {item.day ? <Text style={[styles.dataText, styles.columnDay]}>{item.day.slice(0, 3)}</Text> : null}
      {item.name ? <Text style={[styles.dataText, styles.columnName]}>{item.name}</Text> : null}
      {item.status ? (
        <Text
          style={[
            styles.dataText,
            styles.columnStatus,
            { color: item.status === 'Present' ? Colors.primaryBlue : Colors.mediumGrey },
          ]}
        >
          {item.status}
        </Text>
      ) : null}
      {item.hours ? <Text style={[styles.dataText, styles.columnHours]}>{item.hours}</Text> : null}
    </View>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.darkBlue} />

      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={[Colors.primaryBlue, Colors.darkBlue]}
          style={[styles.header, { paddingTop: insets.top }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Feather name="arrow-left" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Team Attendance</Text>
          <View style={styles.rightPlaceholder} />
        </LinearGradient>

        <View style={styles.container}>
          <View style={styles.filters}>
            <TextInput
              style={styles.input}
              placeholder="Search by name"
              placeholderTextColor={Colors.mediumGrey}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={styles.datePickerButton}
              activeOpacity={0.7}
            >
              <Text style={styles.datePickerText}>{formatDateForDisplay(selectedDate)}</Text>
              <Feather name="calendar" size={20} color={Colors.primaryBlue} />
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={onChangeDate}
                maximumDate={new Date()}
              />
            )}
          </View>

          <View style={styles.tableHeader}>
            {/* Hidden Date Header */}
            <Text style={[styles.headerText, styles.columnDate]}></Text>
            <Text style={[styles.headerText, styles.columnDay]}>Day</Text>
            <Text style={[styles.headerText, styles.columnNameHeader]}>Name</Text> {/* New style for header name */}
            <Text style={[styles.headerText, styles.columnStatus]}>Status</Text>
            <Text style={[styles.headerText, styles.columnHours]}>Hours</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primaryBlue} style={styles.loadingIndicator} />
          ) : attendanceData.length > 0 ? (
            <FlatList
              data={attendanceData.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.flatListContent}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <Text style={styles.noDataText}>No attendance data found for this date.</Text>
          )}
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.lighterBlue,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 56 + (Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0),
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
    padding: 8,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  rightPlaceholder: {
    width: 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: 15,
    marginTop: 15,
  },
  filters: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderColor: Colors.lightGrey,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 10,
    color: Colors.black,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  datePickerButton: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderColor: Colors.lightGrey,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  datePickerText: {
    fontSize: 16,
    color: Colors.black,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryBlue,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 8,
    paddingHorizontal: 10,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 13,
    color: Colors.white,
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderRadius: 10,
    marginBottom: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  dataText: {
    fontSize: 13,
    color: Colors.black,
    textAlign: 'left',
  },
  columnDate: {
    width: 0, // Effectively hides the column
    marginHorizontal: 0, // Removes any horizontal margin
  },
  columnDay: {
    flex: 1,
    textAlign: 'center',
  },
  columnName: {
    flex: 2,
    paddingLeft: 5, // Consistent padding
    textAlign: 'left', // Ensure alignment
  },
  columnNameHeader: {
    flex: 2,
    paddingLeft: 5, // Match padding of data rows for perfect alignment
    textAlign: 'left', // Ensure it aligns with data rows
  },
  columnStatus: {
    flex: 1.5,
    textAlign: 'center',
    fontWeight: '600',
  },
  columnHours: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '600',
  },
  loadingIndicator: {
    marginTop: 50,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: Colors.mediumGrey,
  },
  flatListContent: {
    paddingBottom: 20,
  },
});

export default EmpAttendance;