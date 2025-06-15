import { useState } from 'react';
import { Container, Card, Button, Modal, Form, Pagination } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import '../../styles/parking.css';

interface ParkingSpot {
  id: number;
  slot_number: string;
  is_occupied: boolean;
  is_reserved: boolean;
  location: number;
}

interface Location {
  id: number;
  name: string;
  address: string;
  total_slots: number;
  available_slots: number;
  is_active: boolean;
}

interface PaginatedResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function ParkingSlots() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [endTime, setEndTime] = useState<Date | null>(new Date());
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [timeError, setTimeError] = useState<string>('');
  const [startTimeError, setStartTimeError] = useState<string>('');

  const {
    data: location,
    isLoading: isLoadingLocation,
    error: locationError,
  } = useQuery({
    queryKey: ['location', id],
    queryFn: async () => {
      if (!token) {
        navigate('/login');
        return null;
      }
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/locations/${id}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data as Location;
    },
    retry: 1,
  });

  const {
    data: spotsData,
    isLoading: isLoadingSpots,
    error: spotsError,
    refetch: refetchSpots,
  } = useQuery({
    queryKey: ['spots', id, currentPage],
    queryFn: async () => {
      if (!token) {
        navigate('/login');
        return null;
      }
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/locations/${id}/spots/?page=${currentPage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data as PaginatedResponse<ParkingSpot>;
    },
    retry: 1,
  });

  const handleReservation = (spot: ParkingSpot) => {
    setSelectedSpot(spot);
    setShowReservationModal(true);
  };

  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpot || !startTime || !endTime) return;

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/reservations/`,
        {
          parking_slot: selectedSpot.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          vehicle_plate: vehiclePlate,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 201) {
        setShowReservationModal(false);
        setShowSuccessModal(true);
        setStartTime(new Date());
        setEndTime(new Date());
        setVehiclePlate('');
        setSelectedSpot(null);
        refetchSpots();
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      if (axios.isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object') {
          Object.entries(errorData).forEach(([field, messages]) => {
            console.error(`${field}: ${messages}`);
          });
        }
      }
    }
  };

  const handleVehiclePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    if (/^[A-Z0-9]*$/.test(value) && value.length <= 6) {
      setVehiclePlate(value);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStartTimeChange = (newValue: Date | null) => {
    setStartTime(newValue);
    if (newValue) {
      const now = new Date();
      if (newValue <= now) {
        setStartTimeError('Start time must be in the future');
      } else {
        setStartTimeError('');
      }
    }
    if (newValue && endTime && newValue >= endTime) {
      setTimeError('End time must be after start time');
    } else {
      setTimeError('');
    }
  };

  const handleEndTimeChange = (newValue: Date | null) => {
    setEndTime(newValue);
    if (startTime && newValue && startTime >= newValue) {
      setTimeError('End time must be after start time');
    } else {
      setTimeError('');
    }
  };

  if (isLoadingLocation || isLoadingSpots) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-light" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (locationError || spotsError) {
    return (
      <div className="text-center py-5">
        <div className="alert alert-danger">
          {locationError ? 'Failed to load location details' : 'Failed to load parking spots'}
        </div>
        <Button variant="primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!location || !spotsData) {
    return (
      <div className="text-center py-5">
        <div className="alert alert-warning">No data available</div>
        <Button variant="primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const paginationItems = [];
  for (let number = 1; number <= spotsData.total_pages; number++) {
    paginationItems.push(
      <Pagination.Item
        key={number}
        active={number === currentPage}
        onClick={() => handlePageChange(number)}
      >
        {number}
      </Pagination.Item>
    );
  }

  return (
    <Container className="d-flex flex-column gap-4 h-100">
      <Link
        to="/dashboard"
        className="text-underline-hover text-white d-flex text-start align-items-center gap-2 mb-2"
      >
        <i className="bi bi-chevron-left"></i>
        Back to dashboard
      </Link>
      <Card className="location-name">
        <Card.Body>
          <h1 className="h3 mb-2">{location.name}</h1>
          <p className="text-subtitle-gray mb-0">
            <i className="bi bi-geo-alt me-2"></i>
            {location.address}
          </p>
        </Card.Body>
      </Card>
      <div className="w-100 h-100 overflow-auto">
        <div className="parking-grid">
          {spotsData.results.map((spot) => (
            <Card
              key={spot.id}
              className={`parking-slot ${
                !spot.is_occupied && !spot.is_reserved
                  ? 'available'
                  : spot.is_reserved
                    ? 'pending'
                    : 'occupied'
              }`}
              onClick={() => !spot.is_occupied && !spot.is_reserved && handleReservation(spot)}
            >
              <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                <div className="slot-number mb-2">{spot.slot_number}</div>
                {!spot.is_occupied && !spot.is_reserved ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReservation(spot);
                    }}
                  >
                    Reserve
                  </Button>
                ) : spot.is_reserved ? (
                  <span className="text-warning">Pending</span>
                ) : (
                  <span className="text-danger">Occupied</span>
                )}
              </Card.Body>
            </Card>
          ))}
        </div>
      </div>

      {/* pagination */}
      {spotsData.total_pages > 1 && (
        <div className="d-flex justify-content-center mt-auto">
          <Pagination className="dark-pagination">
            <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
            <Pagination.Prev
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            />
            {paginationItems}
            <Pagination.Next
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === spotsData.total_pages}
            />
            <Pagination.Last
              onClick={() => handlePageChange(spotsData.total_pages)}
              disabled={currentPage === spotsData.total_pages}
            />
          </Pagination>
        </div>
      )}

      {/* reservation modal */}
      <Modal show={showReservationModal} onHide={() => setShowReservationModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reserve Parking Spot {selectedSpot?.slot_number}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleReservationSubmit}>
          <Modal.Body>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Form.Group className="mb-3">
                <Form.Label>Start Time</Form.Label>
                <DateTimePicker
                  value={startTime}
                  onChange={handleStartTimeChange}
                  minDateTime={new Date()}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'medium',
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#fff',
                          borderRadius: '0.5rem',
                        },
                      },
                    },
                  }}
                />
                {startTimeError && <Form.Text className="text-danger">{startTimeError}</Form.Text>}
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>End Time</Form.Label>
                <DateTimePicker
                  value={endTime}
                  onChange={handleEndTimeChange}
                  minDateTime={startTime || new Date()}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'medium',
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#fff',
                          borderRadius: '0.5rem',
                        },
                      },
                    },
                  }}
                />
                {timeError && <Form.Text className="text-danger">{timeError}</Form.Text>}
              </Form.Group>
            </LocalizationProvider>
            <Form.Group className="mb-3">
              <Form.Label>Vehicle Plate Number</Form.Label>
              <Form.Control
                type="text"
                value={vehiclePlate}
                onChange={handleVehiclePlateChange}
                placeholder="Enter 6-character plate number"
                required
                maxLength={6}
                pattern="[A-Z0-9]{6}"
                title="Please enter a 6-character alphanumeric plate number"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowReservationModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!!timeError || !!startTimeError}>
              Reserve
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* success modal */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reservation Submitted</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center">
            <i className="bi bi-check-circle text-success" style={{ fontSize: '3rem' }}></i>
            <p className="mt-3">Your reservation has been submitted successfully!</p>
            <p className="text-muted">An admin will shortly confirm your submission.</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowSuccessModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
