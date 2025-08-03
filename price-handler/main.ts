import Redis from 'ioredis';
import { Kafka } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

const redis = new Redis();
const sub = new Redis();

const kafka = new Kafka({
    clientId: 'price-handler',
    brokers: ['localhost:9092'],
});

const producer = kafka.producer();

async function acquireLock(key: string, token: string, ttl = 3000): Promise<boolean> {
    const result = await (redis as any).set(key, token, 'NX', 'PX', ttl);
    return result === 'OK';
}

async function releaseLock(key: string, token: string) {
    const lua = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("DEL", KEYS[1])
        else
            return 0
        end
    `;
    await redis.eval(lua, 1, key, token);
}

async function start() {
    await producer.connect();
    console.log('📡 Subscribing to price updates...');
    await sub.subscribe('price-updates');

    sub.on('message', async (channel, message) => {
        if (channel !== 'price-updates') return;

        try {
            const { symbol, price } = JSON.parse(message);
            console.log(`📥 New price for ${symbol}: ${price}`);

            const lockKey = `lock:${symbol}`;
            const token = uuidv4();
            const lockAcquired = await acquireLock(lockKey, token);

            if (!lockAcquired) return console.log(`🔒 Skip ${symbol}, being processed`);
            const positionIds = await redis.smembers(`positions:${symbol}`);
            console.log('POSITIONS STACK: ', positionIds)
            for (const id of positionIds) {
                const raw = await redis.hgetall(`position:${id}`);
                if (!raw || !raw.userId) continue;

                await producer.send({
                    topic: 'position-updated',
                    messages: [
                        {
                            key: id,
                            value: JSON.stringify({
                                positionId: id,
                                userId: raw.userId,
                                currentPrice: price,
                            }),
                        },
                    ],
                });
            }

            await releaseLock(lockKey, token);
        } catch (err) {
            console.error('❌ Error handling price update:', err);
        }
    });
}

start().catch(console.error);