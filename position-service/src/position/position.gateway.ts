import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
@Injectable()
export class PositionGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(PositionGateway.name);
    private userSocketMap = new Map<string, string>();

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        for (const [userId, socketId] of this.userSocketMap.entries()) {
            if (socketId === client.id) {
                this.userSocketMap.delete(userId);
                break;
            }
        }
    }

    @SubscribeMessage('register')
    handleRegister(
        @MessageBody() data: { userId: string },
        @ConnectedSocket() client: Socket,
    ) {
        this.logger.log(`Registering user ${data.userId} to socket ${client.id}`);
        this.userSocketMap.set(data.userId, client.id);
    }

    broadcastPositionUpdate(data: any) {
        const { userId } = data;

        const socketId = this.userSocketMap.get(userId);
        if (socketId) {
            this.logger.log(`Sending position update to user ${userId}`);
            this.server.to(socketId).emit('position-update', data);
        } else {
            this.logger.warn(`No connected socket for user ${userId}`);
        }
    }
}
