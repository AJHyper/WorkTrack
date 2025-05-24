import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase'; // Make sure this path is correct

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
  red: '#D32F2F',
  green: '#4CAF50',
  orange: '#FFC107',
};

// Define types for clarity and type safety
interface TeamMember {
  name: string; // Corresponds to 'name' in assignedUsers
  role: string; // We'll infer or assign a default role, as it's not explicitly in assignedUsers
}

interface Project {
  id: string;
  title: string;
  team: TeamMember[]; // This will now be populated from assignedUsers
  status: 'In Progress' | 'Completed' | 'On Hold';
  startDate: string; // Stored as 'YYYY-MM-DD' string
  endDate?: string; // Optional, stored as 'YYYY-MM-DD' string
  createdAt?: Timestamp; // For internal sorting (Firestore Timestamp)
}

const AllProjectsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper function to get dynamic styles for status badge
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Completed':
        return { backgroundColor: Colors.green, textColor: Colors.white };
      case 'In Progress':
        return { backgroundColor: Colors.orange, textColor: Colors.black };
      case 'On Hold':
        return { backgroundColor: Colors.red, textColor: Colors.white };
      default:
        return { backgroundColor: Colors.mediumGrey, textColor: Colors.white };
    }
  };

  // Function to fetch projects from Firestore
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const projectsCollectionRef = collection(db, 'projects');
      const q = query(projectsCollectionRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const fetchedProjects: Project[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();

        // Map assignedUsers to the 'team' structure
        const mappedTeam: TeamMember[] = (data.assignedUsers || []).map((user: any) => ({
          name: user.name || 'Unknown', // Use 'name' from assignedUsers
          role: user.role || 'Team Member', // 'role' might not be in assignedUsers, so provide a default or infer
                                          // If 'role' is in assignedUsers, use user.role
        }));

        const project: Project = {
          id: doc.id,
          title: data.title,
          team: mappedTeam, // Assign the mapped team here
          status: data.status as 'In Progress' | 'Completed' | 'On Hold',
          startDate: data.startDate,
          endDate: data.endDate || undefined,
          createdAt: data.createdAt,
        };
        fetchedProjects.push(project);
      });
      setAllProjects(fetchedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      Alert.alert('Error', 'Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch projects when the component mounts
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Function to handle project termination (deletion)
  const terminateProject = async (projectId: string, status: string) => {
    if (status === 'Completed') {
      Alert.alert('Action Not Allowed', 'Completed projects cannot be terminated.');
      return;
    }

    Alert.alert(
      'Confirm Termination',
      'Are you sure you want to terminate this project? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate',
          style: 'destructive',
          onPress: async () => {
            try {
              const projectDocRef = doc(db, 'projects', projectId);
              await deleteDoc(projectDocRef);

              setAllProjects((prev) => prev.filter((project) => project.id !== projectId));
              Alert.alert('Success', 'Project terminated successfully.');
            } catch (error) {
              console.error('Error terminating project:', error);
              Alert.alert('Error', 'Failed to terminate project. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Function to mark a project as completed
  const markProjectCompleted = async (projectId: string) => {
    const today = new Date().toISOString().split('T')[0];

    Alert.alert(
      'Mark as Completed',
      'Are you sure you want to mark this project as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const projectDocRef = doc(db, 'projects', projectId);
              await updateDoc(projectDocRef, {
                status: 'Completed',
                endDate: today,
              });

              setAllProjects((prevProjects) =>
                prevProjects.map((project) =>
                  project.id === projectId
                    ? { ...project, status: 'Completed', endDate: today }
                    : project
                )
              );
              Alert.alert('Success', 'Project marked as completed.');
            } catch (error) {
              console.error('Error marking project complete:', error);
              Alert.alert('Error', 'Failed to mark project as completed. Please try again.');
            }
          },
        },
      ]
    );
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
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>All Projects</Text>
        <View style={styles.rightPlaceholder} />
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primaryBlue} style={styles.loadingIndicator} />
      ) : allProjects.length === 0 ? (
        <View style={styles.noProjectsContainer}>
          <Text style={styles.noProjectsText}>No projects found. Start by creating a new one!</Text>
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollViewContent}>
          {allProjects.map((project) => {
            const { backgroundColor, textColor } = getStatusStyles(project.status);

            return (
              <View key={project.id} style={styles.projectCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.projectTitle}>{project.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor }]}>
                    <Text style={[styles.statusText, { color: textColor }]}>
                      {project.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Team:</Text>
                {project.team.length > 0 ? (
                  project.team.map((member, index) => (
                    <Text key={index} style={styles.teamMember}>
                      - {member.name} ({member.role})
                    </Text>
                  ))
                ) : (
                  <Text style={styles.noTeamText}>No team members assigned.</Text>
                )}

                <View style={styles.dateContainer}>
                  <Text style={styles.dateText}>Start Date: {project.startDate}</Text>
                  {project.status === 'Completed' && project.endDate && (
                    <Text style={styles.dateText}>End Date: {project.endDate}</Text>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                  {project.status !== 'Completed' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.terminateButton]}
                      onPress={() => terminateProject(project.id, project.status)}
                    >
                      <Text style={styles.actionButtonText}>Terminate</Text>
                    </TouchableOpacity>
                  )}

                  {project.status !== 'Completed' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() => markProjectCompleted(project.id)}
                    >
                      <Text style={styles.actionButtonText}>Mark as Completed</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
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
  },
  scrollViewContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  projectCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: Colors.black,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.black,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.black,
    marginTop: 15,
    marginBottom: 5,
  },
  teamMember: {
    fontSize: 14,
    color: Colors.mediumGrey,
    marginLeft: 10,
    marginTop: 2,
  },
  noTeamText: {
    fontSize: 14,
    color: Colors.mediumGrey,
    marginLeft: 10,
    fontStyle: 'italic',
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGrey,
    paddingTop: 10,
  },
  dateText: {
    fontSize: 13,
    color: Colors.mediumGrey,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGrey,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  terminateButton: {
    backgroundColor: Colors.red,
  },
  completeButton: {
    backgroundColor: Colors.green,
  },
  actionButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noProjectsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noProjectsText: {
    fontSize: 16,
    color: Colors.mediumGrey,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default AllProjectsScreen;