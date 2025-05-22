// File: MyAssignedProjectsScreen.tsx (or EmployeeTasksScreen.tsx - rename your original ProjectDetailsScreen.tsx to this)

import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router'; // Use useRouter for general navigation
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// FIX: Added getDoc to the Firestore imports
import { getAuth } from 'firebase/auth'; // Import getAuth to get the current user
import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'; // Import necessary Firestore functions
import { db } from '../config/firebase'; // Ensure db is correctly imported

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

// Define a type for your project data to match Firestore structure
interface Project {
  id: string;
  title: string;
  status: 'Completed' | 'In Progress' | 'On Hold';
  startDate: string;
  location: string;
  description: string; // Ensure description is part of the interface
  assignedUsers: { id: string; name: string }[];
  createdAt: any; // Firestore Timestamp
}

const MyAssignedProjectsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = getAuth(); // Get the Firebase Auth instance

  const [projects, setProjects] = useState<Project[]>([]); // State to hold the list of projects
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingProjectId, setUpdatingProjectId] = useState<string | null>(null); // State to track which project is being updated

  // Function to fetch projects assigned to the current user
  const fetchMyAssignedProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError('Please log in to see your assigned projects.');
      setLoading(false);
      return;
    }

    // --- Debugging Log ---
    console.log("Current User UID:", currentUser.uid);
    console.log("Current User Display Name:", currentUser.displayName);
    // --- End Debugging Log ---

    let currentUserNameForQuery = currentUser.displayName || '';

    // IMPORTANT: If your NewProjectScreen saves assignedUsers.name as firstName + lastName,
    // you need to fetch the user's full name from the 'users' collection here.
    // Otherwise, currentUser.displayName might not match the stored name.
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef); // getDoc is now imported
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const firstName = userData.firstName || '';
        const lastName = userData.lastName || '';
        if (firstName || lastName) {
          currentUserNameForQuery = `${firstName} ${lastName}`.trim();
        }
      }
    } catch (nameFetchError) {
      console.warn("Could not fetch user's full name from 'users' collection:", nameFetchError);
      // Fallback to displayName if fetching full name fails
    }

    // --- Debugging Log ---
    console.log("Name used for query:", currentUserNameForQuery);
    // --- End Debugging Log ---


    try {
      const projectsCollectionRef = collection(db, 'projects');
      const q = query(
        projectsCollectionRef,
        // *** THIS IS THE CRUCIAL QUERY ***
        // It looks for projects where the 'assignedUsers' array contains an object
        // that matches the current user's UID and their name (as determined above)
        where('assignedUsers', 'array-contains', {
          id: currentUser.uid,
          name: currentUserNameForQuery, // Use the determined name for query
        }),
        orderBy('createdAt', 'desc') // Order projects by creation date, newest first
      );

      const querySnapshot = await getDocs(q);
      const fetchedProjects: Project[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        // Ensure all fields are correctly typed and fallback to default if missing
        title: doc.data().title || 'Untitled Project',
        status: doc.data().status || 'In Progress',
        startDate: doc.data().startDate || 'N/A',
        location: doc.data().location || 'N/A',
        description: doc.data().description || 'No description provided.',
        assignedUsers: doc.data().assignedUsers || [],
        createdAt: doc.data().createdAt,
      }));

      setProjects(fetchedProjects);
      if (fetchedProjects.length === 0) {
        setError('No projects assigned to you at the moment.');
      }
    } catch (err: any) {
      console.error("Error fetching assigned projects:", err);
      if (err.code === 'permission-denied') {
        setError('You do not have permission to view projects. Check Firestore rules.');
      } else {
        setError('Failed to load your projects. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [auth]); // Depend on auth instance, re-run only if auth object itself changes (rare)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchMyAssignedProjects();
      } else {
        setProjects([]);
        setLoading(false);
        setError('Please log in to see your assigned projects.');
      }
    });

    if (auth.currentUser) {
      fetchMyAssignedProjects();
    }

    return () => unsubscribe();
  }, [fetchMyAssignedProjects, auth]);

  // Function to handle finishing a project
  const handleFinishProject = async (projectId: string) => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to finish a project.');
      return;
    }

    Alert.alert(
      'Finish Project',
      'Are you sure you want to mark this project as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          style: 'destructive',
          onPress: async () => {
            setUpdatingProjectId(projectId); // Set loading state for this specific project
            try {
              const projectRef = doc(db, 'projects', projectId);
              await updateDoc(projectRef, {
                status: 'Completed',
                completedAt: serverTimestamp(), // Store the completion date
              });

              // Update the local state to reflect the change immediately
              setProjects(prevProjects =>
                prevProjects.map(project =>
                  project.id === projectId ? { ...project, status: 'Completed' } : project
                )
              );
              Alert.alert('Success', 'Project marked as completed!');
            } catch (error) {
              console.error('Error finishing project:', error);
              Alert.alert('Error', 'Failed to mark project as completed. Please try again.');
            } finally {
              setUpdatingProjectId(null); // Clear loading state
            }
          },
        },
      ]
    );
  };

  // Render item for FlatList
  const renderProjectItem = ({ item }: { item: Project }) => {
    const isCompleted = item.status === 'Completed';
    const { backgroundColor, textColor } = {
      backgroundColor: isCompleted ? Colors.successGreen : item.status === 'In Progress' ? Colors.warningOrange : Colors.errorRed,
      textColor: Colors.white, // All status texts are white for better contrast
    };

    const otherAssignedUsers = item.assignedUsers
      .filter(user => user.id !== auth.currentUser?.uid) // Exclude the current user
      .map(user => user.name)
      .join(', ');

    return (
      <View style={styles.projectItem}>
        <View style={styles.projectHeader}>
          <Text style={styles.projectTitle}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor }]}>
            <Text style={[styles.statusText, { color: textColor }]}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.projectDetailText}>
          <Text style={styles.projectDetailLabel}>Start Date:</Text> {item.startDate}
        </Text>
        <Text style={styles.projectDetailText}>
          <Text style={styles.projectDetailLabel}>Location:</Text> {item.location}
        </Text>

        <Text style={styles.projectDetailText}>
          <Text style={styles.projectDetailLabel}>Description:</Text> {item.description}
        </Text>

        {otherAssignedUsers.length > 0 && (
          <Text style={styles.projectDetailText}>
            <Text style={styles.projectDetailLabel}>Other Team Members:</Text> {otherAssignedUsers}
          </Text>
        )}

        {!isCompleted && (
          <TouchableOpacity
            style={styles.finishButton}
            onPress={() => handleFinishProject(item.id)}
            disabled={updatingProjectId === item.id} // Disable if this project is being updated
          >
            {updatingProjectId === item.id ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.finishButtonText}>Finish Project</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.darkBlue} />

      {/* Top Header Bar with Gradient */}
      <LinearGradient
        colors={[Colors.primaryBlue, Colors.darkBlue]}
        style={[styles.topBar, { paddingTop: insets.top, height: 60 + insets.top }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={{ width: 28 }} /> {/* Placeholder for consistent spacing */}
        <Text style={styles.topBarTitle}>My Assigned Projects</Text>
        <View style={{ width: 28 }} /> {/* Placeholder for consistent spacing */}
      </LinearGradient>

      {/* Display error or empty state if no projects are found */}
      {error ? (
        <View style={styles.emptyStateContainer}>
          <Feather name="info" size={50} color={Colors.mediumGrey} />
          <Text style={styles.emptyStateText}>{error}</Text>
          {error.includes('log in') && (
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/auth/Login')}>
              <Text style={styles.actionButtonText}>Go to Login</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        // Use FlatList to render the list of projects
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContentContainer}
          renderItem={renderProjectItem} // Use the dedicated render function
          showsVerticalScrollIndicator={false}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lighterBlue,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.mediumGrey,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.lighterBlue,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.mediumGrey,
    textAlign: 'center',
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: Colors.primaryBlue,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  actionButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: Colors.darkBlue,
  },
  topBarTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  listContentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  projectItem: {
    backgroundColor: Colors.white,
    borderRadius: 16, // More rounded for a card look
    padding: 20, // Increased padding
    marginBottom: 15, // More space between cards
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 }, // More pronounced shadow
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10, // Space below header
  },
  projectTitle: {
    fontSize: 20, // Larger title
    fontWeight: 'bold',
    color: Colors.darkBlue,
    flexShrink: 1,
    marginRight: 10, // Space from status badge
  },
  statusBadge: {
    borderRadius: 20, // Pill shape
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.white,
    textTransform: 'uppercase',
  },
  projectDetailText: {
    fontSize: 14,
    color: Colors.black, // Darker text for details
    marginBottom: 6, // Space between detail lines
    lineHeight: 20, // Improved readability
  },
  projectDetailLabel: {
    fontWeight: '600', // Labels are semi-bold
    color: Colors.darkBlue, // Labels are dark blue
  },
  projectDescription: {
    fontSize: 14,
    color: Colors.black,
    marginBottom: 8,
  },
  assignedUsersText: {
    fontSize: 13,
    color: Colors.primaryBlue,
    fontStyle: 'italic',
  },
  finishButton: {
    backgroundColor: Colors.primaryBlue, // Primary blue for finish button
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15, // Space above button
    shadowColor: Colors.primaryBlue, // Button shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  finishButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default MyAssignedProjectsScreen;
