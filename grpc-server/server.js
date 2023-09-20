const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PROTO_PATH = '../booking.proto';

const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
	keepCase: true,
	longs: String,
	arrays: true,
});

const bookingProto = grpc.loadPackageDefinition(packageDefinition);

const server = new grpc.Server();

// Implement the gRPC service methods
server.addService(bookingProto.booking.BookingService.service, {
	GetUserHistory: getUserHistory,
	GetUnavailableSeat: getUnavailableSeat,
	UpdateBookingStatus: updateBookingStatus,
});

function getUserHistory(call, callback) {
	const userId = call.request.userId;
	prisma.booking
		.findMany({
			where: {
				userId: Number(userId),
			},
		})
		.then((bookings) => {
			const bookingList = {
				bookings: bookings.map((booking) => {
					return {
						id: { id: booking.id },
						bookingData: {
							user: { userId: booking.userId },
							bookingTime: {
								startTime: booking.startTime.getTime(),
								endTime: booking.endTime.getTime(),
							},
							seat: { seatId: booking.seatId },
							status: booking.status,
						},
						checkinTime: booking.checkinTime,
						checkoutTime: booking.checkoutTime,
						isActive: booking.isActive,
					};
				}),
			};
			callback(null, bookingList);
		})
		.catch((error) => {
			console.error('Error fetching user history:', error);
			callback({
				code: grpc.status.INTERNAL,
				details: 'Internal Server Error',
			});
		});
}
function getUnavailableSeat(call, callback) {
	console.log(call.request);

	const bookingTime = call.request;

	try {
		const startTimeMillis = parseInt(bookingTime.startTime); // Convert the string to a number
		const endTimeMillis = parseInt(bookingTime.endTime); // Convert the string to a number

		if (!isNaN(startTimeMillis) && !isNaN(endTimeMillis)) {
			const startTime = new Date(startTimeMillis);
			const endTime = new Date(endTimeMillis);

			const threshold = 60 * 60 * 1000; // 1 hour in milliseconds

			// Adjust the end time for both cases
			const adjustedEndTime1 = new Date(startTime.getTime() + threshold);
			const adjustedEndTime2 = new Date(endTime.getTime() + threshold);

			const isStartTimeLessThanThreshold =
				endTime - startTime < threshold;

			const whereCondition = {
				OR: [{ status: 0 }, { status: 1 }],
			};

			// startTime, adjustedEndTime1 = Start time + 1 hour
			// Find bookings where the start time is less than or equal to adjustedEndTime1
			// and the end time is greater than or equal to startTime
			// find unavailable seats from start to start + 1 hour bc user can book 1 hour base on start time
			if (isStartTimeLessThanThreshold) {
				whereCondition.startTime = {
					lte: adjustedEndTime1,
				};
				whereCondition.endTime = {
					gte: startTime,
				};
				// startTime, adjustedEndTime2 = End time + 1 hour
				// Find bookings where the start time is less than or equal to endTime
				// and the end time is greater than or equal to startTime
				// find unavailable seats from start to end + 1 hour bc user can book 1 hour from start - end time
			} else {
				whereCondition.startTime = {
					lte: adjustedEndTime2,
				};
				whereCondition.endTime = {
					gte: startTime,
				};
			}

			// Find unavailable seats based on the whereCondition
			prisma.booking
				.findMany({
					where: whereCondition,
				})
				.then((bookings) => {
					const seatList = {
						seats: bookings.map((booking) => ({
							seatId: booking.seatId,
						})),
					};
					callback(null, seatList);
				})
				.catch((error) => {
					console.error('Error fetching unavailable seats:', error);
					callback({
						code: grpc.status.INTERNAL,
						details: 'Internal Server Error',
					});
				});
		} else {
			console.error('Invalid timestamp values');
			callback({
				code: grpc.status.INVALID_ARGUMENT,
				details: 'Invalid request parameters',
			});
		}
	} catch (error) {
		console.error('Error processing request:', error);
		callback({
			code: grpc.status.INVALID_ARGUMENT,
			details: 'Invalid request parameters',
		});
	}
}

function updateBookingStatus(call, callback) {
	const bookingId = Number(request.id.id);

	// Check if the booking with the specified ID exists
	prisma.booking
		.findUnique({
			where: {
				id: bookingId,
			},
		})
		.then((existingBooking) => {
			if (!existingBooking) {
				// The booking with the specified ID was not found
				console.error('Booking not found with ID:', bookingId);
				callback({
					code: grpc.status.NOT_FOUND, // Use NOT_FOUND status code
					details: 'Booking not found',
				});
				return;
			}

			// Update the booking status
			prisma.booking
				.update({
					where: {
						id: bookingId,
					},
					data: {
						status: request.status,
					},
				})
				.then((updatedBooking) => {
					const bookingResponse = {
						id: { id: updatedBooking.id },
						bookingData: {
							user: { userId: updatedBooking.userId },
							bookingTime: {
								startTime: updatedBooking.startTime.getTime(),
								endTime: updatedBooking.endTime.getTime(),
							},
							seat: { seatId: updatedBooking.seatId },
							status: updatedBooking.status,
						},
						checkinTime: updatedBooking.checkinTime,
						checkoutTime: updatedBooking.checkoutTime,
						isActive: updatedBooking.isActive,
					};
					callback(null, bookingResponse);
				})
				.catch((error) => {
					console.error('Error updating booking status:', error);
					callback({
						code: grpc.status.INTERNAL,
						details: 'Internal Server Error',
					});
				});
		})
		.catch((error) => {
			console.error('Error checking booking existence:', error);
			callback({
				code: grpc.status.INTERNAL,
				details: 'Internal Server Error',
			});
		});
}

server.bind('127.0.0.1:30043', grpc.ServerCredentials.createInsecure());
console.log('Server running at http://127.0.0.1:30043');
server.start();
