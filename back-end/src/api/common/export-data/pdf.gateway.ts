import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['polling', 'websocket'],
})
export class ExportDataGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Function to notify a client that PDF is ready
  notifyClient(clientId: string, data: any) {
    console.log(`Notifying client ${clientId}:`, data);
    this.server.to(clientId).emit('pdf-ready', data);
    // Disconnect the client after sending the message
    this.server.to(clientId).emit('force-disconnect');
  }

  notifyAdminComliance(clientId: string, data: any) {
    console.log(`Notifying admin about updated compliance check ${clientId}:`, data);
    this.server.to(clientId).emit('compliance-updated', data);
    // Disconnect the client after sending the message
    this.server.to(clientId).emit('force-disconnect');
  }

}
