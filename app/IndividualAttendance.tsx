import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; // Import LinearGradient
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Platform, // Import Platform for shadows
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const { width } = Dimensions.get('window');

// --- Consistent Color Palette from DashboardEmp.tsx ---
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

// Define a type for your attendance data for clarity
interface AttendanceRecord {
  id: string; // Document ID (the date string)
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
  const [currentMonth, setCurrentMonth] = useState(new Date()); // State to track the current month

  // Helper to format date keys (YYYY-MM-DD)
  const formatDateKey = (date: Date) => date.toISOString().slice(0, 10);

  // Helper to calculate hours worked
  const calculateHoursWorked = (checkIn: string, checkOut: string): string => {
    try {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return '-'; // Invalid date format
      }
      const diff = (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
      return diff >= 0 ? diff.toFixed(2) : '-'; // Ensure non-negative hours
    } catch (error) {
      console.error("Error calculating hours:", error);
      return '-';
    }
  };

  // Function to load attendance data for the selected month
  const loadMonthlyAttendance = async (month: Date) => {
    setLoading(true);
    setAttendanceData([]); // Clear previous data

    const userId = user?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0); // Last day of the month

      // Format for Firestore query range
      const startKey = formatDateKey(startOfMonth);
      const endKey = formatDateKey(endOfMonth);

      const q = query(
        collection(db, 'attendance', userId, 'daily'),
        where('__name__', '>=', startKey), // Query documents whose IDs (dates) are >= start of month
        where('__name__', '<=', endKey),   // Query documents whose IDs (dates) are <= end of month
        orderBy('__name__', 'asc')         // Order by date ascending
      );

      const querySnapshot = await getDocs(q);
      const fetchedData: AttendanceRecord[] = [];

      querySnapshot.forEach((docSnap) => {
        const docId = docSnap.id; // This is the YYYY-MM-DD date string
        const data = docSnap.data();

        const checkIn = data.checkInTime || null;
        const checkOut = data.checkOutTime || null;
        const hours = checkIn && checkOut ? calculateHoursWorked(checkIn, checkOut) : '0';

        fetchedData.push({
          id: docId, // Use the document ID as the unique key for FlatList
          date: new Date(docId).toLocaleDateString('en-GB'), // Format for display (DD/MM/YY)
          day: new Date(docId).toLocaleDateString('en-GB', { weekday: 'short' }),
          checkInTime: checkIn ? new Date(checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--',
          checkOutTime: checkOut ? new Date(checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--',
          hoursWorked: hours,
        });
      });

      setAttendanceData(fetchedData);
    } catch (error) {
      console.error('Error loading monthly attendance:', error);
      Alert.alert('Error', 'Failed to load monthly attendance.');
    } finally {
      setLoading(false);
    }
  };

  // Listen for auth state changes to get user ID
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      if (usr) {
        setUser(usr);
      } else {
        setUser(null);
        router.push('/auth/Login'); // Redirect if no user
      }
    });
    return unsubscribe;
  }, []);

  // Load data when user changes or currentMonth changes
  useEffect(() => {
    if (user) {
      loadMonthlyAttendance(currentMonth);
    }
  }, [user, currentMonth]); // Depend on user and currentMonth

  const goBack = () => {
    router.back();
  };

  // Functions to navigate months
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

  // Render item for FlatList
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

      {/* Header with LinearGradient, matching Dashboard aesthetic */}
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

      {/* Content */}
      <View style={styles.container}>
        {/* Month Navigation */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity onPress={goToPreviousMonth}>
            <Feather name="chevron-left" size={26} color={Colors.primaryBlue} />
          </TouchableOpacity>
          <Text style={styles.monthText}>{formattedMonthYear}</Text>
          <TouchableOpacity onPress={goToNextMonth}>
            <Feather name="chevron-right" size={26} color={Colors.primaryBlue} />
          </TouchableOpacity>
        </View>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.columnDate]}>Date</Text>
          <Text style={[styles.headerText, styles.columnDay]}>Day</Text>
          <Text style={[styles.headerText, styles.columnTime]}>Check-In</Text>
          <Text style={[styles.headerText, styles.columnTime]}>Check-Out</Text>
          <Text style={[styles.headerText, styles.columnHours]}>Hours</Text>
        </View>

        {/* Attendance Data List */}
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
    backgroundColor: Colors.lighterBlue, // Use lighter blue for background
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({ // Subtle shadow for the header
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
    fontSize: 24, // Consistent header title size
    fontWeight: 'bold',
    textAlign: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 15, // Slightly reduced padding for a fuller table view
    paddingTop: 20,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: Colors.white, // White background for the month selector
    paddingVertical: 12, // Increased padding
    paddingHorizontal: 20, // Increased padding
    borderRadius: 12, // More rounded corners
    ...Platform.select({ // Add shadow
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
    fontSize: 18, // Slightly smaller
    fontWeight: '600', // Semibold
    color: Colors.darkBlue, // Darker blue for text
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryBlue, // Primary blue for table header
    paddingVertical: 12, // Consistent padding
    borderRadius: 10, // Rounded corners
    marginBottom: 8, // Spacing below header
    paddingHorizontal: 10,
    ...Platform.select({ // Add subtle shadow
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
    fontSize: 13, // Slightly larger font
    color: Colors.white, // White text for header
    textAlign: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 14, // Increased vertical padding
    backgroundColor: Colors.white, // White background for data rows
    borderRadius: 10, // Rounded corners
    marginBottom: 6, // Spacing between rows
    paddingHorizontal: 10,
    alignItems: 'center',
    ...Platform.select({ // Subtle shadow for each row
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
    fontSize: 13, // Consistent font size
    color: Colors.black, // Dark text for data
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
    textAlign: 'right', // Align hours to the right for better readability
    fontWeight: '600', // Make hours worked slightly bolder
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
    paddingBottom: 20, // Add some padding at the bottom of the list
  }
});

export default MonthlyAttendance;