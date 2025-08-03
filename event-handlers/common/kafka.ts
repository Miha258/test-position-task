import { Kafka, EachMessagePayload } from 'kafkajs';

const kafka = new Kafka({
    clientId: 'handler-client',
    brokers: ['localhost:9092'],
});

export async function createConsumer(
    topic: string,
    groupId: string,
    handler: (message: EachMessagePayload) => Promise<void>,
) {
    const consumer = kafka.consumer({ groupId });

    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    await consumer.run({
        eachMessage: handler,
    });

    console.log(`✅ Listening to topic "${topic}" [group: ${groupId}]...`);
}
