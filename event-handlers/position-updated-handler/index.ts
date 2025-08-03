import { createConsumer } from '../common/kafka';
import { prisma } from '../common/prisma';
import { redis } from '../common/redis';
import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
import {PositionSide} from "@prisma/client";

dotenv.config({
    path: `${__dirname}/../.env`
});

const kafka = new Kafka({ clientId: 'position-updated-handler', brokers: ['localhost:9092'] });
const producer = kafka.producer();

function calculatePnLAndLiquidation(position: any) {
    const { entry, currentPrice, leverage, deposit, side } = position;
    const priceDiff = side === 'long' ? currentPrice - entry : entry - currentPrice;
    const pnl = priceDiff * (deposit * leverage) / entry;

    const liquidation = side === 'long'
        ? entry - (entry / leverage)
        : entry + (entry / leverage);

    return { pnl, liquidation };
}

async function evaluateAndForward(position: any) {
    const { id, currentPrice, takeProfit, stopLoss, side, entry, leverage, deposit } = position;
    const price = currentPrice;

    const { pnl, liquidation } = calculatePnLAndLiquidation({ entry, currentPrice, leverage, deposit, side });

    let reason: 'liquidated' | 'take-profit' | 'stop-loss' | null = null;

    if (price <= liquidation && side === PositionSide.long) {
        reason = 'liquidated';
    } else if (price >= liquidation && side === PositionSide.short) {
        reason = 'liquidated';
    } else if (takeProfit && ((side === PositionSide.long && price >= takeProfit) || (side === PositionSide.short && price <= takeProfit))) {
        reason = 'take-profit';
    } else if (stopLoss && ((side === PositionSide.long && price <= stopLoss) || (side === PositionSide.short && price >= stopLoss))) {
        reason = 'stop-loss';
    }

    if (!reason) return;

    const topic = reason === 'liquidated' ? 'position-liquidated' : 'position-closed';

    await producer.send({
        topic,
        messages: [
            {
                key: id,
                value: JSON.stringify({
                    ...position,
                    pnl,
                    liquidation,
                    reason,
                    closedAt: new Date().toISOString(),
                }),
            },
        ],
    });

    console.log(`📤 Forwarded position ${id} to topic ${topic} [${reason}]`);
}

async function main() {
    await producer.connect();

    createConsumer('position-updated', 'position-updated-group', async ({ message }) => {
        const payload = message.value?.toString();
        if (!payload) return;

        const data = JSON.parse(payload);
        console.log('🔄 [position-updated]', data);

        const { positionId, currentPrice } = data;

        const position = await prisma.position.findUnique({ where: { id: positionId } });
        if (!position) return;

        const updatedPosition = { ...position, currentPrice };
        const { pnl, liquidation } = calculatePnLAndLiquidation(updatedPosition);

        await prisma.position.update({
            where: { id: positionId },
            data: {
                pnl,
                liquidation,
                updatedAt: new Date(),
            },
        });

        const positionKey = `position:${positionId}`;
        const redisPosition = await redis.hgetall(positionKey);
        const isEmpty = Object.keys(redisPosition).length === 0;

        const updatedRedisPosition = {
            ...(isEmpty ? position : redisPosition),
            currentPrice: String(currentPrice),
            pnl: String(pnl),
            liquidation: String(liquidation),
            updatedAt: new Date().toISOString(),
        };

        await redis
            .multi()
            .hset(positionKey, updatedRedisPosition)
            .exec();

        const pubData = {
            event: 'position-updated',
            userId: position.userId,
            positionId: positionId,
            currentPrice,
            pnl,
            liquidation,
            symbol: position.symbol,
            updatedAt: updatedRedisPosition.updatedAt,
        }
        await redis.publish(
            'ws-update',
            JSON.stringify(pubData)
        );
        await evaluateAndForward({ ...position, currentPrice, pnl, liquidation });
    });
}

main();
