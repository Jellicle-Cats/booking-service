const express = require("express");
// const grpc = require('grpc');
var grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const app = express();
const port = 3000;

// Load the gRPC protobuf definition
const PROTO_PATH = "../booking.proto"; // Adjust the path as needed
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
	keepCase: true,
	longs: String,
	enums: String,
	arrays: true
});

const bookingProto = grpc.loadPackageDefinition(packageDefinition);

// Create a gRPC client to communicate with your gRPC server
const grpcClient = new bookingProto.booking.BookingService("127.0.0.1:30043", grpc.credentials.createInsecure());

app.get("/getUserHistory", (req, res) => {
	// Mock a request to the GetUserHistory gRPC method
	const request = { userId: 123 }; // Replace with an actual user ID

	grpcClient.GetUserHistory(request, (error, response) => {
		if (!error) {
			console.log("Received gRPC response:", response);
			res.json(response); // Send the gRPC response as JSON
		} else {
			console.error("Error making gRPC call:", error);
			res.status(500).json({ error: "Internal Server Error" }); // Handle errors appropriately
		}
	});
});

const { Timestamp } = require("google-protobuf/google/protobuf/timestamp_pb");

app.get("/getUnavailableSeat", (req, res) => {
	// Calculate startTime and endTime as timestamps in milliseconds
	const startTime = new Date().getTime();
	const endTime = startTime + 3600000; // 1 hour later

	const request = {
		startTime: startTime,
		endTime: endTime
	};

	console.log("Request sent to GetUnavailableSeat:", request);

	grpcClient.GetUnavailableSeat(request, (error, response) => {
		if (!error) {
			console.log("Received gRPC response:", response);
			res.json(response); // Send the gRPC response as JSON
		} else {
			console.error("Error making gRPC call:", error);
			res.status(500).json({ error: "Internal Server Error" }); // Handle errors appropriately
		}
	});
});

app.get("/updateBookingStatus", (req, res) => {
	const bookingId = 456; // Replace with an actual booking ID
	const status = 3;

	const request = {
		id: { id: bookingId },
		status: status
	};

	grpcClient.UpdateBookingStatus(request, (error, response) => {
		if (!error) {
			if (response && response.id) {
				console.log("Booking updated successfully:", response);
				res.json(response);
			} else {
				console.error("Invalid gRPC response:", response);
				res.status(500).json({ error: "Invalid Server Response" });
			}
		} else {
			console.error("Error making gRPC call:", error);

			if (error.code === grpc.status.NOT_FOUND) {
				console.error("Booking not found");
				res.status(404).json({ error: "Booking not found" });
			} else {
				res.status(500).json({ error: "Internal Server Error" });
			}
		}
	});
});

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
