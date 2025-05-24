import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View
} from 'react-native';

const Colors = {
  primaryBlue: '#007AFF',
  background: '#fff',
  textPrimary: '#000',
  textSecondary: '#555',
  cardBackground: '#f2f2f2',
  borderColor: '#ddd',
};

type AssignedUser = {
  id: string;
  name: string;
};

type Project = {
  id: string;
  title: string;
  status: string;
  startDate: string;
  location: string;
  description: string;
  createdAt: string;
  createdBy: string;
  assignedUsers: AssignedUser[];
};

const MyAssignedProjectsScreen = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUserId = auth().currentUser?.uid;

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    // Firestore cannot query array of objects by nested field,
    // so fetch all and filter client-side
    const unsubscribe = firestore()
      .collection('projects')
      .onSnapshot(
        snapshot => {
          const fetchedProjects: Project[] = [];

          snapshot.forEach(doc => {
            const data = doc.data();

            // Safety checks and type assertions
            const assignedUsers: AssignedUser[] = data.assignedUsers || [];

            // Check if current user is assigned to this project
            const isAssigned = assignedUsers.some(user => user.id === currentUserId);

            if (isAssigned) {
              fetchedProjects.push({
                id: doc.id,
                title: data.title,
                status: data.status,
                startDate: data.startDate,
                location: data.location,
                description: data.description,
                createdAt: data.createdAt,
                createdBy: data.createdBy,
                assignedUsers: assignedUsers,
              });
            }
          });

          setProjects(fetchedProjects);
          setLoading(false);
        },
        error => {
          console.error('Error fetching projects:', error);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [currentUserId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primaryBlue} />
      </View>
    );
  }

  if (projects.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No assigned projects found.</Text>
      </View>
    );
  }

  const renderProjectItem = ({ item }: { item: Project }) => (
    <View style={styles.projectCard}>
      <Text style={styles.projectTitle}>{item.title}</Text>
      <Text style={styles.projectDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <Text style={styles.projectMeta}>Start Date: {item.startDate}</Text>
      <Text style={styles.projectMeta}>Location: {item.location}</Text>
      <Text style={styles.projectMeta}>Status: {item.status}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        keyExtractor={item => item.id}
        renderItem={renderProjectItem}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  projectCard: {
    backgroundColor: Colors.cardBackground,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderColor,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  projectMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});

export default MyAssignedProjectsScreen;
