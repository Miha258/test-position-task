import WebSocket from 'ws';
import Redis from 'ioredis';

const symbols =  ['btcusdt', 'ethusdt', 'solusdt', 'adausdt'];
const streamUrl = `wss://stream.binance.com:9443/stream?streams=${symbols
    .map((s) => `${s}@ticker`)
    .join('/')}`;

const redis = new Redis();

class BinancePriceListener {
    private ws!: WebSocket;
    private lastCallTime: Record<string, number> = {};

    constructor(private redis: Redis, private throttleMs = 6000) {}

    public start() {
        this.ws = new WebSocket(streamUrl);

        this.ws.on('open', () => {
            console.log(`✅ Connected to Binance WebSocket`);
        });

        this.ws.on('message', async (message: WebSocket.RawData) => {
            try {
                const payload = JSON.parse(message.toString());
                const data = payload?.data;
                if (data) {
                    const { s: symbolRaw, c: lastPrice } = data;
                    const symbol = symbolRaw.toLowerCase();
                    if (symbol && lastPrice) {
                        await this.throttlePerPair(
                            this.handleMessage.bind(this),
                            this.throttleMs,
                            symbol,
                            parseFloat(lastPrice),
                        );
                    }
                }
            } catch (error) {
                console.error('❌ Error processing WebSocket message:', error);
            }
        });

        this.ws.on('close', () => {
            console.log('🔌 WebSocket disconnected. Reconnecting...');
            setTimeout(() => this.start(), 3000);
        });

        this.ws.on('error', (err) => {
            console.error('🚨 WebSocket error:', err.message);
            this.ws.close();
        });
    }

    private async handleMessage(symbol: string, price: number) {
        const redisKey = `price:${symbol}`;
        const payload = JSON.stringify({ symbol, price });

        await this.redis.set(redisKey, price.toString(), 'EX', 10);
        await this.redis.publish('price-updates', payload);

        console.log(`💾 Redis updated: ${redisKey} = ${price}`);
        console.log(`📢 Published to channel price-updates: ${payload}`);
    }


    private async throttlePerPair(
        fn: (symbol: string, price: number) => Promise<void>,
        timeout: number,
        symbol: string,
        price: number,
    ) {
        const now = Date.now();
        if (
            price &&
            symbol &&
            (!this.lastCallTime[symbol] || now - this.lastCallTime[symbol] > timeout)
        ) {
            this.lastCallTime[symbol] = now;
            await fn(symbol, price);
        }
    }
}

const listener = new BinancePriceListener(redis);
listener.start();