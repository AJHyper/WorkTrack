import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { auth, db } from '../config/firebase'; // adjust path if needed

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
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Track auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
      } else {
        setCurrentUserId(null);
        setProjects([]);
        setLoading(false);
        setError('User not logged in');
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to projects when userId is set
  useEffect(() => {
    if (!currentUserId) return;

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      collection(db, 'projects'),
      (snapshot) => {
        const fetchedProjects: Project[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data() as Omit<Project, 'id'> & { assignedUsers?: AssignedUser[] };

          const assignedUsers = data.assignedUsers ?? [];

          // Check if current user is assigned to this project
          const isAssigned = assignedUsers.some((user) => user.id === currentUserId);

          if (isAssigned) {
            fetchedProjects.push({
              id: doc.id,
              title: data.title ?? 'Untitled Project',
              status: data.status ?? 'Unknown',
              startDate: data.startDate ?? 'N/A',
              location: data.location ?? 'N/A',
              description: data.description ?? 'No description provided',
              createdAt: data.createdAt ?? '',
              createdBy: data.createdBy ?? '',
              assignedUsers,
            });
          }
        });

        setProjects(fetchedProjects);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  const renderProjectItem = useCallback(({ item }: { item: Project }) => (
    <View style={styles.projectCard}>
      <Text style={styles.projectTitle}>{item.title}</Text>
      <Text style={styles.projectDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <Text style={styles.projectMeta}>Start Date: {item.startDate}</Text>
      <Text style={styles.projectMeta}>Location: {item.location}</Text>
      <Text style={styles.projectMeta}>Status: {item.status}</Text>
    </View>
  ), []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primaryBlue} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
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

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
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
  errorText: {
    fontSize: 16,
    color: 'red',
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
