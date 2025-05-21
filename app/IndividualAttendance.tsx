import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AttendanceDetailsScreenProps = {
    route: RouteProp<{ params: { checkInTime: string; checkOutTime: string } }, 'params'>;
};

const calculateHoursWorked = (checkIn: string, checkOut: string) => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diff = (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
    return diff.toFixed(2);
};

const AttendanceDetailsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<AttendanceDetailsScreenProps['route']>();
    const { checkInTime, checkOutTime } = route.params;
    const insets = useSafeAreaInsets();


    const today = new Date();
    const formattedDate = today
        .toLocaleDateString('en-GB')
        .split('/')
        .map((part, index) => (index === 2 ? part.slice(-2) : part))
        .join('-');

    const shortDay = today.toLocaleDateString('en-GB', { weekday: 'short' });

    const attendanceData = {
        date: formattedDate,
        day: shortDay,
        checkIn: checkInTime || '-',
        checkOut: checkOutTime || '-',
        hours:
            checkInTime && checkOutTime
                ? calculateHoursWorked(checkInTime, checkOutTime)
                : '-',
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#003399" />

            <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Attendance Details</Text>
                <View style={styles.rightPlaceholder} />
            </View>

            <View style={styles.container}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.headerText, { flex: 2, textAlign: 'left' }]}>Date</Text>
                    <Text style={[styles.headerText, { flex: 2, textAlign: 'left', marginLeft: 12 }]}>Day</Text>
                    <Text style={[styles.headerText, { flex: 3, textAlign: 'center' }]}>Check-In</Text>
                    <Text style={[styles.headerText, { flex: 3, textAlign: 'center' }]}>Check-Out</Text>
                    <Text style={[styles.headerText, { flex: 2, textAlign: 'center' }]}>Hours</Text>
                </View>

                <View style={styles.dataRow}>
                    <Text style={[styles.dataText, { flex: 2, textAlign: 'left' }]}>{attendanceData.date}</Text>
                    <Text style={[styles.dataText, { flex: 2, textAlign: 'left', marginLeft: 12 }]}>{attendanceData.day}</Text>
                    <Text style={[styles.dataText, { flex: 3, textAlign: 'center' }]}>{attendanceData.checkIn}</Text>
                    <Text style={[styles.dataText, { flex: 3, textAlign: 'center' }]}>{attendanceData.checkOut}</Text>
                    <Text style={[styles.dataText, { flex: 2, textAlign: 'center' }]}>{attendanceData.hours}</Text>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#E6F0FF',
    },
    header: {
        backgroundColor: '#003399', // Changed to match the provided image color
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
    },
    dataText: {
        fontSize: 12,
        color: '#555',
    },
});

export default AttendanceDetailsScreen;
