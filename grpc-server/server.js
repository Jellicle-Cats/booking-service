const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PROTO_PATH = '../booking.proto';

const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
	keepCase: true,
	longs: String,
	enums: String,
	arrays: true,
});

const bookingProto = grpc.loadPackageDefinition(packageDefinition);

const server = new grpc.Server();

server.addService(bookingProto.booking.BookingService.service, {
	CreateReservation: async (call, callback) => {
		try {
			console.log(call.request);
			const { startTime, endTime, seatId, status } = call.request;
			console.log(status);

			// Use Prisma to create a new reservation
			const reservation = await prisma.reservation.create({
				data: {
					startTime,
					endTime,
					seatId,
					status,
				},
			});

			console.log('Created reservation:', reservation);

			// Send a response back to the gRPC client
			callback(null, {
				success: true,
				message: 'Reservation created successfully',
			});
		} catch (error) {
			console.error('Error creating reservation:', error);
			callback({
				code: grpc.status.INTERNAL,
				details: 'Error creating reservation',
			});
		}
	},
});

server.bind('127.0.0.1:30043', grpc.ServerCredentials.createInsecure());
console.log('Server running at http://127.0.0.1:30043');
server.start();
