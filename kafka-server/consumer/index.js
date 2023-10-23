// For testing and using in client gateway
const kafka = require("kafka-node");
const client = new kafka.KafkaClient({ kafkaHost: "localhost:9092" });
const topics = [{ topic: "booking" }];
const options = { groupId: "booking-group" };
const consumer = new kafka.Consumer(client, topics, options);

consumer.on("message", (message) => {
	const booking = JSON.parse(message.value);
	console.log("Received booking:", booking);
});

consumer.on("error", (error) => {
	console.error("Error in consumer:", error);
});
