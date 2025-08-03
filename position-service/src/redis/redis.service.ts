import { Injectable } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService {
    private client: RedisClientType;
    private subscriber: RedisClientType | null = null;

    constructor() {
        this.client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
        this.client.connect().catch(console.error);
    }

    getClient() {
        return this.client;
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async set(key: string, value: string, options?: { EX?: number }) {
        if (options?.EX) {
            await this.client.set(key, value, { EX: options.EX });
        } else {
            await this.client.set(key, value);
        }
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    async hgetall(key: string): Promise<Record<string, string>> {
        return this.client.hGetAll(key);
    }

    async hset(key: string, data: Record<string, string>): Promise<void> {
        await this.client.hSet(key, data);
    }

    async expire(key: string, seconds: number): Promise<void> {
        await this.client.expire(key, seconds);
    }

    async sadd(key: string, member: string): Promise<void> {
        await this.client.sAdd(key, member);
    }

    async smembers(key: string): Promise<string[]> {
        return this.client.sMembers(key);
    }

    async sismember(key: string, member: string): Promise<boolean> {
        const result = await this.client.sIsMember(key, member);
        return result === 1;
    }
    async execPipeline(pipeline): Promise<[Error | null, any][]> {
        return pipeline.exec();
    }

    async getSubscriber(): Promise<RedisClientType> {
        if (!this.subscriber) {
            this.subscriber = this.client.duplicate();
            await this.subscriber.connect();
        }
        return this.subscriber;
    }
}
