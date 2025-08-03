import { createConsumer } from '../common/kafka';
import { prisma } from '../common/prisma';
import { redis } from '../common/redis';
import { PositionStatus } from '../../prisma/client';
import dotenv from 'dotenv';

dotenv.config({
    path: `${__dirname}/../.env`
});

createConsumer('position-liquidated', 'position-liquidated-group', async ({ message }) => {
    const payload = message.value?.toString();
    if (!payload) return;

    const data = JSON.parse(payload);
    const { id: positionId, userId, closePrice, symbol } = data;
    console.log('🛑 [position-liquidated]', data);

    await prisma.position.update({
        where: { id: positionId },
        data: {
            status: PositionStatus.liquidated,
            closePrice,
            closedAt: new Date().toISOString(),
        },
    });

    await redis
        .multi()
        .del(`position:${positionId}`)
        .srem(`positions:${userId}`, positionId)
        .srem(`positions:${symbol}`, positionId)
        .exec();

    const pubData = {
        event: 'position-liquidated',
        userId,
        positionId,
        closePrice,
        symbol,
        status: PositionStatus.liquidated,
        timestamp: Date.now(),
    };

    await redis.publish('ws-update', JSON.stringify(pubData));
    console.log(`✅ Position ${positionId} marked as liquidated and removed from Redis`);
});

