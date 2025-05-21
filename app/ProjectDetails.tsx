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

const initialProject = {
  title: 'AI Surveillance System',
  status: 'In Progress',
  startDate: '2024-12-01',
  location: 'Palo Alto, CA', // Added location
  description: 'Developing an AI-powered surveillance system for enhanced security.', // Added description
  team: [
    { name: 'Aryan', role: 'Lead Developer' },
    { name: 'Kavya', role: 'UI/UX Designer' },
    { name: 'Rohan', role: 'Backend Engineer' },
  ],
};

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

const ProjectDetailsScreen = () => {
  const insets = useSafeAreaInsets();
  const [project, setProject] = useState(initialProject);
  const { backgroundColor, textColor } = getStatusStyles(project.status);

  const handleEndProject = () => {
    Alert.alert(
      'End Project',
      'Are you sure you want to mark this project as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Project',
          style: 'destructive',
          onPress: () => {
            setProject({ ...project, status: 'Completed' });
            Alert.alert('Success', 'Project marked as completed.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#003399" />

      {/* Top Header Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <TouchableOpacity onPress={() => router.push('/auth/BossDashboard')}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Project Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.projectTitle}>{project.title}</Text>

          <View style={[styles.statusBadge, { backgroundColor }]}>
            <Text style={[styles.statusText, { color: textColor }]}>{project.status}</Text>
          </View>

          <Text style={styles.sectionTitle}>Team Members:</Text>
          {project.team.map((member, index) => (
            <Text key={index} style={styles.teamMember}>
              • {member.name} ({member.role})
            </Text>
          ))}

          <Text style={styles.sectionTitle}>Start Date:</Text>
          <Text style={styles.detailText}>{project.startDate}</Text>

          <Text style={styles.sectionTitle}>Location:</Text>
          <Text style={styles.detailText}>{project.location}</Text>

          <Text style={styles.sectionTitle}>Description:</Text>
          <Text style={styles.detailText}>{project.description}</Text>

          {project.status !== 'Completed' && (
            <TouchableOpacity style={styles.endButton} onPress={handleEndProject}>
              <Text style={styles.endButtonText}>End Project</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E6F0FF',
  },
  topBar: {
    backgroundColor: '#003399',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topBarTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  container: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  projectTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  teamMember: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    marginTop: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    marginTop: 4,
  },
  endButton: {
    marginTop: 24,
    backgroundColor: '#F44336',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  endButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ProjectDetailsScreen;
