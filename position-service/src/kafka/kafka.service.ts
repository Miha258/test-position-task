import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

type TopicType = 'position-opened' | 'position-closed' | 'position-updated' | 'position-liquidated'

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
    private kafka = new Kafka({
        clientId: 'position-service',
        brokers: ['localhost:9092'],
    });

    private producer: Producer = this.kafka.producer();

    async onModuleInit() {
        await this.producer.connect();
        console.log('[KafkaService] Producer connected');
    }

    async onModuleDestroy() {
        await this.producer.disconnect();
        console.log('[KafkaService] Producer disconnected');
    }

    async emit(topic: TopicType, message: any): Promise<void> {
        await this.producer.send({
            topic,
            messages: [{ value: JSON.stringify(message) }],
        });
    }
}
