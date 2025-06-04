// frontend/components/LoginScreen.js
import React from 'react';
import { View, Button, Linking } from 'react-native';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:3000';

export default function LoginScreen() {
  const handleGoogleLogin = () => {
    const authUrl = 'https://pool-hall-waitlist-3b8c64cbf25d.herokuapp.com/api/auth/google'; // Backend auth URL
    Linking.openURL(authUrl);
  };

  return (
    <View>
      <Button title="Login with Google" onPress={handleGoogleLogin} />
    </View>
  );
}
