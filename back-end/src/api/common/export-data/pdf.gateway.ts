import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PaytradeLogger } from 'src/libs/@loggers/logger.service';

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
  private logger = new PaytradeLogger('EXPORT_DATA_GATEWAY');

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Function to notify a client that PDF is ready
  notifyClient(clientId: string, data: any) {
    this.logger.log(`Notifying client ${clientId}: ${JSON.stringify(data)}`);
    this.server.to(clientId).emit('pdf-ready', data);
    // Disconnect the client after sending the message
    this.server.to(clientId).emit('force-disconnect');
  }

  notifyAdminComliance(clientId: string, data: any) {
    this.logger.log(`Notifying admin about updated compliance check ${clientId}: ${JSON.stringify(data)}`);
    this.server.to(clientId).emit('compliance-updated', data);
    // Disconnect the client after sending the message
    this.server.to(clientId).emit('force-disconnect');
  }

}
