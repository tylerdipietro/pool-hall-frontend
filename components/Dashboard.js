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

  const [poolHalls, setPoolHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState(null);
  const [queue, setQueue] = useState([]);
  const [tables, setTables] = useState([]);

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [invitedTableId, setInvitedTableId] = useState(null);
  const [inviteTimer, setInviteTimer] = useState(30);
  const inviteIntervalRef = useRef(null);

  const [winRequest, setWinRequest] = useState(null);
  const [confirmingWin, setConfirmingWin] = useState(false);

  const [registerHallMode, setRegisterHallMode] = useState(false);
  const [newHallName, setNewHallName] = useState('');
  const [newHallLocation, setNewHallLocation] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [newHallTables, setNewHallTables] = useState(1);


  // Fetch pool halls on mount
  useEffect(() => {
    async function fetchPoolHalls() {
      try {
        const res = await fetch('https://api.tylerdipietro.com/api/pool-halls', {
  credentials: 'include',
});

        const data = await res.json();
        setPoolHalls(data);
      } catch (err) {
        console.error('Failed to load pool halls', err);
      }
    }
    fetchPoolHalls();
  }, []);

  // Join selected hall room & register user on socket connection
  useEffect(() => {
    if (!selectedHall || !user?._id) return;

  console.log('[register_user] Attempting with userId:', user._id);

  if (socket.connected) {
    socket.emit('register_user', { userId: user._id, hall: selectedHall._id });
  } else {
    socket.once('connect', () => {
      socket.emit('register_user', { userId: user._id, hall: selectedHall._id });
    });
  }

    // Join hall room
    socket.emit('join_hall', { hall: selectedHall._id });

    function handleStateUpdate({ queue: newQueue, tables: newTables }) {
      console.log('Received state update: ', { newQueue, newTables })
      setQueue(newQueue);
      setTables(newTables);
    }

    function handleInvite({ tableId }) {
      setInvitedTableId(tableId);
      setInviteModalVisible(true);
      setInviteTimer(30);

      if (inviteIntervalRef.current) clearInterval(inviteIntervalRef.current);

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
      setWinRequest(data);
    }

    socket.on('state_update', handleStateUpdate);
    socket.on('table_invite', handleInvite);
    socket.on('win_confirmation_request', handleWinRequest);

    return () => {
      socket.emit('leave_hall', { hallId: selectedHall._id });

      socket.off('state_update', handleStateUpdate);
      socket.off('table_invite', handleInvite);
      socket.off('win_confirmation_request', handleWinRequest);

      if (inviteIntervalRef.current) clearInterval(inviteIntervalRef.current);
    };
  }, [selectedHall, user]);

  // Win confirmation handlers
  const handleConfirmWin = () => {
    if (!winRequest || confirmingWin) return;
    setConfirmingWin(true);
    confirmWin(
      winRequest.tableId,
      winRequest.winnerId,
      winRequest.loserId,
      true,
      (response) => {
        setConfirmingWin(false);
        if (response?.success) setWinRequest(null);
      }
    );
  };

  const handleRejectWin = () => setWinRequest(null);

  // Queue & table handlers
  const handleJoinQueue = () => {
    if (user?._id && selectedHall?._id) {
      joinQueue(user._id, selectedHall._id);
    }
  };

  const handleLeaveQueue = () => {
    if (user?._id && selectedHall?._id) {
      socket.emit('leave-queue', { userId: user._id, hallId: selectedHall._id });
    }
  };

  const handleClearQueue = () => {
    if (selectedHall?._id) clearQueue(selectedHall._id);
  };

  const handleClearTables = () => {
    if (selectedHall?._id) clearTables(selectedHall._id);
  };

  // Queue admin moves/removes
  const moveUp = (userId) => {
    if (userId && selectedHall?._id) {
      socket.emit('queue_move_up', { userId, hallId: selectedHall._id });
    }
  };
  const moveDown = (userId) => {
    if (userId && selectedHall?._id) {
      socket.emit('queue_move_down', { userId, hallId: selectedHall._id });
    }
  };
  const removeEntrant = (userId) => {
    if (userId && selectedHall?._id) {
      socket.emit('queue_remove', { userId, hallId: selectedHall._id });
    }
  };

  // Invite modal accept/skip handlers
  const handleAcceptInvite = () => {
    if (!invitedTableId || !user?._id) return;

    socket.emit('accept_invite', { tableId: invitedTableId, userId: user._id });

    if (inviteIntervalRef.current) clearInterval(inviteIntervalRef.current);

    setInviteModalVisible(false);
    setInvitedTableId(null);
  };

  const handleSkipInvite = () => {
    if (!user?._id) return;

    socket.emit('skip_invite', { userId: user._id, tableId: invitedTableId });

    if (inviteIntervalRef.current) clearInterval(inviteIntervalRef.current);

    setInviteModalVisible(false);
    setInvitedTableId(null);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      const res = await fetch('https://api.tylerdipietro.com/api/auth/logout', {
        method: 'GET',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        if (user?._id) socket.emit('logout', user._id);
        setUser(null);
      } else {
        console.error('Logout response error:', data);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Register new hall submit handler (unchanged)
 const handleRegisterHallSubmit = async (e) => {
  e.preventDefault();

  try {
    const response = await fetch('https://api.tylerdipietro.com/api/pool-halls', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // Important to send cookies
  body: JSON.stringify({
    name: newHallName,
    location: newHallLocation,
    numberOfTables: newHallTables,
  }),
});


    const data = await response.json();

    if (response.ok) {
      setRegisterSuccess('Pool hall registered successfully!');
      setRegisterError('');
      // Reset form or close modal
    } else {
      setRegisterError(data.message || 'Failed to register pool hall');
      setRegisterSuccess('');
    }
  } catch (error) {
    setRegisterError('Server error');
    setRegisterSuccess('');
  }
};


  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in to see your dashboard</div>;

  if (!selectedHall && !registerHallMode) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: 20 }}>
        <h2>Select a Pool Hall</h2>
        {poolHalls.length === 0 ? (
          <p>No pool halls available.</p>
        ) : (
          <ul>
            {poolHalls.map((hall) => (
              <li key={hall._id} style={{ marginBottom: 10 }}>
                <button onClick={() => setSelectedHall(hall)}>{hall.name}</button>
              </li>
            ))}
          </ul>
        )}

        {user.isAdmin && (
          <button onClick={() => setRegisterHallMode(true)} style={{ marginTop: 20 }}>
            Register New Pool Hall
          </button>
        )}

        <button onClick={handleLogout} style={{ marginTop: 20 }}>
          Logout
        </button>
      </div>
    );
  }

  if (registerHallMode) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: 20 }}>
        <h2>Register New Pool Hall</h2>
        <form onSubmit={handleRegisterHallSubmit}>
          <div style={{ marginBottom: 10 }}>
            <label>
              Name:
              <input
                type="text"
                value={newHallName}
                onChange={(e) => setNewHallName(e.target.value)}
                required
                style={{ width: '100%', padding: 8, marginTop: 4 }}
              />
            </label>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>
              Location:
              <input
                type="text"
                value={newHallLocation}
                onChange={(e) => setNewHallLocation(e.target.value)}
                required
                style={{ width: '100%', padding: 8, marginTop: 4 }}
              />
            </label>
          </div>

          <div style={{ marginBottom: 10 }}>
  <label>
    Number of Tables:
    <input
      type="number"
      min="1"
      value={newHallTables}
      onChange={(e) => setNewHallTables(Number(e.target.value))}
      required
      style={{ width: '100%', padding: 8, marginTop: 4 }}
    />
  </label>
</div>


          {registerError && <p style={{ color: 'red' }}>{registerError}</p>}
          {registerSuccess && <p style={{ color: 'green' }}>{registerSuccess}</p>}

          <button type="submit" style={{ marginRight: 10 }}>
            Register Pool Hall
          </button>
          <button type="button" onClick={() => setRegisterHallMode(false)}>
            Cancel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <h2>Welcome, {user.displayName || user.username}</h2>
      <h3>Pool Hall: {selectedHall.name}</h3>
      <button onClick={() => setSelectedHall(null)} style={{ marginBottom: 10 }}>
        Change Pool Hall
      </button>
      <button onClick={handleLogout} style={{ marginBottom: 20 }}>
        Logout
      </button>

      <div style={{ marginBottom: 20 }}>
        <button onClick={handleJoinQueue}>Join Queue</button>{' '}
        <button onClick={handleLeaveQueue}>Leave Queue</button>

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

              {user?.isAdmin && (
                <>
                  {' '}
                  {index > 0 && (
                    <button onClick={() => moveUp(entry.user?._id || entry.userId)}>⬆️</button>
                  )}
                  {index < queue.length - 1 && (
                    <button onClick={() => moveDown(entry.user?._id || entry.userId)}>⬇️</button>
                  )}
                  <button onClick={() => removeEntrant(entry.user?._id || entry.userId)}>❌</button>
                </>
              )}
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
          <button
            onClick={handleConfirmWin}
            disabled={confirmingWin}
            style={{ marginRight: 10 }}
          >
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
