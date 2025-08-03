import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { Position } from '../prisma/client';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PositionRepository } from './position.repository';
import {KafkaService} from "../kafka/kafka.service";

@Injectable()
export class PositionService {
    constructor(
        private readonly redisService: RedisService,
        private readonly positionRepository: PositionRepository,
        private readonly kafkaService: KafkaService,
    ) {}

    /** Отримати всі активні позиції користувача (Redis) */
    async getActivePositions(userId: string): Promise<Position[]> {
        const setKey = `positions:${userId}`;
        const ids = await this.redisService.getClient().sMembers(setKey);

        if (!ids || ids.length === 0) return [];

        const pipeline = this.redisService.getClient().multi();

        for (const id of ids) {
            pipeline.hGetAll(`position:${id}`);
        }

        const results = await pipeline.exec();

        if (!results) return [];

        return results
            .map((r: any) => {
                return {
                    ...r,
                    entry: parseFloat(r.entry),
                    leverage: parseFloat(r.leverage),
                    quantity: parseFloat(r.quantity),
                    deposit: parseFloat(r.deposit),
                    pnl: parseFloat(r.pnl),
                    takeProfit: r.takeProfit ? parseFloat(r.takeProfit) : undefined,
                    stopLoss: r.stopLoss ? parseFloat(r.stopLoss) : undefined,
                };
            })
    }


    /** Отримати одну активну позицію по ID (Redis) */
    async getActivePositionById(positionId: string): Promise<Position | null> {
        const key = `position:${positionId}`;
        const raw = await this.redisService.hgetall(key);

        if (!raw || Object.keys(raw).length === 0) return null;
        //@ts-ignore
        return {
            ...raw,
            entry: parseFloat(raw.entry),
            leverage: parseFloat(raw.leverage),
            quantity: parseFloat(raw.quantity),
            deposit: parseFloat(raw.deposit),
            pnl: parseFloat(raw.pnl),
            takeProfit: raw.takeProfit ? parseFloat(raw.takeProfit) : null,
            stopLoss: raw.stopLoss ? parseFloat(raw.stopLoss) : null,
        };
    }

    /** Отримати історію позицій користувача (DB) */
    async getPositionHistory(userId: string): Promise<Position[]> {
        return this.positionRepository.findManyByUser(userId);
    }

    /** Створити позицію — запис у Redis та БД */
    async createPosition(userId: string, dto: CreatePositionDto): Promise<Position> {
        const created = await this.positionRepository.create(userId, dto);
        await this.kafkaService.emit('position-opened', created)
        return created;
    }

    async updatePosition(userId: string, positionId: string, dto: UpdatePositionDto): Promise<Position> {
        const updated = await this.positionRepository.update(positionId, dto);
        await this.kafkaService.emit('position-updated', {
            userId,
            id: positionId,
            ...dto,
        });
        return updated;
    }
}
