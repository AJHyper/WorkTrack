import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const Profile = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Initial saved data
  const initialProfile = {
    fullName: 'Alfred Jokelin',
    mobileNumber: '050-1234567',
    emailAddress: 'alfredjokelin@rit.com',
    role: 'Software Intern',
  };

  const [fullName, setFullName] = useState(initialProfile.fullName);
  const [mobileNumber, setMobileNumber] = useState(initialProfile.mobileNumber);
  const [emailAddress, setEmailAddress] = useState(initialProfile.emailAddress);
  const [role, setRole] = useState(initialProfile.role);

  const [imageUri, setImageUri] = useState<string | null>(null);

  // Track if changes have been made
  const [hasChanges, setHasChanges] = useState(false);

  // Check for changes whenever any field updates
  useEffect(() => {
    if (
      fullName !== initialProfile.fullName ||
      mobileNumber !== initialProfile.mobileNumber ||
      emailAddress !== initialProfile.emailAddress ||
      role !== initialProfile.role
    ) {
      setHasChanges(true);
    } else {
      setHasChanges(false);
    }
  }, [fullName, mobileNumber, emailAddress, role]);

  const handleProfilePictureChange = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        alert('Permission to access gallery is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (result.canceled) {
        return;
      }

      if (result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleSave = () => {
    // Implement saving logic here (e.g., API call)
    console.log('Saved:', { fullName, mobileNumber, emailAddress, role });
    // Update initialProfile (simulate saved state)
    initialProfile.fullName = fullName;
    initialProfile.mobileNumber = mobileNumber;
    initialProfile.emailAddress = emailAddress;
    initialProfile.role = role;
    setHasChanges(false);
  };

  return (
    <>
      <StatusBar
        backgroundColor="transparent"
        translucent
        barStyle="light-content"
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View
          style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.rightPlaceholder} />
        </View>

        {/* Body */}
        <ScrollView
          style={styles.container}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 80 }}
        >
          {/* Profile Image Section */}
          <View style={styles.profileImageContainer}>
            <TouchableOpacity onPress={handleProfilePictureChange}>
              <View style={styles.avatarContainer}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.avatar} />
                ) : (
                  <Image
                    source={require('../assets/images/Profile.png')}
                    style={styles.avatar}
                  />
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleProfilePictureChange}>
              <Text style={styles.editProfileText}>Edit Profile Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <FormField label="Full Name" value={fullName} onChange={setFullName} />
            <FormField
              label="Mobile Number"
              value={mobileNumber}
              onChange={setMobileNumber}
            />
            <FormField
              label="Email Address"
              value={emailAddress}
              onChange={setEmailAddress}
            />
            <FormField label="Role" value={role} onChange={setRole} />
          </View>
        </ScrollView>

        {/* Save Button */}
        {hasChanges && (
          <View style={styles.saveButtonContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </>
  );
};

const FormField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
}) => {
  return (
    <View style={styles.formFieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={label}
        placeholderTextColor="#A0A0A0"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E6F0FF',
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
    color: '#fff',
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
    backgroundColor: '#E6F0FF',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  avatarContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  editProfileText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333333',
    fontWeight: '400',
  },
  formContainer: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  formFieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
    width: '100%',
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 20 : 40,
    left: 20,
    right: 20,
    backgroundColor: 'transparent',
  },
  saveButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Profile;
