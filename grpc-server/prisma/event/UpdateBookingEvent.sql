-- Update status to 4 (CANCELLED) after 15 minutes of scheduled start time for unchecked-in bookings
CREATE EVENT UpdateUncheckedinBookingStatusEvent
ON SCHEDULE EVERY 1 MINUTE
DO
BEGIN
  UPDATE Booking
  SET status = 4
  WHERE status = 1
    AND checkinTime IS NULL
    AND startTime + INTERVAL 15 MINUTE < NOW();
END;

-- Update status to 3 (COMPLETED) when the current time is greater than the end time for checked-in bookings
CREATE EVENT UpdateCompletedBookingStatusEvent
ON SCHEDULE EVERY 1 MINUTE
DO
BEGIN
  UPDATE Booking
  SET status = 3
  WHERE status = 2
    AND checkinTime IS NOT NULL
    AND endTime < NOW();
END;
