import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { auth, db } from '../config/firebase'; // Adjust path as per your project structure

const Colors = {
  primaryBlue: '#2A72B8',
  darkBlue: '#1F558C',
  lightBlue: '#C9DCEC',
  lighterBlue: '#EAF3FA', // Main background color
  white: '#FFFFFF',
  black: '#212121',
  mediumGrey: '#757575',
  lightGrey: '#BDBDBD',
  textSubtle: '#888',
  cardBorder: '#E0E0E0',
  shadowColor: 'rgba(0, 0, 0, 0.1)',

  // Colors for status badges
  statusCompletedBg: '#A7F3D0', // Greenish background for completed (from image)
  statusCompletedText: '#065F46', // Darker green text (from image)
  statusInProgressBg: '#FDE047', // Yellowish background for in progress (from image)
  statusInProgressText: '#78350F', // Darker yellow/orange text (from image)
  buttonEndProject: '#1F558C', // Dark blue for the button, matches darkBlue
};

type AssignedUser = {
  id: string;
  name: string;
};

type Project = {
  id: string;
  title: string;
  status: 'In Progress' | 'Completed' | string; // Explicitly define possible statuses
  startDate: string;
  endDate?: string; // Added endDate to match the image
  location: string;
  description: string;
  createdAt: string; // Assuming this is string, but ideally Firebase Timestamp
  createdBy: string;
  assignedUsers: AssignedUser[]; // Ensure this is always an array
};

const NoProjectsIllustration = () => (
  <View style={styles.emptyState}>
    <Feather name="folder" size={100} color={Colors.lightGrey} />
    <Text style={styles.emptyText}>No projects assigned yet.</Text>
    <Text style={styles.emptySubText}>
      Your assigned projects will appear here.
    </Text>
  </View>
);

const MyAssignedProjectsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [updatingProjectId, setUpdatingProjectId] = useState<string | null>(null); // To disable button during update

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
      } else {
        setCurrentUserId(null);
        setProjects([]);
        setLoading(false);
        setError('User not logged in. Please log in to view your projects.');
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const unsubscribe = onSnapshot(
      collection(db, 'projects'),
      (snapshot) => {
        const assigned = snapshot.docs
          .map((doc) => {
            const data = doc.data() as Omit<Project, 'id'>;
            // Ensure assignedUsers is an array, default to empty if undefined
            const assignedUsers = Array.isArray(data.assignedUsers) ? data.assignedUsers : [];
            const isAssigned = assignedUsers.some((u) => u.id === currentUserId);

            return isAssigned ? ({ ...data, id: doc.id, assignedUsers } as Project) : null;
          })
          .filter(Boolean) as Project[]; // Filter out nulls and assert type

        setProjects(assigned);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects. Please try again later.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUserId]);

  const handleEndProject = useCallback((projectId: string) => {
    Alert.alert(
      "End Project",
      "Are you sure you want to mark this project as completed?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "End",
          onPress: async () => {
            setUpdatingProjectId(projectId);
            try {
              const projectRef = doc(db, 'projects', projectId);
              await updateDoc(projectRef, {
                status: 'Completed',
                endDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }), // Set current date as end date
                updatedAt: serverTimestamp(), // Optional: Add an updated timestamp
              });
              Alert.alert("Success", "Project marked as completed.");
            } catch (error) {
              console.error("Error updating project status:", error);
              Alert.alert("Error", "Failed to end project. Please try again.");
            } finally {
              setUpdatingProjectId(null);
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, []);

  const renderItem = useCallback(({ item }: { item: Project }) => {
    const isCompleted = item.status === 'Completed';
    const isUpdating = updatingProjectId === item.id;
    const assignedEmployeeNames = item.assignedUsers
                                    ?.map(user => user.name)
                                    .filter(Boolean) // Filter out any null/undefined names
                                    .join(', ');

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={isCompleted ? 0.9 : 0.8} // Less active feedback for completed projects
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View
            style={[
              styles.statusBadge,
              isCompleted ? styles.statusCompleted : styles.statusInProgress,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isCompleted ? styles.statusCompletedText : styles.statusInProgressText,
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={styles.cardDescription} numberOfLines={2}>{`Project Details: ${item.description}`}</Text>

        <View style={styles.dateRow}>
          <Text style={styles.dateText}>Start Date: {item.startDate}</Text>
          {item.endDate && <Text style={styles.dateText}>End Date: {item.endDate}</Text>}
        </View>

        {/* Assigned Employees Row */}
        {assignedEmployeeNames ? (
          <View style={styles.assignedUsersRow}>
            <Feather name="users" size={16} color={Colors.mediumGrey} />
            <Text style={styles.assignedUsersText} numberOfLines={1}>
              Assigned: {assignedEmployeeNames}
            </Text>
          </View>
        ) : (
          <View style={styles.assignedUsersRow}>
            <Feather name="users" size={16} color={Colors.lightGrey} />
            <Text style={styles.assignedUsersText}>
              Assigned: No users
            </Text>
          </View>
        )}


        {/* End Project Button - only for In Progress projects */}
        {!isCompleted && (
          <TouchableOpacity
            style={styles.endProjectButton}
            onPress={() => handleEndProject(item.id)}
            disabled={isUpdating} // Disable button if currently updating this project
          >
            {isUpdating ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.endProjectButtonText}>End Project</Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }, [handleEndProject, updatingProjectId]); // Re-render if handleEndProject or updatingProjectId changes

  if (loading) {
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
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Feather name="arrow-left" size={28} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Assigned Projects</Text>
            <View style={styles.rightPlaceholder} />
          </View>
        </LinearGradient>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primaryBlue} />
          <Text style={styles.loadingText}>Loading your projects...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
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
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Feather name="arrow-left" size={28} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Assigned Projects</Text>
            <View style={styles.rightPlaceholder} />
          </View>
        </LinearGradient>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              setError(null);
              // Re-trigger auth state listener or direct fetch
              onAuthStateChanged(auth, (user) => {
                if (user) {
                  setCurrentUserId(user.uid);
                } else {
                  setLoading(false);
                  setError('User not logged in. Please log in to view your projects.');
                }
              });
            }}
          >
            <Text style={styles.retryButtonText}>Tap to Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
            <Feather name="arrow-left" size={28} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Assigned Projects</Text>
          <View style={styles.rightPlaceholder} />
        </View>
      </LinearGradient>

      {projects.length === 0 ? (
        <NoProjectsIllustration />
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.flatListContent}
        />
      )}
    </SafeAreaView>
  );
};

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
    width: 34,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: Colors.lighterBlue,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: Colors.mediumGrey,
    fontWeight: '500',
  },
  errorText: {
    color: '#D32F2F', // Specific red for error
    fontSize: 17,
    textAlign: 'center',
    paddingHorizontal: 24,
    fontWeight: '600',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primaryBlue,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primaryBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  flatListContent: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 15,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadowColor,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, // Space between header and description
  },
  cardTitle: {
    fontSize: 19, // Slightly larger, matches image
    fontWeight: '700', // Bolder
    color: Colors.black, // From image, title is black
    flexShrink: 1, // Allows text to wrap
    marginRight: 10, // Space from status badge
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 5, // Slightly rounded corners for badge
    alignSelf: 'flex-start', // Prevent badge from stretching
  },
  statusCompleted: {
    backgroundColor: Colors.statusCompletedBg,
  },
  statusInProgress: {
    backgroundColor: Colors.statusInProgressBg,
  },
  statusBadgeText: {
    fontSize: 15, // 25% bigger than 12 (12 * 1.25 = 15)
    fontWeight: '600', // Bold text for badge
  },
  statusCompletedText: {
    color: Colors.statusCompletedText,
  },
  statusInProgressText: {
    color: Colors.statusInProgressText,
  },
  cardDescription: {
    fontSize: 15,
    color: Colors.mediumGrey,
    marginBottom: 15,
    lineHeight: 22,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Spreads dates to ends
    alignItems: 'center',
    marginBottom: 15, // Space between dates and assigned users
  },
  dateText: {
    fontSize: 14,
    color: Colors.mediumGrey, // Matches image, a bit lighter than black
    fontWeight: '500', // Slightly bold
  },
  assignedUsersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15, // Space between assigned users and button
  },
  assignedUsersText: {
    fontSize: 14,
    color: Colors.mediumGrey,
    fontWeight: '500',
    marginLeft: 8, // Space between icon and text
    flexShrink: 1, // Allow text to wrap if too long
  },
  endProjectButton: {
    backgroundColor: Colors.buttonEndProject,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-end', // Aligns to bottom right
    ...Platform.select({
      ios: {
        shadowColor: Colors.darkBlue,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  endProjectButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: -50, // Adjust as needed to center it better visually below the header
  },
  emptyText: {
    marginTop: 20,
    fontSize: 20,
    color: Colors.mediumGrey,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 15,
    color: Colors.lightGrey,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default MyAssignedProjectsScreen;