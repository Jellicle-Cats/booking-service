const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const PROTO_PATH = "booking.proto";
// const producer = require("../kafka-server/producer/index.js");

// const grpc = require("grpc");
var grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
	keepCase: true,
	longs: String,
	arrays: true
});

const bookingProto = grpc.loadPackageDefinition(packageDefinition);

const server = new grpc.Server();

// Implement the gRPC service methods
server.addService(bookingProto.booking.BookingService.service, {
	GetUserHistory: getUserHistory,
	GetBooking: getBooking,
	GetUnavailableSeat: getUnavailableSeat,
	GetSeatStatus: GetSeatStatus,
	CreateBooking: createBooking,
	UpdateBooking: updateBooking,
	UpdateBookingStatus: updateBookingStatus,
	DeleteBooking: deleteBooking
});

// Kafka produce message
// Unused
function updateSeatStatus(seatId, status) {
	// existing booking logic
	const bookingDetails = { seatId, status };

	// Create message to send to Kafka
	const payloads = [
		{
			topic: "booking",
			messages: JSON.stringify(bookingDetails)
		}
	];

	// Send booking status to Kafka
	producer.send(payloads, (error) => {
		if (error) {
			console.error("Failed to send message to Kafka:", error);
			return;
		}
		console.log("Successed to send");
		console.log(payloads);
	});
}

function getUserHistory(call, callback) {
	const userId = call.request.userId;
	prisma.booking
		.findMany({
			where: {
				userId: Number(userId)
			}
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
								endTime: booking.endTime.getTime()
							},
							seat: { seatId: booking.seatId },
							status: booking.status
						},
						checkinTime: booking.checkinTime,
						checkoutTime: booking.checkoutTime,
						isActive: booking.isActive
					};
				})
			};
			callback(null, bookingList);
		})
		.catch((error) => {
			console.error("Error fetching user history:", error);
			callback({
				code: grpc.status.INTERNAL,
				details: "Internal Server Error"
			});
		});
}

function getBooking(call, callback) {
	const bookingId = Number(call.request.id);
	// Check if the booking with the specified ID exists
	try {
		prisma.booking
			.findUnique({
				where: {
					id: bookingId
				}
			})
			.then((existingBooking) => {
				if (!existingBooking) {
					// The booking with the specified ID was not found
					console.error("Booking not found with ID:", bookingId);
					callback({
						code: grpc.status.NOT_FOUND, // Use NOT_FOUND status code
						details: "Booking not found"
					});
					return;
				}
				console.log(existingBooking);
				callback(null, {
					id: {
						id: Number(existingBooking.id)
					},
					bookingData: {
						user: {
							userId: existingBooking.userId
						},
						bookingTime: {
							startTime: Date.parse(existingBooking.startTime),
							endTime: Date.parse(existingBooking.endTime)
						},
						seat: {
							seatId: Number(existingBooking.seatId)
						},
						status: Number(existingBooking.status)
					},
					checkinTime: Date.parse(existingBooking.checkinTime),
					checkoutTime: Date.parse(existingBooking.checkoutTime),
					isActive: true
				});
			});
	} catch (error) {
		console.error("Error processing request:", error);
		callback({
			code: grpc.status.INVALID_ARGUMENT,
			details: "Invalid request parameters"
		});
	}
}

function getUnavailableSeat(call, callback) {
	console.log(call.request);

	const bookingTime = call.request;

	try {
		const startTimeMillis = parseInt(bookingTime.startTime * 1000); // Convert the string to a number
		const endTimeMillis = parseInt(bookingTime.endTime * 1000); // Convert the string to a number

		if (!isNaN(startTimeMillis) && !isNaN(endTimeMillis)) {
			const startTime = new Date(startTimeMillis);
			const endTime = new Date(endTimeMillis);

			console.log(startTime);
			console.log(endTime);

			const whereCondition = {
				OR: [{ status: 1 }, { status: 2 }]
			};

			whereCondition.startTime = {
				lte: endTime
			};
			whereCondition.endTime = {
				gte: startTime
			};

			// Find unavailable seats based on the whereCondition
			prisma.booking
				.findMany({
					where: whereCondition
				})
				.then((bookings) => {
					const seatSet = new Set(); // Create a Set to store unique seat IDs

					// Add unique seat IDs to the Set
					bookings.forEach((booking) => {
						seatSet.add(booking.seatId);
					});

					const seatList = {
						seats: Array.from(seatSet).map((seatId) => ({
							seatId: seatId
						}))
					};

					callback(null, seatList);
				})
				.catch((error) => {
					console.error("Error fetching unavailable seats:", error);
					callback({
						code: grpc.status.INTERNAL,
						details: "Internal Server Error"
					});
				});
		} else {
			console.error("Invalid timestamp values");
			callback({
				code: grpc.status.INVALID_ARGUMENT,
				details: "Invalid request parameters"
			});
		}
	} catch (error) {
		console.error("Error processing request:", error);
		callback({
			code: grpc.status.INVALID_ARGUMENT,
			details: "Invalid request parameters"
		});
	}
}

async function GetSeatStatus(call, callback) {
	try {
		const startTime = new Date(Number(call.request.startTime * 1000));
		const endTime = new Date(Number(call.request.startTime * 1000) + 5 * 60 * 1000);
		const result = await prisma.booking.findMany({
			where: {
				startTime: {
					gte: startTime,
					lte: endTime
				}
			}
		});
		for (e of result) {
			call.write({
				seats: {
					seatId: e.id
				},
				status: e.status
			});
		}
		call.end();
	} catch (error) {
		console.error("Error processing request:", error);
		callback({
			code: grpc.status.INVALID_ARGUMENT,
			details: "Error processing request"
		});
	}
}

async function createBooking(call, callback) {
	try {
		const _createBooking = await prisma.booking.create({
			data: {
				userId: Number(call.request.user.userId),
				startTime: new Date(Number(call.request.bookingTime.startTime * 1000)),
				endTime: new Date(Number(call.request.bookingTime.endTime * 1000)),
				seatId: Number(call.request.seat.seatId),
				status: Number(call.request.status),
				isActive: true
			}
		});
		console.log(call.request);
		console.log(_createBooking);
		callback(null, {
			id: {
				id: Number(_createBooking.id)
			},
			bookingData: {
				user: {
					userId: Number(_createBooking.userId)
				},
				bookingTime: {
					startTime: Date.parse(_createBooking.startTime),
					endTime: Date.parse(_createBooking.endTime)
				},
				seat: {
					seatId: Number(_createBooking.seatId)
				},
				status: Number(_createBooking.status)
			},
			checkinTime: Date.parse(_createBooking.checkinTime),
			checkoutTime: Date.parse(_createBooking.checkoutTime),
			isActive: true
		});
	} catch (error) {
		console.error("Error processing request:", error);
		callback({
			code: grpc.status.INTERNAL,
			details: "Cannot create booking"
		});
	}
}

// updateBooking is used to update only startTime and endTime of booking and change seat (need all three of them)
async function updateBooking(call, callback) {
	try {
		prisma.booking
			.findUnique({
				where: {
					id: Number(call.request.id.id)
				}
			})
			.then((existingBooking) => {
				if (!existingBooking) {
					// The booking with the specified ID was not found
					console.error("Booking not found with ID:", bookingId);
					callback({
						code: grpc.status.NOT_FOUND, // Use NOT_FOUND status code
						details: "Booking not found"
					});
					return;
				}
			});

		const _updateBooking = await prisma.booking.update({
			where: {
				id: Number(call.request.id.id)
			},
			data: {
				startTime: new Date(Number(call.request.bookingData.bookingTime.startTime * 1000)),
				endTime: new Date(Number(call.request.bookingData.bookingTime.endTime * 1000)),
				seatId: Number(call.request.bookingData.seat.seatId)
			}
		});
		console.log(call.request);
		console.log(_updateBooking);
		callback(null, {
			id: {
				id: Number(_updateBooking.id)
			},
			bookingData: {
				user: {
					userId: Number(_updateBooking.userId)
				},
				bookingTime: {
					startTime: Date.parse(_updateBooking.startTime),
					endTime: Date.parse(_updateBooking.endTime)
				},
				seat: {
					seatId: Number(_updateBooking.seatId)
				},
				status: Number(_updateBooking.status)
			},
			checkinTime: Date.parse(_updateBooking.checkinTime),
			checkoutTime: Date.parse(_updateBooking.checkoutTime),
			isActive: true
		});
	} catch (error) {
		console.error("Error processing request:", error);
		callback({
			code: grpc.status.INTERNAL,
			details: "Cannot update booking"
		});
	}
}

function updateBookingStatus(call, callback) {
	const request = call.request;
	const bookingId = Number(request.id.id);

	// Check if the booking with the specified ID exists
	prisma.booking
		.findUnique({
			where: {
				id: bookingId
			}
		})
		.then((existingBooking) => {
			if (!existingBooking) {
				// The booking with the specified ID was not found
				console.error("Booking not found with ID:", bookingId);
				callback({
					code: grpc.status.NOT_FOUND, // Use NOT_FOUND status code
					details: "Booking not found"
				});
				return;
			}

			// Update the booking status
			prisma.booking
				.update({
					where: {
						id: bookingId
					},
					data: {
						status: request.status
					}
				})
				.then((updatedBooking) => {
					const bookingResponse = {
						id: { id: updatedBooking.id },
						bookingData: {
							user: { userId: updatedBooking.userId },
							bookingTime: {
								startTime: updatedBooking.startTime.getTime(),
								endTime: updatedBooking.endTime.getTime()
							},
							seat: { seatId: updatedBooking.seatId },
							status: updatedBooking.status
						},
						checkinTime: updatedBooking.checkinTime,
						checkoutTime: updatedBooking.checkoutTime,
						isActive: updatedBooking.isActive
					};
					callback(null, bookingResponse);
					// updateSeatStatus(updatedBooking.seatId, updatedBooking.isActive);
				})
				.catch((error) => {
					console.error("Error updating booking status:", error);
					callback({
						code: grpc.status.INTERNAL,
						details: "Internal Server Error"
					});
				});
		})
		.catch((error) => {
			console.error("Error checking booking existence:", error);
			callback({
				code: grpc.status.INTERNAL,
				details: "Internal Server Error"
			});
		});
}

async function deleteBooking(call, callback) {
	const bookingId = Number(call.request.id);
	try {
		prisma.booking
			.findUnique({
				where: {
					id: bookingId
				}
			})
			.then((existingBooking) => {
				if (!existingBooking) {
					// The booking with the specified ID was not found
					console.error("Booking not found with ID:", bookingId);
					callback({
						code: grpc.status.NOT_FOUND, // Use NOT_FOUND status code
						details: "Booking not found"
					});
					return;
				}
			});
		// Delete the booking with the given ID
		const deletedBooking = await prisma.booking.delete({
			where: {
				id: bookingId
			}
		});
		// Return a success response
		callback(null, {});
	} catch (error) {
		console.error("Error processing request:", error);
		// Return a generic error response
		callback({
			code: grpc.status.INTERNAL,
			details: "Cannot delete booking"
		});
	}
}

server.bindAsync("127.0.0.1:30043", grpc.ServerCredentials.createInsecure(), () => {
	server.start();
});
console.log("Server running at http://127.0.0.1:30043");
// server.start();
