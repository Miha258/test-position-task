import { Module } from '@nestjs/common';
import { PositionController } from './position.controller';
import { PositionService } from './position.service';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from "../prisma/prisma.module";
import { PositionRepository } from "./position.repository";
import { KafkaModule } from "../kafka/kafka.module";
import { PositionBroadcastService } from "./position-broadcast.service";
import { PositionGateway } from "./position.gateway";

@Module({
    imports: [RedisModule, PrismaModule, KafkaModule],
    controllers: [PositionController],
    providers: [PositionService, PositionGateway, PositionBroadcastService, PositionRepository],
    exports: [PositionService],
})
export class PositionModule {}