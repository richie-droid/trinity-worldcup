import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = process.env.REACT_APP_WS_URL ||
  (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
  (process.env.REACT_APP_API_HOST || window.location.host.replace(':3000', ':3001')) + '/ws';

export const useWebSocket = (userId) => {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);
  const [draftState, setDraftState] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      setConnected(true);
      if (userId) {
        ws.current.send(JSON.stringify({ type: 'join', userId }));
      }
    };

    ws.current.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        setLastEvent(msg);

        if (['draft_state', 'draft_started', 'pick_made', 'draft_resumed', 'order_shuffled', 'draft_ended'].includes(msg.type)) {
          setDraftState(msg);
        }
      } catch (err) {
        console.error('WS parse error', err);
      }
    };

    ws.current.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.current.onerror = () => {
      ws.current?.close();
    };
  }, [userId]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not open, readyState:', ws.current?.readyState);
    }
  }, []);

  return { connected, draftState, lastEvent, send };
};
