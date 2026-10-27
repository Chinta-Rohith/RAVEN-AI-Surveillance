import { useState, useEffect, useRef } from 'react';
import type { TelemetryPayload } from '../types/raven';
import { WS_URL } from '../services/api';

export function useRavenWebSocket() {
  const [telemetry, setTelemetry] = useState<TelemetryPayload | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimer: any = null;

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data: TelemetryPayload = JSON.parse(event.data);
          setTelemetry(data);
        } catch (err) {
          // ignore ping/pong or non-telemetry
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimer = setTimeout(connect, 1500);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const sendAction = (action: string, payload: Record<string, any> = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...payload }));
    }
  };

  return { telemetry, isConnected, sendAction };
}
