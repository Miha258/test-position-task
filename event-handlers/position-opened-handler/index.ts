import { createConsumer } from '../common/kafka';
import { prisma } from '../common/prisma';
import { redis } from '../common/redis';

createConsumer('position-opened', 'position-opened-group', async ({ message }) => {
    const payload = message.value?.toString();
    if (!payload) return;

    const data = JSON.parse(payload);
    console.log('📥 [position-opened]', data);

    const { userId, symbol, id, ...positionData } = data;
    const created = await prisma.position.create({
        data: { id, userId, symbol, ...positionData },
    });

    const hashKey = `position:${created.id}`;
    const setKey = `positions:${userId}`;

    await redis
        .multi()
        .hset(hashKey, {
            ...created,
            entry: String(created.entry),
            leverage: String(created.leverage),
        })
        .expire(hashKey, 86400)
        .sadd(setKey, created.id)
        .exec();

    console.log(`✅ Position ${created.id} created and cached`);
});