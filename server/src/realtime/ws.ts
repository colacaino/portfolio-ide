import { Server as HttpServer } from 'http';
import { WebSocketServer } from 'ws';

type WsEvent =
  | { type: 'file.created'; payload: { id: number; name: string; content: string; language: string } }
  | { type: 'file.updated'; payload: { id: number; name: string; content: string; language: string } }
  | { type: 'file.deleted'; payload: { id: number } };

let wss: WebSocketServer | null = null;

export const initWebSocket = (server: HttpServer) => {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'ws.connected' }));
  });
};

export const broadcast = (event: WsEvent) => {
  if (!wss) return;
  const message = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
};
