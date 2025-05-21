// app/auth/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // You might want to hide the header for auth screens
      }}
    >
      <Stack.Screen name="Login" />
      <Stack.Screen name="Register" />
    </Stack>
  );
}