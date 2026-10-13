import { useEffect, useState } from 'react';
import { getBookings, getVenues, cancelBooking } from '../api';

const USER_ID = 'b87a50e1-9361-4258-8f14-47a12fc66910';

function formatBookingRange(range) {
  // PostgreSQL daterange looks like:
  // [2026-08-25,2026-08-27)

  if (!range) return 'Dates unavailable';

  const cleaned = range.replace(/[\[\]()]/g, '');
  const [start, end] = cleaned.split(',');

  if (!start || !end) return range;

  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  const options = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };

  return `${startDate.toLocaleDateString(
    'en-IN',
    options
  )} – ${endDate.toLocaleDateString(
    'en-IN',
    options
  )}`;
}

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [bookingData, venueData] = await Promise.all([
          getBookings(USER_ID),
          getVenues(),
        ]);

        setBookings(bookingData);
        setVenues(venueData);
      } catch (err) {
        console.error('MY BOOKINGS ERROR:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function findVenue(venueId) {
    return venues.find((venue) => venue.id === venueId);
  }

  async function handleCancel(bookingId) {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this booking?'
    );

    if (!confirmed) return;

    try {
      setCancellingId(bookingId);
      setError('');

      const updatedBooking = await cancelBooking(bookingId);

      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking.id === bookingId
            ? updatedBooking
            : booking
        )
      );
    } catch (err) {
      console.error('CANCEL BOOKING ERROR:', err);
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <p>Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">
          My Bookings
        </h1>

        {error && (
          <div className="mb-6 bg-red-100 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-500">
              You don't have any bookings yet.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {bookings.map((booking) => {
              const venue = findVenue(booking.venue_id);
              const isCancelled =
                booking.status === 'cancelled';

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl shadow p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold">
                        {venue
                          ? venue.name
                          : 'Venue'}
                      </h2>

                      {venue && (
                        <p className="text-gray-600 mt-1">
                          📍 {venue.location}
                        </p>
                      )}
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isCancelled
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div className="mt-5 space-y-2">
                    <p>
                      <span className="font-medium">
                        📅 Dates:
                      </span>{' '}
                      {formatBookingRange(
                        booking.booking_range
                      )}
                    </p>

                    <p className="text-sm text-gray-500">
                      Booking ID: {booking.id}
                    </p>
                  </div>

                  {!isCancelled && (
                    <button
                      onClick={() =>
                        handleCancel(booking.id)
                      }
                      disabled={
                        cancellingId === booking.id
                      }
                      className="mt-5 bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {cancellingId === booking.id
                        ? 'Cancelling...'
                        : 'Cancel Booking'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyBookings;