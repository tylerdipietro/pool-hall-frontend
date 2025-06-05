import React, { useContext, useEffect, useState, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import TableCard from './TableCard';
import socket, {
  joinQueue,
  clearQueue,
  clearTables,
  logoutUser,
  confirmWin
} from '../utils/socket';

export default function Dashboard() {
  const { user, setUser, loading } = useContext(AuthContext);

  const [queue, setQueue] = useState([]);
  const [tables, setTables] = useState([]);

  // Invitation modal state
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [invitedTableId, setInvitedTableId] = useState(null);
  const [inviteTimer, setInviteTimer] = useState(30);
  const inviteIntervalRef = useRef(null);

  // Win request state
  const [winRequest, setWinRequest] = useState(null);
  const [confirmingWin, setConfirmingWin] = useState(false);

  useEffect(() => {
    function handleStateUpdate({ queue, tables }) {
      console.log('Received state_update with queue:', queue, 'tables:', tables);
      setQueue(queue);
      setTables(tables);
    }

    function handleInvite(tableId) {
      setInvitedTableId(tableId);
      setInviteModalVisible(true);
      setInviteTimer(30);

      // Clear any existing timer
      if (inviteIntervalRef.current) {
        clearInterval(inviteIntervalRef.current);
      }

      // Start countdown timer
      inviteIntervalRef.current = setInterval(() => {
        setInviteTimer((prev) => {
          if (prev <= 1) {
            clearInterval(inviteIntervalRef.current);
            handleSkipInvite();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    function handleWinRequest(data) {
      console.log('Received win confirmation request:', data);
      setWinRequest(data);
    }

    socket.on('state_update', handleStateUpdate);
    socket.on('table_invite', ({ tableId }) => {
      handleInvite(tableId);
    });
    socket.on('win_confirmation_request', handleWinRequest);

    return () => {
      socket.off('state_update', handleStateUpdate);
      socket.off('invite:joinTable', handleInvite);
      socket.off('win_confirmation_request', handleWinRequest);
      if (inviteIntervalRef.current) {
        clearInterval(inviteIntervalRef.current);
      }
    };
  }, []);

  const handleConfirmWin = () => {
    if (!winRequest || confirmingWin) return;
    setConfirmingWin(true);
    confirmWin(
      winRequest.tableId,
      winRequest.winnerId,
      winRequest.loserId,
      true,
      (response) => {
        console.log('Confirm win callback:', response);
        setConfirmingWin(false);
        if (response?.success) {
          setWinRequest(null);
        }
      }
    );
  };

  const handleRejectWin = () => {
    setWinRequest(null);
  };

  const handleJoinQueue = () => {
    if (user?._id) joinQueue(user._id);
  };

  const handleClearQueue = () => clearQueue();
  const handleClearTables = () => clearTables();

  const handleAcceptInvite = () => {
    if (!invitedTableId) return;
    socket.emit('accept_invite', { tableId: invitedTableId, userId: user._id });
    clearInterval(inviteIntervalRef.current);
    setInviteModalVisible(false);
    setInvitedTableId(null);
  };

  const handleSkipInvite = () => {
    socket.emit('skip_invite', { userId: user._id, tableId: invitedTableId });
    clearInterval(inviteIntervalRef.current);
    setInviteModalVisible(false);
    setInvitedTableId(null);
  };

  const handleLogout = async () => {
  try {
    const res = await fetch('https://pool-hall-waitlist-3b8c64cbf25d.herokuapp.com/api/auth/logout', {
      method: 'GET',
      credentials: 'include',
    });
    const data = await res.json();
    if (data.success) {
      setUser(null);
    } else {
      console.error('Logout response error:', data);
    }
  } catch (error) {
    console.error('Logout failed:', error);
  }
};


  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in to see your dashboard</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <h2>Welcome, {user.displayName || user.username}</h2>
      <button onClick={handleLogout} style={{ marginBottom: 20 }}>
        Logout
      </button>

      <div style={{ marginBottom: 20 }}>
        <button onClick={handleJoinQueue}>Join Queue</button>{' '}
        <button onClick={() => socket.emit('leave-queue', { userId: user._id })}>
  Leave Queue
</button>

        {user.isAdmin && (
          <>
            <button onClick={handleClearQueue} style={{ marginLeft: 10 }}>
              Clear Queue
            </button>
            <button onClick={handleClearTables} style={{ marginLeft: 10 }}>
              Clear All Tables
            </button>
          </>
        )}
      </div>

      <h3>Queue:</h3>
      {queue.length === 0 ? (
        <p>The queue is currently empty.</p>
      ) : (
        <ol>
          {queue.map((entry, index) => (
            <li key={entry.user?._id || entry.userId || index}>
              {entry.user?.username || 'Unnamed User'}
            </li>
          ))}
        </ol>
      )}

      <h3>Tables:</h3>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          marginTop: 12,
        }}
      >
        {tables.map((table, index) => (
          <TableCard key={table._id ?? table.tableNumber ?? index} table={table} />
        ))}
      </div>

      {/* Win Confirmation Modal */}
      {winRequest && (
        <div
          style={{
            position: 'fixed',
            top: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'white',
            border: '1px solid #ccc',
            padding: 20,
            zIndex: 1000,
          }}
        >
          <h4>Your opponent claims they won. Confirm?</h4>
          <button onClick={handleConfirmWin} disabled={confirmingWin} style={{ marginRight: 10 }}>
            {confirmingWin ? 'Confirming...' : 'Confirm'}
          </button>
          <button onClick={handleRejectWin}>Reject</button>
        </div>
      )}

      {/* Invitation Modal */}
      {inviteModalVisible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 10,
              textAlign: 'center',
              minWidth: 300,
            }}
          >
            <p>You have been invited to join table {invitedTableId}</p>
            <p>Time remaining: {inviteTimer} seconds</p>
            <button onClick={handleAcceptInvite}>Accept Invite</button>{' '}
            <button onClick={handleSkipInvite}>Skip</button>
          </div>
        </div>
      )}
    </div>
  );
}
