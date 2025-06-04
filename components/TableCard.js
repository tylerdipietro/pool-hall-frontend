import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import socket, {
  joinTable,
  claimWin,
  removePlayer,
} from '../utils/socket';

export default function TableCard({ table }) {
  const { user } = useContext(AuthContext);
  

  const handleJoinTable = () => {
    if (user?._id && table?._id) {
      socket.emit('join_table', { tableId: table._id, userId: user._id });
    }
  };

  const handleClaimWin = () => {
    if (user?._id && table?._id) {
      claimWin(table._id, user._id);
    }
  };

  const handleAcceptInvite = () => {
    if (invite && user?._id) {
      socket.emit('accept_invite', { tableId: invite.tableId, userId: user._id });
      setInvite(null);
    }
  };

  const handleSkipInvite = () => {
    if (invite && user?._id) {
      socket.emit('skip_invite', { tableId: invite.tableId, userId: user._id });
      setInvite(null);
    }
  };

  const handleRemovePlayer = (playerId) => {
    if (table?._id && playerId) {
      removePlayer(table._id, playerId);
    }
  };

  const players = table?.players ?? [];

  useEffect(() => {
    if (user?._id) {
      socket.emit('register_user', { userId: user._id });
    }
  }, [user]);

  return (
    <>

      <div
        style={{
          border: '1px solid #ccc',
          padding: 10,
          marginBottom: 10,
          borderRadius: 5,
        }}
      >
        <h4>Table {table?.tableNumber ?? 'Unknown'}</h4>
        <strong>Players:</strong>
        <ul>
          {players.map((p, idx) => {
            const player = p?.user;
            const playerId = player?._id ?? idx;
            const displayName = player?.displayName || player?.username || 'Unknown Player';

            return (
              <li key={playerId} style={{ marginBottom: 6 }}>
                {displayName}
                {user?.isAdmin && player?._id && (
                  <button onClick={() => handleRemovePlayer(player._id)} style={{ marginLeft: 10 }}>
                    Remove Player
                  </button>
                )}
                {user?._id === player?._id && (
                  <button onClick={handleClaimWin} style={{ marginLeft: 10 }}>
                    I WON
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {players.length < 2 && <button onClick={handleJoinTable}>Join Table</button>}
      </div>
    </>
  );
}
