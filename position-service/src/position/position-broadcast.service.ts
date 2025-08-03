import { Injectable, OnModuleInit } from '@nestjs/common';
import { PositionGateway } from './position.gateway';
import Redis from 'ioredis';

@Injectable()
export class PositionBroadcastService implements OnModuleInit {
    private readonly redisSub = new Redis();

    constructor(private readonly gateway: PositionGateway) {}

    async onModuleInit() {
        await this.redisSub.subscribe('ws-update');
        this.redisSub.on('message', (channel, message) => {
            if (channel === 'ws-update') {
                const data = JSON.parse(message);
                this.gateway.broadcastPositionUpdate(data);
            }
        });
    }
}
