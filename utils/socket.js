import { io } from 'socket.io-client';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:3000';

let socket;

export function initSocket() {
  if (!socket) {
    socket = io(API_BASE_URL, {
      autoConnect: true,
      // transports: ['websocket'], // Optional
    });
  }
  return socket;
}

function emit(event, payload) {
  if (!socket) initSocket();
  socket.emit(event, payload);
}

// Client joins the matchmaking queue in a hall
export function joinQueue(userId, hallId) {
  console.log('joinQueue called with', { userId, hallId });
  emit('join_queue', { userId, hallId });
}

// Client leaves the queue in a hall
export function leaveQueue(userId, hallId) {
  emit('leave_queue', { userId, hallId });
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

// Confirm or reject a win claim, with callback
export const confirmWin = (tableId, winnerId, loserId, confirmed, cb) => {
  if (!socket) initSocket();
  socket.emit('confirm_win', { tableId, winnerId, loserId, confirmed }, cb);
};

// Admin clears the queue for a hall
export function clearQueue(hallId) {
  emit('admin:clear_queue', { hallId });
}

// Admin clears all tables for a hall
export function clearTables(hallId) {
  emit('admin:clear_tables', { hallId });
}

// Admin forcibly removes a player from a table
export function removePlayer(tableId, userId) {
  emit('admin:remove_player', { tableId, userId });
}

// Admin moves a user up in the queue for a hall
export function moveUp(userId, hallId) {
  emit('queue_move_up', { userId, hallId });
}

// Admin moves a user down in the queue for a hall
export function moveDown(userId, hallId) {
  emit('queue_move_down', { userId, hallId });
}

// Admin removes a user from the queue for a hall
export function removeEntrant(userId, hallId) {
  emit('queue_remove', { userId, hallId });
}

export default initSocket();
