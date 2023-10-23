const kafka = require('kafka-node');
const client = new kafka.KafkaClient({kafkaHost: 'localhost:9092'});

const producer = new kafka.Producer(client);

producer.on('ready', () => {
  console.log('Kafka Producer is connected and ready.');
});

producer.on('error', (error) => {
  console.error(error);
});

module.exports = producer;
