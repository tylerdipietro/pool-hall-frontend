import React, { useEffect, useState, useContext } from 'react';
import { Button, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Constants from 'expo-constants'; // Still useful for logging in this component
import { makeRedirectUri } from 'expo-auth-session'; // <--- ADD THIS IMPORT
import { AuthContext } from '../contexts/AuthContext'; // Import AuthContext

export default function LoginScreen() {
  // Consume values from AuthContext
  const { user, loading, login, logout, request, promptAsync, redirectUri } = useContext(AuthContext);

  // Optional: A separate state just for LoginScreen's own redirect URI logging
  // (Main AuthContext handles the active one for the Google flow)
  const [localDebugRedirectUri, setLocalDebugRedirectUri] = useState(null);

  // Effect to log the computed redirect URI for debugging in this specific component
  useEffect(() => {
    // Only compute if Constants are available
    if (Constants.expoConfig?.owner && Constants.expoConfig?.slug && Constants.expoConfig?.scheme) {
      try {
        const computedUri = makeRedirectUri({
          scheme: 'poolhall', // Can use literal string here for this component's log
          path: 'auth',
          useProxy: true,
        });
        setLocalDebugRedirectUri(computedUri);
        console.log('Computed redirect URI (LoginScreen useEffect debug):', computedUri);
      } catch (error) {
        console.error("Error computing LoginScreen debug redirect URI:", error);
        setLocalDebugRedirectUri(null);
      }
    }
  }, [Constants.expoConfig?.owner, Constants.expoConfig?.slug, Constants.expoConfig?.scheme]);


  // Display loading indicator if AuthContext is loading
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Authenticating...</Text>
      </View>
    );
  }

  // Display user info if authenticated
  if (user) {
    return (
      <View style={styles.container}>
        <Text style={styles.welcomeText}>Welcome, {user.name}!</Text>
        <Text style={styles.emailText}>Email: {user.email}</Text>
        {/* You can add a logout button here */}
        <Button title="Logout" onPress={logout} />
      </View>
    );
  }

  // Display login button if not authenticated
  return (
    <View style={styles.container}>
      {/*
        The button is disabled if:
        - The `request` object from `useAuthRequest` is not yet ready.
        - The `redirectUri` (computed in AuthContext) is not yet ready.
      */}
      <Button
        disabled={!request || !redirectUri}
        title="Login with Google"
        onPress={login} // Use the login function from AuthContext
      />
      {/* Optional: Display the debug URI on screen for easier verification */}
      {__DEV__ && localDebugRedirectUri && (
        <Text style={styles.debugText}>
          Debug URI: {localDebugRedirectUri}
        </Text>
      )}
      {__DEV__ && (!request || !redirectUri) && (
        <Text style={styles.debugText}>Auth service not fully loaded. Please wait...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  emailText: {
    fontSize: 18,
    color: '#555',
    marginBottom: 20,
  },
  debugText: {
    marginTop: 20,
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
});