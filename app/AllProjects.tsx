import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AllProjectsScreen = () => {
  const insets = useSafeAreaInsets();

  const [allProjects, setAllProjects] = useState([
    {
      id: '1',
      title: 'Project Alpha',
      team: [
        { name: 'Alice Smith', role: 'Developer' },
        { name: 'Bob Johnson', role: 'Designer' },
        { name: 'Charlie Brown', role: 'Project Manager' },
      ],
      status: 'In Progress',
      startDate: '2024-01-15',
      endDate: '2024-03-30',
    },
    {
      id: '2',
      title: 'Project Beta',
      team: [
        { name: 'David Miller', role: 'Developer' },
        { name: 'Eve Wilson', role: 'QA Engineer' },
      ],
      status: 'Completed',
      startDate: '2024-02-01',
      endDate: '2024-04-15',
    },
    {
      id: '3',
      title: 'Project Gamma',
      team: [
        { name: 'Frank Green', role: 'Designer' },
        { name: 'Gina White', role: 'Developer' },
        { name: 'Henry Black', role: 'Developer' },
      ],
      status: 'On Hold',
      startDate: '2024-03-01',
      endDate: '2024-05-31',
    },
    {
      id: '4',
      title: 'Project Delta',
      team: [
        { name: 'Isabella Lopez', role: 'Project Manager' },
        { name: 'Jack Rodriguez', role: 'Developer' },
      ],
      status: 'In Progress',
      startDate: '2024-01-15',
      endDate: '2024-03-30',
    },
    {
      id: '5',
      title: 'Project Epsilon',
      team: [
        { name: 'Karen Hernandez', role: 'Developer' },
        { name: 'Liam Martinez', role: 'QA Engineer' },
      ],
      status: 'Completed',
      startDate: '2024-02-01',
      endDate: '2024-04-15',
    },
    {
      id: '6',
      title: 'Project Zeta',
      team: [
        { name: 'Mia Garcia', role: 'Designer' },
        { name: 'Noah Perez', role: 'Developer' },
        { name: 'Olivia Taylor', role: 'Developer' },
      ],
      status: 'On Hold',
      startDate: '2024-03-01',
      endDate: '2024-05-31',
    },
  ]);

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Completed':
        return { backgroundColor: '#4CAF50', textColor: '#FFFFFF' };
      case 'In Progress':
        return { backgroundColor: '#FFC107', textColor: '#000000' };
      case 'On Hold':
        return { backgroundColor: '#F44336', textColor: '#FFFFFF' };
      default:
        return { backgroundColor: '#9E9E9E', textColor: '#FFFFFF' };
    }
  };

  const terminateProject = (projectId: string, status: string) => {
    if (status === 'Completed') {
      Alert.alert('Action not allowed', 'Completed projects cannot be terminated.');
      return;
    }

    Alert.alert(
      'Confirm Termination',
      'Are you sure you want to terminate this project?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate',
          style: 'destructive',
          onPress: () => {
            setAllProjects((prev) =>
              prev.filter((project) => project.id !== projectId)
            );
          },
        },
      ]
    );
  };

  const markProjectCompleted = (projectId: string) => {
    const today = new Date().toISOString().split('T')[0]; // format: YYYY-MM-DD
    setAllProjects((prevProjects) =>
      prevProjects.map((project) =>
        project.id === projectId
          ? { ...project, status: 'Completed', endDate: today }
          : project
      )
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" />

      <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/auth/BossDashboard')}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>All Projects</Text>
        <View style={styles.rightPlaceholder} />
      </View>

      <ScrollView style={styles.container}>
        {allProjects.map((project) => {
          const { backgroundColor, textColor } = getStatusStyles(project.status);

          return (
            <View key={project.id} style={styles.projectCard}>
              <Text style={styles.projectTitle}>{project.title}</Text>

              <View style={[styles.statusBadge, { backgroundColor }]}>
                <Text style={[styles.statusText, { color: textColor }]}>
                  {project.status}
                </Text>
              </View>

              <Text style={styles.projectDetails}>Team:</Text>
              {project.team.map((member, index) => (
                <Text key={index} style={styles.teamMember}>
                  - {member.name} ({member.role})
                </Text>
              ))}

              <View style={styles.dateContainer}>
                <Text style={styles.dateText}>Start Date: {project.startDate}</Text>
                {project.status === 'Completed' && (
                  <Text style={styles.dateText}>End Date: {project.endDate}</Text>
                )}
              </View>

              {/* Terminate Button (if not completed) */}
              {project.status !== 'Completed' && (
                <TouchableOpacity
                  style={styles.terminateButton}
                  onPress={() => terminateProject(project.id, project.status)}
                >
                  <Text style={styles.terminateButtonText}>Terminate</Text>
                </TouchableOpacity>
              )}

              {/* Mark as Completed Button (if not completed) */}
              {project.status !== 'Completed' && (
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={() => markProjectCompleted(project.id)}
                >
                  <Text style={styles.completeButtonText}>Mark as Completed</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
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
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  projectCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  projectDetails: {
    fontSize: 14,
    color: '#555',
    marginTop: 12,
  },
  teamMember: {
    fontSize: 14,
    color: '#777',
    marginLeft: 10,
    marginTop: 2,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#777',
  },
  terminateButton: {
    marginTop: 16,
    backgroundColor: '#D32F2F',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  terminateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  completeButton: {
    marginTop: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  completeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default AllProjectsScreen;
