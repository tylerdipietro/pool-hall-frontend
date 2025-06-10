    import React, { createContext, useState, useEffect, useCallback } from 'react';
    import Constants from 'expo-constants';
    import * as Google from 'expo-auth-session/providers/google';
    import { makeRedirectUri } from 'expo-auth-session';
    import AsyncStorage from '@react-native-async-storage/async-storage';

    // Define constants for API base URL and AsyncStorage key
    const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:3000';
    const AUTH_TOKEN_KEY = 'jwt_token';

    // Create the AuthContext
    export const AuthContext = createContext();

    // AuthProvider component to wrap your app
    export function AuthProvider({ children }) {
      const [user, setUser] = useState(null);
      const [loading, setLoading] = useState(true);
      const [authToken, setAuthToken] = useState(null); // Stores the JWT token

      // Determine the Google Client ID to use (prefer web for Expo Go proxy)
      const googleClientId = '384292160153-fjr11m8ao7ls43gshrh0i6pijgu6rfs1.apps.googleusercontent.com';

      // IMPORTANT: Corrected: Use backticks (`) for the template literal
     const redirectUri = makeRedirectUri({
        scheme: 'poolhall', // This MUST match the `scheme` property in your app.json
        path: 'auth', // This is the path your app will receive the redirect on
        // For standalone apps, `useProxy` should implicitly be false, but let's be explicit
        // or simply omit `useProxy` if `makeRedirectUri` handles it based on environment.
        // However, `useProxy: true` is crucial for Expo Go.
        // The best way to handle this is usually to let `makeRedirectUri` figure it out.
        // If you force `useProxy: true` in `useAuthRequest`, it will still try the proxy.
      });

      // Google authentication request hook
      // This hook now uses the 'forcedRedirectUri' directly.
      const [request, response, promptAsync] = Google.useAuthRequest(
        {
          clientId: googleClientId,
          redirectUri: redirectUri, // Use the manually forced URI
          scopes: ['profile', 'email'],
        }// Keep this, as it influences the provider's behavior with Expo's proxy
      );

      // Effect to handle the response from the Google authentication flow
      useEffect(() => {
        // Only proceed if response is successful and contains an authorization code
        if (response?.type === 'success' && response.authentication?.code) {
          console.log('Google Auth Response Success. Code:', response.authentication.code);
          exchangeCodeForToken(response.authentication.code);
        } else if (response?.type === 'cancel') {
          console.log('Google authentication was cancelled.');
          setLoading(false); // Stop loading if cancelled
        } else if (response?.type === 'error') {
          console.error('Google authentication error:', response.error);
          setLoading(false); // Stop loading if error
          alert('Google authentication failed. Please try again.');
        }
      }, [response]); // Dependency on 'response' ensures this runs when the Google flow completes

      // Function to send the authorization code to your backend for token exchange
      const exchangeCodeForToken = useCallback(async (code) => {
        setLoading(true); // Start loading when initiating backend call
        try {
          const res = await fetch(`${API_BASE_URL}/api/auth/exchange-code`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.user && data.token) {
              setUser(data.user); // Set the user data from your backend
              setAuthToken(data.token); // Store the JWT token
              await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token); // Persist the token
              console.log('Backend exchange successful. User:', data.user);
            } else {
              setUser(null);
              setAuthToken(null);
              alert(data.error || 'Backend token exchange failed: Missing user or token.');
              console.error('Backend exchange failed:', data.error);
            }
          } else {
            const errorData = await res.json();
            throw new Error(`Backend exchange failed with status ${res.status}: ${errorData.error}`);
          }
        } catch (error) {
          console.error('Error during code exchange with backend:', error);
          setUser(null);
          setAuthToken(null);
          alert('Failed to connect to backend for authentication. Please check network.');
        } finally {
          setLoading(false); // Always stop loading
        }
      }, []);

      // Function to check for an existing JWT token and verify it with the backend
      const checkAuthStatus = useCallback(async () => {
        setLoading(true); // Start loading to check status
        try {
          const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
          if (storedToken) {
            // Send the token to your backend for verification
            const res = await fetch(`${API_BASE_URL}/api/auth/verify-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${storedToken}`, // Send token in Authorization header
              },
            });

            if (res.ok) {
              const data = await res.json();
              if (data.success && data.user) {
                setUser(data.user); // Set user from backend verification
                setAuthToken(storedToken); // Keep the token
                console.log('Existing token verified. User:', data.user);
              } else {
                // Token invalid or expired, clear it
                await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
                setUser(null);
                setAuthToken(null);
                console.log('Existing token invalid or expired, cleared.');
              }
            } else {
              // Backend couldn't verify token (e.g., 403 Forbidden), clear it
              await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
              setUser(null);
              setAuthToken(null);
              console.log('Backend failed to verify existing token, cleared.');
            }
          }
        } catch (error) {
          console.error('Error checking authentication status:', error);
          setUser(null);
          setAuthToken(null);
        } finally {
          setLoading(false); // Always stop loading
        }
      }, []);

      // Effect to run checkAuthStatus once on component mount
      useEffect(() => {
        checkAuthStatus();
      }, [checkAuthStatus]); // Dependency ensures this runs only once initially or if checkAuthStatus changes

      // Public login function to trigger the Google OAuth flow
      const login = () => {
        // Only prompt if the request object and the forcedRedirectUri are ready
        if (request && redirectUri) {
          promptAsync();
        } else {
          console.warn('Google Auth request or redirect URI not ready.');
          alert('Authentication service not ready. Please try again in a moment.');
        }
      };

      // Public logout function
      const logout = async () => {
        try {
          // Optionally notify backend to invalidate JWT if you have a mechanism (e.g., token blacklist)
          await fetch(`${API_BASE_URL}/api/auth/logout-jwt`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`, // Send token to identify session if needed
            },
          });
          await AsyncStorage.removeItem(AUTH_TOKEN_KEY); // Remove token from local storage
          setUser(null); // Clear user state
          setAuthToken(null); // Clear token state
          console.log('User logged out.');
        } catch (error) {
          console.error('Logout failed:', error);
          // Even if backend fails, clear client-side state for immediate logout experience
          await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
          setUser(null);
          setAuthToken(null);
        }
      };

      // Provide the context values to children components
      return (
        <AuthContext.Provider value={{ user, setUser, loading, login, logout, authToken, request, promptAsync, redirectUri: redirectUri }}>
          {children}
        </AuthContext.Provider>
      );
    }
    