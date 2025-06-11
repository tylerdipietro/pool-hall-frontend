import 'expo-dev-client';
import React, { useState, useEffect, useContext } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, Platform } from 'react-native';
import Dashboard from './components/Dashboard';
import LoginScreen from './components/LoginScreen';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import io from 'socket.io-client';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:3000';

function AppInner() {
  // CORRECTED: Destructure 'loading' from AuthContext
  const { user, setUser, loading } = useContext(AuthContext);

  const [queue, setQueue] = useState([]);
  const [tables, setTables] = useState([]);
  const [socket, setSocket] = useState(null);
  // REMOVED: No longer need this local loading state, AuthContext manages it
  // const [loading, setLoading] = useState(true);

  // Setup socket only if user is logged in
  useEffect(() => {
    if (!user) return;

    const socketClient = io(API_BASE_URL, {
      withCredentials: true,
      // don't send token since you use cookie sessions
    });

    setSocket(socketClient);

    socketClient.on('state_update', ({ queue, tables }) => {
      setQueue(queue);
      setTables(tables);
    });

    socketClient.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    return () => {
      socketClient.disconnect();
    };
  }, [user]);

  // Now, this 'loading' refers to the one from AuthContext
  if (loading) {
    return <Text style={{ textAlign: 'center', marginTop: 50 }}>Loading...</Text>;
  }

  if (!user) {
    // Not logged in, show LoginScreen
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Pool Hall Waitlist</Text>
        <Dashboard queue={queue} tables={tables} socket={socket} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 50, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
});