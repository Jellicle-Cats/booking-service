CREATE EVENT UpdateBookingStatusEvent
ON SCHEDULE EVERY 1 MINUTE  -- Adjust the frequency as needed
DO
BEGIN
  UPDATE Booking
  SET status = 4
  WHERE status IN (1)
    AND checkinTime IS NULL
    AND startTime + INTERVAL 15 MINUTE < NOW();
END;
