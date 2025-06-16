import { useState, useEffect } from 'react';
import { Button, Card, Container, Form, Modal, Pagination } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useAuth } from '../../contexts/AuthContext';
import type { Location } from '../../types/location';
import type { ParkingSpot, ParkingSpotPaginatedResponse } from '../../types/parking';
import '../../styles/parking.css';

/**
 * Parking slots page
 *
 * @returns {React.ReactNode}
 */
export function ParkingSlots() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalData, setMessageModalData] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error';
  }>({
    title: '',
    message: '',
    type: 'success',
  });
  const [reservationToCancel, setReservationToCancel] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [endTime, setEndTime] = useState<Date | null>(new Date());
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [timeError, setTimeError] = useState<string>('');
  const [startTimeError, setStartTimeError] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // data fetching
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
    // refetch every 5 minutes
    refetchInterval: 5 * 60 * 1000,
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
      return response.data as ParkingSpotPaginatedResponse;
    },
    retry: 1,
  });

  // mutations
  const cancelReservation = useMutation({
    mutationFn: async (reservationId: number) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/reservations/${reservationId}/`,
        { status: 'CANCELLED' },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      setShowCancelModal(false);
      setReservationToCancel(null);
      refetchSpots();
      setMessageModalData({
        title: 'Success',
        message: 'Reservation cancelled successfully',
        type: 'success',
      });
      setShowMessageModal(true);
    },
    onError: () => {
      setMessageModalData({
        title: 'Error',
        message: 'Failed to cancel reservation. Please try again.',
        type: 'error',
      });
      setShowMessageModal(true);
    },
  });

  // effects
  /**
   * update current time every minute
   *
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  // event handlers
  /**
   * handle reservation
   *
   * @param spot
   */
  const handleReservation = (spot: ParkingSpot) => {
    setSelectedSpot(spot);
    setShowReservationModal(true);
  };

  /**
   * handle reservation submission
   *
   * @param e
   * @returns
   */
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

  /**
   * handle vehicle plate change
   *
   * @param e
   */
  const handleVehiclePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    if (/^[A-Z0-9]*$/.test(value) && value.length <= 6) {
      setVehiclePlate(value);
    }
  };

  /**
   * handle page change
   *
   * @param page
   */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  /**
   * handle start time change
   *
   * @param newValue
   */
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

  /**
   * handle end time change
   *
   * @param newValue
   */
  const handleEndTimeChange = (newValue: Date | null) => {
    setEndTime(newValue);
    if (startTime && newValue && startTime >= newValue) {
      setTimeError('End time must be after start time');
    } else {
      setTimeError('');
    }
  };

  /**
   * handle cancel reservation
   *
   * @param reservationId
   */
  const handleCancelReservation = (reservationId: number) => {
    setReservationToCancel(reservationId);
    setShowCancelModal(true);
  };

  const confirmCancel = () => {
    if (reservationToCancel) {
      cancelReservation.mutate(reservationToCancel);
    }
  };

  // helper functions
  /**
   * get slot status
   *
   * @param spot
   * @returns
   */
  const getSlotStatus = (spot: ParkingSpot) => {
    const now = currentTime;
    if (spot.current_reservation) {
      const startTime = new Date(spot.current_reservation.start_time);
      const endTime = new Date(spot.current_reservation.end_time);
      const isWithinTimeFrame = now >= startTime && now <= endTime;

      if (
        spot.current_reservation.status === 'PENDING' &&
        user &&
        spot.current_reservation.user === user.id
      ) {
        return {
          text: 'Pending',
          variant: 'warning',
          canCancel: true,
          reservationId: spot.current_reservation.id,
        };
      }
      if (spot.current_reservation.status === 'CONFIRMED' && isWithinTimeFrame) {
        return { text: 'Occupied', variant: 'danger' };
      }
      if (spot.current_reservation.status === 'CONFIRMED' && now < startTime) {
        return { text: 'Confirmed', variant: 'primary' };
      }
    }
    if (spot.is_occupied) {
      return { text: 'Occupied', variant: 'danger' };
    }
    return { text: 'Available', variant: 'success' };
  };

  /**
   * render parking spots
   *
   * @returns
   */
  const renderParkingSpots = () => {
    if (!spotsData?.results) return null;

    return (
      <div className="parking-grid">
        {spotsData.results.map((spot) => {
          const status = getSlotStatus(spot);
          const isAvailable = status.variant === 'success' && status.text === 'Available';
          const isCompleted = status.variant === 'dark' && status.text === 'Completed';
          const isConfirmed = status.variant === 'primary' && status.text === 'Confirmed';

          return (
            <Card
              key={spot.id}
              className={`parking-slot ${
                isCompleted
                  ? 'completed'
                  : isConfirmed
                    ? 'confirmed'
                    : status.variant === 'success'
                      ? 'available'
                      : status.variant === 'danger'
                        ? 'occupied'
                        : 'pending'
              }`}
              onClick={() => isAvailable && handleReservation(spot)}
            >
              <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                <h3 className="slot-number mb-3">{spot.slot_number}</h3>
                <span className={`badge bg-${status.variant} mb-2`}>{status.text}</span>
                {isAvailable && (
                  <Button variant="primary" size="sm" className="mt-2">
                    Reserve
                  </Button>
                )}
                {status.canCancel && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelReservation(status.reservationId!);
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </Card.Body>
            </Card>
          );
        })}
      </div>
    );
  };

  // loading and error states
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

  // pagination
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
      <Card className="dark-mode-card">
        <Card.Body>
          <h1 className="h3 mb-2">{location.name}</h1>
          <p className="text-subtitle-gray mb-0">
            <i className="bi bi-geo-alt me-2"></i>
            {location.address}
          </p>
        </Card.Body>
      </Card>
      <div className="w-100 h-100 overflow-auto">{renderParkingSpots()}</div>

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

      {/* cancel confirmation modal */}
      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cancel Reservation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to cancel this reservation?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
            No, Keep It
          </Button>
          <Button variant="danger" onClick={confirmCancel} disabled={cancelReservation.isPending}>
            {cancelReservation.isPending ? 'Cancelling...' : 'Yes, Cancel It'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* message modal */}
      <Modal show={showMessageModal} onHide={() => setShowMessageModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{messageModalData.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center">
            <i
              className={`bi bi-${messageModalData.type === 'success' ? 'check-circle text-success' : 'x-circle text-danger'}`}
              style={{ fontSize: '3rem' }}
            ></i>
            <p className="mt-3">{messageModalData.message}</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowMessageModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
