import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';

const { width } = Dimensions.get('window');

const Profile: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
      if (usr) {
        setUser(usr);
        setEmail(usr.email || '');

        const docRef = doc(db, 'users', usr.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.profilePhoto) setImageUri(data.profilePhoto);
          if (data.firstName) setFirstName(data.firstName);
          if (data.lastName) setLastName(data.lastName);
        }
      } else {
        setUser(null);
        setEmail('');
        setImageUri(null);
        setFirstName('');
        setLastName('');
      }
    });
    return unsubscribe;
  }, []);

  const goBack = () => {
    router.back();
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Permission to access photos is needed!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const localUri = result.assets[0].uri;
      setImageUri(localUri);

      if (!user) {
        Alert.alert('Error', 'User not logged in!');
        return;
      }

      try {
        const fileUri = localUri;
        const file = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
        const blob = new Uint8Array(Buffer.from(file, 'base64'));
        await uploadBytes(storageRef, blob);

        const downloadURL = await getDownloadURL(storageRef);

        await setDoc(
          doc(db, 'users', user.uid),
          { profilePhoto: downloadURL },
          { merge: true }
        );

        setImageUri(downloadURL);
      } catch (error) {
        Alert.alert('Upload Error', 'Failed to upload profile photo.');
        console.error('Upload Error:', error);
      }
    }
  };

  const deletePhoto = async () => {
    if (!user) {
      Alert.alert('Error', 'User not logged in!');
      return;
    }

    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
              // Delete from storage
              await deleteObject(storageRef).catch((error) => {
                // If file doesn't exist, ignore error
                if (error.code !== 'storage/object-not-found') {
                  throw error;
                }
              });

              // Remove profilePhoto field in Firestore
              await setDoc(
                doc(db, 'users', user.uid),
                { profilePhoto: '' },
                { merge: true }
              );

              setImageUri(null);
              Alert.alert('Deleted', 'Profile photo has been removed.');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete profile photo.');
              console.error('Delete Error:', error);
            }
          },
        },
      ]
    );
  };

  const saveChanges = async () => {
    if (!user) {
      Alert.alert('Error', 'User not logged in!');
      return;
    }

    try {
      await setDoc(
        doc(db, 'users', user.uid),
        { firstName, lastName },
        { merge: true }
      );
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile changes.');
      console.error(error);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#003399" />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top,
              height: 60 + insets.top,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            },
          ]}
        >
          <TouchableOpacity
            style={{ position: 'absolute', left: 16, top: insets.top + 10 }}
            onPress={goBack}
          >
            <Feather name="arrow-left" size={30} color="white" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Content */}
        <View style={styles.container}>
          <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>Tap to select photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Delete photo button only shows if there is a profile photo */}
          {imageUri && (
            <TouchableOpacity onPress={deletePhoto} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>Delete Photo</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Email Address</Text>
          <Text style={[styles.input, styles.readOnly]}>{email}</Text>

          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter first name"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter last name"
            placeholderTextColor="#999"
          />

          <TouchableOpacity onPress={saveChanges} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E6F0FF',
  },
  header: {
    backgroundColor: '#003399',
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  imageContainer: {
    borderRadius: width * 0.25,
    width: width * 0.5,
    height: width * 0.5,
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#1E3A8A',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#1E3A8A',
    fontSize: 16,
  },
  deleteButton: {
    alignSelf: 'center',
    marginBottom: 20,
    backgroundColor: '#FF4D4D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    color: '#003399',
    marginBottom: 6,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    fontSize: 14,
    marginBottom: 16,
  },
  readOnly: {
    color: '#555',
  },
  saveButton: {
    backgroundColor: '#003399',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Profile;
