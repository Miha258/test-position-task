import { createConsumer } from '../common/kafka';
import { redis } from '../common/redis';

createConsumer('position-opened', 'position-opened-group', async ({ message }) => {
    const payload = message.value?.toString();
    if (!payload) return;

    const data = JSON.parse(payload);
    console.log('📥 [position-opened]', data);

    const { userId, id: positionId, entry, leverage, symbol } = data;

    const hashKey = `position:${positionId}`;
    const setKey = `positions:${userId}`;
    const symbolSetKey = `positions:${symbol.toLowerCase()}`;

    await redis
        .multi()
        .hset(hashKey, {
            ...data,
            entry: String(entry),
            leverage: String(leverage),
        })
        .sadd(setKey, positionId)
        .sadd(symbolSetKey, positionId)
        .exec();

    const pubData = {
        event: 'position-opened',
        userId,
        positionId,
        entry,
        leverage,
        symbol,
        data,
        timestamp: Date.now(),
    };

    await redis.publish('ws-update', JSON.stringify(pubData));
    console.log(`✅ Position ${positionId} created, cached, and published to ws-update`);
});
