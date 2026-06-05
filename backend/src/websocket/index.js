const WebSocket = require('ws');
const { pool } = require('../db');

let wss;
const clients = new Map(); // userId -> ws

const broadcast = (data, excludeUserId = null) => {
  const msg = JSON.stringify(data);
  clients.forEach((ws, userId) => {
    if (userId !== excludeUserId && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
};

const broadcastAll = (data) => {
  const msg = JSON.stringify(data);
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
};

const getDraftState = async () => {
  const client = await pool.connect();
  try {
    const { rows: [state] } = await client.query('SELECT * FROM draft_state WHERE id = 1');
    const { rows: picks } = await client.query(`
      SELECT dp.*, t.name as team_name, t.country_code, t.group_name, t.pot,
             u.name as user_name, u.emoji
      FROM draft_picks dp
      JOIN teams t ON dp.team_id = t.id
      JOIN users u ON dp.user_id = u.id
      ORDER BY dp.pick_number ASC
    `);
    const { rows: users } = await client.query('SELECT * FROM users ORDER BY created_at ASC');
    const { rows: teams } = await client.query('SELECT * FROM teams ORDER BY group_name, pot');

    // Get available teams
    const pickedTeamIds = picks.map(p => p.team_id);
    const availableTeams = teams.filter(t => !pickedTeamIds.includes(t.id));

    return { state, picks, users, availableTeams, allTeams: teams };
  } finally {
    client.release();
  }
};

const getCurrentPicker = (state) => {
  if (!state || state.status !== 'active') return null;
  const order = state.draft_order || [];
  if (order.length === 0) return null;

  const pickIndex = (state.current_pick - 1) % order.length;
  // Snake draft: reverse order on even rounds
  const roundIndex = Math.floor((state.current_pick - 1) / order.length);
  const isReversed = roundIndex % 2 === 1;
  const effectiveIndex = isReversed ? order.length - 1 - pickIndex : pickIndex;
  return order[effectiveIndex];
};

const setupWebSocket = (server) => {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    let userId = null;

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      const client = await pool.connect();
      try {
        switch (msg.type) {
          case 'join': {
            userId = msg.userId;
            clients.set(userId, ws);

            // Send current draft state to new joiner
            const draftData = await getDraftState();
            ws.send(JSON.stringify({ type: 'draft_state', ...draftData }));

            // Notify others
            broadcastAll({ type: 'user_joined', userId, users: draftData.users });
            break;
          }

          case 'shuffle_order': {
            const { rows: [stateCheck] } = await client.query('SELECT * FROM draft_state WHERE id = 1');
            if (stateCheck.status !== 'waiting') break;
            const { rows: [commCheck] } = await client.query('SELECT * FROM users WHERE id = $1', [msg.userId]);
            if (!commCheck?.is_commissioner) break;

            const { rows: allUsers } = await client.query('SELECT id FROM users ORDER BY created_at ASC');
            const shuffled = allUsers.map(u => u.id).sort(() => Math.random() - 0.5);
            await client.query(
              'UPDATE draft_state SET pending_order = $1 WHERE id = 1',
              [JSON.stringify(shuffled)]
            );
            const draftData = await getDraftState();
            broadcastAll({ type: 'order_shuffled', pendingOrder: shuffled, ...draftData });
            break;
          }

          case 'start_draft': {
            const { rows: [state] } = await client.query('SELECT * FROM draft_state WHERE id = 1');
            if (state.status !== 'waiting') break;

            // Check user is commissioner
            const { rows: [user] } = await client.query('SELECT * FROM users WHERE id = $1', [msg.userId]);
            if (!user?.is_commissioner) {
              ws.send(JSON.stringify({ type: 'error', message: 'Only the commissioner can start the draft' }));
              break;
            }

            const { rows: users } = await client.query('SELECT id FROM users ORDER BY created_at ASC');
            if (users.length < 2) {
              ws.send(JSON.stringify({ type: 'error', message: 'Need at least 2 players to start' }));
              break;
            }

            // Use shuffled order if set, otherwise join order
            const pendingOrder = state.pending_order?.length > 0 ? state.pending_order : null;
            const draftOrder = pendingOrder || users.map(u => u.id);
            const totalPicks = 48; // All 48 teams

            await client.query(`
              UPDATE draft_state SET
                status = 'active',
                current_pick = 1,
                total_picks = $1,
                draft_order = $2,
                started_at = NOW()
              WHERE id = 1
            `, [totalPicks, JSON.stringify(draftOrder)]);

            const draftData = await getDraftState();
            broadcastAll({ type: 'draft_started', ...draftData });
            break;
          }

          case 'make_pick': {
            const { rows: [state] } = await client.query('SELECT * FROM draft_state WHERE id = 1');
            if (state.status !== 'active') break;

            const currentPicker = getCurrentPicker(state);
            if (currentPicker !== msg.userId) {
              ws.send(JSON.stringify({ type: 'error', message: "It's not your turn!" }));
              break;
            }

            // Verify team not already picked
            const { rows: existing } = await client.query(
              'SELECT id FROM draft_picks WHERE team_id = $1', [msg.teamId]
            );
            if (existing.length > 0) {
              ws.send(JSON.stringify({ type: 'error', message: 'Team already picked' }));
              break;
            }

            const roundNum = Math.floor((state.current_pick - 1) / state.draft_order.length) + 1;

            await client.query(`
              INSERT INTO draft_picks (user_id, team_id, pick_number, round_number)
              VALUES ($1, $2, $3, $4)
            `, [msg.userId, msg.teamId, state.current_pick, roundNum]);

            const newPickNumber = state.current_pick + 1;
            const isDone = newPickNumber > state.total_picks;

            await client.query(`
              UPDATE draft_state SET
                current_pick = $1,
                status = $2,
                completed_at = $3
              WHERE id = 1
            `, [newPickNumber, isDone ? 'completed' : 'active', isDone ? new Date() : null]);

            const draftData = await getDraftState();
            const nextPicker = isDone ? null : getCurrentPicker({
              ...state,
              current_pick: newPickNumber,
            });

            broadcastAll({
              type: 'pick_made',
              pickNumber: state.current_pick,
              userId: msg.userId,
              teamId: msg.teamId,
              nextPickerId: nextPicker,
              ...draftData,
            });
            break;
          }

          case 'pause_draft': {
            const { rows: [user] } = await client.query('SELECT * FROM users WHERE id = $1', [msg.userId]);
            if (!user?.is_commissioner) break;
            await client.query("UPDATE draft_state SET status = 'paused' WHERE id = 1");
            broadcastAll({ type: 'draft_paused' });
            break;
          }

          case 'resume_draft': {
            const { rows: [user] } = await client.query('SELECT * FROM users WHERE id = $1', [msg.userId]);
            if (!user?.is_commissioner) break;
            await client.query("UPDATE draft_state SET status = 'active' WHERE id = 1");
            const draftData = await getDraftState();
            broadcastAll({ type: 'draft_resumed', ...draftData });
            break;
          }
        }
      } catch (err) {
        console.error('WS error:', err);
        ws.send(JSON.stringify({ type: 'error', message: 'Server error' }));
      } finally {
        client.release();
      }
    });

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        broadcast({ type: 'user_left', userId });
      }
    });

    ws.on('error', (err) => console.error('WebSocket error:', err));
  });

  return wss;
};

module.exports = { setupWebSocket, broadcastAll, getCurrentPicker };
