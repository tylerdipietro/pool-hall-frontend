// frontend/screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import socket from '../utils/socket';
import Dashboard from '../components/Dashboard';

export default function HomeScreen() {
  const [tables, setTables] = useState([]);
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    socket.on('tables:update', (updatedTables) => {
      setTables(updatedTables);
    });

    socket.on('queue:update', (updatedQueue) => {
      setQueue(updatedQueue);
    });

    return () => {
      socket.off('tables:update');
      socket.off('queue:update');
    };
  }, []);

  return (
    <View>
      <Dashboard tables={tables} queue={queue} />
    </View>
  );
}
