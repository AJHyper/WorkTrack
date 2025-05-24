import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const { width } = Dimensions.get('window');

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

interface AttendanceRecord {
  id: string;
  date: string;
  day: string;
  checkInTime: string;
  checkOutTime: string;
  hoursWorked: string;
}

const MonthlyAttendance: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<User | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const formatDateKey = (date: Date) => date.toISOString().slice(0, 10);

  const calculateHoursWorked = useCallback((checkIn: Date | null, checkOut: Date | null): string => {
    if (!checkIn || !checkOut || isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return '0.00';
    }
    const diff = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    return diff >= 0 ? diff.toFixed(2) : '0.00';
  }, []);

  const loadMonthlyAttendance = useCallback(async (month: Date) => {
    setLoading(true);
    setAttendanceData([]);

    const userId = user?.uid;
    if (!userId) {
      console.log('No user ID found. Redirecting to login.');
      setLoading(false);
      return;
    }
    console.log('Loading attendance for user ID:', userId);

    try {
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0); // Correctly gets the last day of the month

      const startKey = formatDateKey(startOfMonth);
      // Ensure endKey accurately reflects the last day of the month (e.g., 2025-05-31 for May)
      const endKey = `${endOfMonth.getFullYear()}-${(endOfMonth.getMonth() + 1).toString().padStart(2, '0')}-${endOfMonth.getDate().toString().padStart(2, '0')}`;

      console.log('Querying for month:', month.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
      console.log('Start Date Key (Inclusive):', startKey);
      console.log('End Date Key (Inclusive):', endKey);

      const q = query(
        collection(db, 'attendance', userId, 'daily'),
        where('__name__', '>=', startKey),
        where('__name__', '<=', endKey),
        orderBy('__name__', 'asc')
      );

      const querySnapshot = await getDocs(q);

      console.log('Query Snapshot Empty:', querySnapshot.empty);
      console.log('Number of documents found:', querySnapshot.size);

      const fetchedData: AttendanceRecord[] = [];

      if (querySnapshot.empty) {
        console.log('No attendance records found for this month and user.');
      }

      querySnapshot.forEach((docSnap) => {
        const docId = docSnap.id;
        const data = docSnap.data();

        console.log(`--- Processing document ID: ${docId} ---`);
        console.log('Raw Firestore Data:', data);

        let checkInDateObj: Date | null = null;
        let checkOutDateObj: Date | null = null;

        // Attempt to convert from Timestamp object first
        if (data.checkInTime instanceof Timestamp) {
          checkInDateObj = data.checkInTime.toDate();
        } else if (typeof data.checkInTime === 'string') {
          // If it's a string, parse it using new Date()
          const parsedDate = new Date(data.checkInTime);
          if (!isNaN(parsedDate.getTime())) {
            checkInDateObj = parsedDate;
          } else {
            console.warn(`Could not parse checkInTime string: ${data.checkInTime}`);
          }
        }

        if (data.checkOutTime instanceof Timestamp) {
          checkOutDateObj = data.checkOutTime.toDate();
        } else if (typeof data.checkOutTime === 'string') {
          const parsedDate = new Date(data.checkOutTime);
          if (!isNaN(parsedDate.getTime())) {
            checkOutDateObj = parsedDate;
          } else {
            console.warn(`Could not parse checkOutTime string: ${data.checkOutTime}`);
          }
        }

        console.log('checkInDateObj (converted):', checkInDateObj);
        console.log('checkOutDateObj (converted):', checkOutDateObj);

        const hours = calculateHoursWorked(checkInDateObj, checkOutDateObj);
        console.log('Calculated Hours:', hours);

        fetchedData.push({
          id: docId,
          date: new Date(docId).toLocaleDateString('en-GB'),
          day: new Date(docId).toLocaleDateString('en-GB', { weekday: 'short' }),
          checkInTime: checkInDateObj ? checkInDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--',
          checkOutTime: checkOutDateObj ? checkOutDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--',
          hoursWorked: hours,
        });
      });

      setAttendanceData(fetchedData);
      console.log('Final fetchedData for display:', fetchedData);

    } catch (error) {
      console.error('Error loading monthly attendance:', error);
      Alert.alert('Error', 'Failed to load monthly attendance. Please check your internet connection or try again later.');
    } finally {
      setLoading(false);
    }
  }, [user, calculateHoursWorked]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      if (usr) {
        setUser(usr);
        console.log('Auth state changed: User is logged in.', usr.uid);
      } else {
        setUser(null);
        console.log('Auth state changed: User is logged out. Redirecting.');
        router.push('/auth/Login');
      }
    });
    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (user) {
      loadMonthlyAttendance(currentMonth);
    } else {
      setAttendanceData([]);
      setLoading(false);
    }
  }, [user, currentMonth, loadMonthlyAttendance]);

  const goBack = () => {
    router.back();
  };

  const goToPreviousMonth = () => {
    setCurrentMonth((prevMonth) => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(prevMonth.getMonth() - 1);
      return newMonth;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth((prevMonth) => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(prevMonth.getMonth() + 1);
      return newMonth;
    });
  };

  const renderItem = ({ item }: { item: AttendanceRecord }) => (
    <View style={styles.dataRow}>
      <Text style={[styles.dataText, styles.columnDate]}>{item.date}</Text>
      <Text style={[styles.dataText, styles.columnDay]}>{item.day}</Text>
      <Text style={[styles.dataText, styles.columnTime]}>{item.checkInTime}</Text>
      <Text style={[styles.dataText, styles.columnTime]}>{item.checkOutTime}</Text>
      <Text style={[styles.dataText, styles.columnHours]}>{item.hoursWorked}</Text>
    </View>
  );

  const formattedMonthYear = currentMonth.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.darkBlue} />

      <LinearGradient
        colors={[Colors.primaryBlue, Colors.darkBlue]}
        style={[styles.header, { paddingTop: insets.top, height: 60 + insets.top }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={{ position: 'absolute', left: 16, top: insets.top + 10 }}
          onPress={goBack}
        >
          <Feather name="arrow-left" size={28} color={Colors.white} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Monthly Attendance</Text>
      </LinearGradient>

      <View style={styles.container}>
        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={goToPreviousMonth}>
            <Feather name="chevron-left" size={26} color={Colors.primaryBlue} />
          </TouchableOpacity>
          <Text style={styles.monthText}>{formattedMonthYear}</Text>
          <TouchableOpacity onPress={goToNextMonth}>
            <Feather name="chevron-right" size={26} color={Colors.primaryBlue} />
          </TouchableOpacity>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.columnDate]}>Date</Text>
          <Text style={[styles.headerText, styles.columnDay]}>Day</Text>
          <Text style={[styles.headerText, styles.columnTime]}>Check-In</Text>
          <Text style={[styles.headerText, styles.columnTime]}>Check-Out</Text>
          <Text style={[styles.headerText, styles.columnHours]}>Hours</Text>
        </View>

        {loading ? (
          <Text style={styles.loadingText}>Loading attendance data...</Text>
        ) : attendanceData.length > 0 ? (
          <FlatList
            data={attendanceData}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.flatListContent}
          />
        ) : (
          <Text style={styles.noDataText}>No attendance data for this month.</Text>
        )}
      </View>
    </SafeAreaView>
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
    justifyContent: 'center',
    position: 'relative',
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
  headerTitle: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 20,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.darkBlue,
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
    textAlign: 'center',
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
    textAlign: 'center',
  },
  columnDate: {
    flex: 2,
    textAlign: 'left',
  },
  columnDay: {
    flex: 1.5,
    textAlign: 'left',
  },
  columnTime: {
    flex: 2,
    textAlign: 'center',
  },
  columnHours: {
    flex: 1.5,
    textAlign: 'right',
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: Colors.mediumGrey,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: Colors.mediumGrey,
  },
  flatListContent: {
    paddingBottom: 20,
  }
});

export default MonthlyAttendance;