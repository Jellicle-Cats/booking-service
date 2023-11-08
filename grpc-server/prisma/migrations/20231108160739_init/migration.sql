-- CreateTable
CREATE TABLE `Booking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `checkinTime` DATETIME(3) NULL,
    `checkoutTime` DATETIME(3) NULL,
    `seatId` INTEGER NOT NULL,
    `status` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL,

    INDEX `Booking_startTime_idx`(`startTime`),
    INDEX `Booking_endTime_idx`(`endTime`),
    INDEX `Booking_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
