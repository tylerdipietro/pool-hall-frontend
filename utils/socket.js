import { io } from 'socket.io-client';

import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:3000';

let socket;

export function initSocket() {
  if (!socket) {
    socket = io(API_BASE_URL, {
      autoConnect: true,
      // Optional: transports: ['websocket']
    });
  }
  return socket;
}

function emit(event, payload) {
  if (!socket) initSocket();
  socket.emit(event, payload);
}

// Client joins the matchmaking queue
export function joinQueue(userId) {
  console.log('joinQueue called with userId:', userId);
  emit('join_queue', userId);
}

// Client joins a specific table
export function joinTable(tableId, userId) {
  emit('join_table', { tableId, userId });
}

// Player claims a win (sends winnerId to server)
export function claimWin(tableId, winnerId) {
  console.log('[claimWin] Emitting claim_win', { tableId, winnerId });
  emit('claim_win', { tableId, winnerId });
}

export const confirmWin = (tableId, winnerId, loserId, confirmed, cb) => {
  socket.emit('confirm_win', { tableId, winnerId, loserId, confirmed }, cb);
};



// Admin clears the queue
export function clearQueue() {
  emit('admin:clear_queue');
}

// Admin clears all tables
export function clearTables() {
  emit('admin:clear_tables');
}

// Admin forcibly removes a player from a table
export function removePlayer(tableId, userId) {
  emit('admin:remove_player', { tableId, userId });
}

// Export socket instance as default for use in components
export default initSocket();
