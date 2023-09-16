const express = require('express');
const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');

const app = express();
const port = 3000;

// Load the gRPC protobuf definition
const PROTO_PATH = '../booking.proto'; // Adjust the path as needed
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
	keepCase: true,
	longs: String,
	enums: String,
	arrays: true,
});

const bookingProto = grpc.loadPackageDefinition(packageDefinition);

// Create a gRPC client to communicate with your gRPC server
const grpcClient = new bookingProto.booking.BookingService(
	'127.0.0.1:30043',
	grpc.credentials.createInsecure()
);

app.get('/', (req, res) => {
	res.send('Hello World!');
});

app.post('/create-reservation', (req, res) => {
	// Assuming you receive reservation data in the request body
	const reservationData = {
		startTime: '2023-09-15T10:00:00Z',
		endTime: '2023-09-15T11:00:00Z',
		status: 'PENDING',
	};

	// Make a gRPC request to create a reservation
	grpcClient.CreateReservation(reservationData, (error, response) => {
		if (!error) {
			// Reservation created successfully
			res.status(200).json({
				success: response.success,
				message: response.message,
			});
		} else {
			// Handle gRPC error
			res.status(500).json({
				success: false,
				message: 'Error creating reservation',
			});
		}
	});
});

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
