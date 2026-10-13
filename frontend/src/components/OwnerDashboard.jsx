import { useEffect, useState } from 'react';
import {
  getVenues,
  createVenue,
  updateVenue,
  deleteVenue,
} from '../api';

const OWNER_ID = 'f0b7e1ad-032e-47d0-83d3-c10655e1b6dc';

function OwnerDashboard() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [pricePerDay, setPricePerDay] = useState('');

  useEffect(() => {
    loadVenues();
  }, []);

  async function loadVenues() {
    try {
      setLoading(true);
      setError('');

      const data = await getVenues();
      setVenues(data);
    } catch (err) {
      console.error('OWNER VENUES ERROR:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setEditingVenue(null);
    setName('');
    setLocation('');
    setCapacity('');
    setPricePerDay('');
    setShowForm(true);
  }

  function openEditForm(venue) {
    setEditingVenue(venue);
    setName(venue.name);
    setLocation(venue.location);
    setCapacity(venue.capacity);
    setPricePerDay(venue.price_per_day);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingVenue(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');

      const venueData = {
        name,
        location,
        capacity: Number(capacity),
        price_per_day: Number(pricePerDay),
      };

      if (editingVenue) {
        const updatedVenue = await updateVenue(
          editingVenue.id,
          venueData
        );

        setVenues((current) =>
          current.map((venue) =>
            venue.id === editingVenue.id
              ? updatedVenue
              : venue
          )
        );
      } else {
        const newVenue = await createVenue({
          owner_id: OWNER_ID,
          ...venueData,
        });

        setVenues((current) => [newVenue, ...current]);
      }

      closeForm();
    } catch (err) {
      console.error('SAVE VENUE ERROR:', err);
      setError(err.message);
    }
  }

  async function handleDelete(venueId) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this venue?'
    );

    if (!confirmed) return;

    try {
      setError('');

      await deleteVenue(venueId);

      setVenues((current) =>
        current.filter((venue) => venue.id !== venueId)
      );
    } catch (err) {
      console.error('DELETE VENUE ERROR:', err);
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <p>Loading venues...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">
              Owner Dashboard
            </h1>

            <p className="text-gray-600 mt-2">
              Manage your venues
            </p>
          </div>

          <button
            onClick={openAddForm}
            className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700"
          >
            + Add Venue
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-5">
              {editingVenue
                ? 'Edit Venue'
                : 'Add New Venue'}
            </h2>

            <form
              onSubmit={handleSubmit}
              className="grid gap-4 md:grid-cols-2"
            >
              <input
                type="text"
                placeholder="Venue name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="border rounded-lg p-3"
              />

              <input
                type="text"
                placeholder="Location"
                value={location}
                onChange={(e) =>
                  setLocation(e.target.value)
                }
                required
                className="border rounded-lg p-3"
              />

              <input
                type="number"
                placeholder="Capacity"
                value={capacity}
                onChange={(e) =>
                  setCapacity(e.target.value)
                }
                required
                min="1"
                className="border rounded-lg p-3"
              />

              <input
                type="number"
                placeholder="Price per day"
                value={pricePerDay}
                onChange={(e) =>
                  setPricePerDay(e.target.value)
                }
                required
                min="0"
                className="border rounded-lg p-3"
              />

              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700"
                >
                  {editingVenue
                    ? 'Save Changes'
                    : 'Create Venue'}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  className="bg-gray-200 px-5 py-3 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {venues.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <p className="text-gray-500">
              No venues found.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <div
                key={venue.id}
                className="bg-white rounded-xl shadow p-6"
              >
                <h2 className="text-2xl font-semibold">
                  {venue.name}
                </h2>

                <p className="text-gray-600 mt-2">
                  📍 {venue.location}
                </p>

                <p className="mt-2">
                  👥 Capacity: {venue.capacity}
                </p>

                <p className="font-semibold mt-2">
                  ₹{venue.price_per_day} / day
                </p>

                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() =>
                      openEditForm(venue)
                    }
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      handleDelete(venue.id)
                    }
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OwnerDashboard;