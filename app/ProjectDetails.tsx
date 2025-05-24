import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { auth, db } from '../config/firebase';

const Colors = {
  primaryBlue: '#2A72B8',
  darkBlue: '#1F558C',
  lightBlue: '#C9DCEC',
  lighterBlue: '#EAF3FA',
  white: '#FFFFFF',
  black: '#212121',
  mediumGrey: '#757575',
  lightGrey: '#BDBDBD',
  accentGreen: '#4CAF50',
  warningYellow: '#FFC107',
  errorRed: '#F44336',
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

const NoProjectsIllustration = () => (
  <View style={styles.emptyState}>
    <Feather name="folder" size={100} color={Colors.lightGrey} />
    <Text style={styles.emptyText}>No projects assigned yet.</Text>
    <Text style={styles.emptySubText}>Your assigned projects will appear here.</Text>
  </View>
);

const MyAssignedProjectsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
      } else {
        setProjects([]);
        setCurrentUserId(null);
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
        const assignedProjects = snapshot.docs
          .map((doc) => {
            const data = doc.data() as Omit<Project, 'id'>;
            const isAssigned = data.assignedUsers?.some((u) => u.id === currentUserId);
            return isAssigned ? ({ ...data, id: doc.id } as Project) : null;
          })
          .filter(Boolean) as Project[];

        setProjects(assignedProjects);
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

  const renderItem = useCallback(
    ({ item }: { item: Project }) => (
      <TouchableOpacity style={styles.card} activeOpacity={0.85}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

        <View style={styles.metaRow}>
          <Feather name="calendar" size={16} color={Colors.mediumGrey} />
          <Text style={styles.metaText}>Start Date: {item.startDate}</Text>
        </View>

        <View style={styles.metaRow}>
          <Feather name="map-pin" size={16} color={Colors.mediumGrey} />
          <Text style={styles.metaText}>Location: {item.location}</Text>
        </View>

        <View style={styles.metaRow}>
          <Feather name="info" size={16} color={Colors.mediumGrey} />
          <Text style={styles.metaText}>Status: {item.status}</Text>
        </View>
      </TouchableOpacity>
    ),
    []
  );

  const renderHeader = () => (
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
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.darkBlue} />
        {renderHeader()}
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
        {renderHeader()}
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              onAuthStateChanged(auth, (user) => {
                if (user) {
                  setCurrentUserId(user.uid);
                } else {
                  setError('User not logged in. Please log in to view your projects.');
                  setLoading(false);
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
      {renderHeader()}
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
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: Colors.mediumGrey,
    fontWeight: '500',
  },
  errorText: {
    color: Colors.errorRed,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primaryBlue,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    elevation: 3,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  flatListContent: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.lightBlue,
    shadowColor: Colors.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.darkBlue,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: Colors.mediumGrey,
    marginBottom: 10,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    marginLeft: 6,
    fontSize: 14,
    color: Colors.mediumGrey,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.lightGrey,
    marginTop: 20,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.mediumGrey,
    marginTop: 6,
    textAlign: 'center',
  },
});

export default MyAssignedProjectsScreen;
