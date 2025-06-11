import React, { createContext, useState, useEffect, useCallback } from 'react';
import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:3000';
console.log('Frontend API_BASE_URL:', API_BASE_URL);
const AUTH_TOKEN_KEY = 'jwt_token';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);

  const googleClientId = '384292160153-fjr11m8ao7ls43gshrh0i6pijgu6rfs1.apps.googleusercontent.com';

  const redirectUri = makeRedirectUri({
    scheme: 'poolhall',
    path: 'auth',
  });

  const [request, response, promptAsync] = Google.useAuthRequest(
    {
      clientId: googleClientId,
      redirectUri: redirectUri,
      scopes: ['profile', 'email'],
      useProxy: false,
    }
  );

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.code) {
      console.log('AuthContext: Google Auth Response Success. Code:', response.authentication.code);
      exchangeCodeForToken(response.authentication.code);
    } else if (response?.type === 'cancel') {
      console.log('AuthContext: Google authentication was cancelled.');
      setLoading(false);
    } else if (response?.type === 'error') {
      console.error('AuthContext: Google authentication error:', response.error);
      setLoading(false);
      alert('Google authentication failed. Please try again.');
    }
  }, [response]);

  const exchangeCodeForToken = useCallback(async (code) => {
    setLoading(true);
    console.log('AuthContext: Calling backend /api/auth/exchange-code with code...');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/exchange-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user && data.token) {
          setUser(data.user);
          setAuthToken(data.token);
          await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
          console.log('AuthContext: Backend exchange successful. User set:', data.user.email);
        } else {
          setUser(null);
          setAuthToken(null);
          console.warn('AuthContext: Backend exchange failed: Missing user or token in response.', data);
          alert(data.error || 'Backend token exchange failed: Missing user or token.');
        }
      } else {
        const errorData = await res.json();
        console.error(`AuthContext: Backend exchange failed with status ${res.status}:`, errorData);
        throw new Error(`Backend exchange failed with status ${res.status}: ${errorData.error}`);
      }
    } catch (error) {
      console.error('AuthContext: Error during code exchange with backend:', error);
      setUser(null);
      setAuthToken(null);
      alert('Failed to connect to backend for authentication. Please check network.');
    } finally {
      setLoading(false);
      console.log('AuthContext: exchangeCodeForToken FINISHED. Loading set to false.');
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    console.log('AuthContext: checkAuthStatus STARTING.');
    setLoading(true); // Ensure loading is true at the start of this check
    try {
      const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      console.log('AuthContext: checkAuthStatus - Stored token:', storedToken ? 'Found' : 'Not found');

      if (storedToken) {
        console.log('AuthContext: Verifying stored token with backend /api/auth/verify-token...');
        const res = await fetch(`${API_BASE_URL}/api/auth/verify-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
            setAuthToken(storedToken);
            console.log('AuthContext: Existing token verified. User:', data.user.email);
          } else {
            console.warn('AuthContext: Token verification response not successful or missing user:', data);
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
            setUser(null);
            setAuthToken(null);
            console.log('AuthContext: Existing token invalid or expired, cleared.');
          }
        } else {
          const errorData = await res.json(); // Try to parse error response
          console.error(`AuthContext: Backend /verify-token failed with status ${res.status}:`, errorData);
          await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
          setUser(null);
          setAuthToken(null);
          console.log('AuthContext: Backend failed to verify existing token, cleared.');
        }
      } else {
        console.log('AuthContext: No stored token found during initial check. User remains null.');
        setUser(null); // Ensure user is null if no token
        setAuthToken(null); // Ensure authToken is null if no token
      }
    } catch (error) {
      console.error('AuthContext: ERROR during checkAuthStatus:', error);
      setUser(null);
      setAuthToken(null);
    } finally {
      setLoading(false);
      console.log('AuthContext: checkAuthStatus FINISHED. Loading set to false.');
    }
  }, []);

  useEffect(() => {
    console.log('AuthContext: Initial useEffect triggered for checkAuthStatus.');
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = () => {
    console.log('AuthContext: Login button pressed. Prompting Google Auth...');
    if (request && redirectUri) {
      promptAsync();
    } else {
      console.warn('AuthContext: Google Auth request or redirect URI not ready.');
      alert('Authentication service not ready. Please try again in a moment.');
    }
  };

  const logout = async () => {
    console.log('AuthContext: Logout initiated.');
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout-jwt`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      setUser(null);
      setAuthToken(null);
      console.log('AuthContext: User logged out successfully.');
    } catch (error) {
      console.error('AuthContext: Logout failed:', error);
      // Even if backend fails, clear client-side state for immediate logout experience
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      setUser(null);
      setAuthToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, authToken, request, promptAsync, redirectUri }}>
      {children}
    </AuthContext.Provider>
  );
}