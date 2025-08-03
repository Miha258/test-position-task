import { createConsumer } from '../common/kafka';
import { prisma } from '../common/prisma';
import { redis } from '../common/redis';
import { PositionStatus } from  '@prisma/client'
import dotenv from 'dotenv';

dotenv.config({
    path: `${__dirname}/../.env`
});

createConsumer('position-closed', 'position-closed-group', async ({ message }) => {
    const payload = message.value?.toString();
    if (!payload) return;

    const data = JSON.parse(payload);
    console.log('📥 [position-closed]', data);

    const { id: positionId, userId, symbol, closePrice, closedAt } = data;

    await prisma.position.update({
        where: { id: positionId },
        data: {
            status: PositionStatus.closed,
            closePrice: closePrice,
            closedAt: closedAt,
            symbol: symbol,
        },
    });

    await redis
        .multi()
        .del(`position:${positionId}`)
        .srem(`positions:${userId}`, positionId)
        .srem(`positions:${symbol}`, positionId)
        .exec();

    const pubData = {
        event: 'position-closed',
        positionId,
        userId,
        closePrice,
        closedAt,
        symbol,
    };

    await redis.publish(`ws-update`, JSON.stringify(pubData));
    console.log(`✅ Position ${positionId} closed and removed from Redis`);
});