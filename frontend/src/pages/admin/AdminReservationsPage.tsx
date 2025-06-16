import { useState, useRef, useEffect } from 'react';
import { Button, Card, Col, Row, Badge, Tabs, Tab } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from '../../components/admin';
import type { Reservation, PaginatedResponse } from '../../types/reservation';

/**
 * Admin reservations page
 *
 * @returns {React.ReactNode}
 */
export function AdminReservationsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // data fetching
  const {
    data: reservationsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/reservations/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data as PaginatedResponse;
    },
  });

  // mutations
  const confirmMutation = useMutation({
    mutationFn: async (reservationId: number) => {
      try {
        const response = await axios.patch(
          `${import.meta.env.VITE_API_URL}/api/reservations/${reservationId}/`,
          { status: 'CONFIRMED' },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        return response.data;
      } catch (error) {
        console.error('Error confirming reservation:', error);
        throw error;
      }
    },
    onMutate: async (reservationId: number) => {
      setAllReservations((prev) =>
        prev.map((reservation) =>
          reservation.id === reservationId
            ? { ...reservation, status: 'CONFIRMED' as const }
            : reservation
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (error, reservationId) => {
      console.error('Failed to confirm reservation:', error);
      setAllReservations((prev) =>
        prev.map((reservation) =>
          reservation.id === reservationId
            ? { ...reservation, status: 'PENDING' as const }
            : reservation
        )
      );
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (reservationId: number) => {
      try {
        const response = await axios.patch(
          `${import.meta.env.VITE_API_URL}/api/reservations/${reservationId}/`,
          { status: 'CANCELLED' },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        return response.data;
      } catch (error) {
        console.error('Error declining reservation:', error);
        throw error;
      }
    },
    onMutate: async (reservationId: number) => {
      setAllReservations((prev) =>
        prev.map((reservation) =>
          reservation.id === reservationId
            ? { ...reservation, status: 'CANCELLED' as const }
            : reservation
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (error, reservationId) => {
      console.error('Failed to decline reservation:', error);
      setAllReservations((prev) =>
        prev.map((reservation) =>
          reservation.id === reservationId
            ? { ...reservation, status: 'PENDING' as const }
            : reservation
        )
      );
    },
  });

  // effects]
  /**
   * automatically update reservation statuses based on time
   *
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setAllReservations((prev) =>
        prev.map((reservation) => {
          const now = new Date();
          const endTime = new Date(reservation.end_time);

          if (reservation.status === 'PENDING' && endTime <= now) {
            return { ...reservation, status: 'EXPIRED' as const };
          }

          if (reservation.status === 'CONFIRMED' && endTime <= now) {
            return { ...reservation, status: 'COMPLETED' as const };
          }

          return reservation;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * load all reservations
   *
   */
  useEffect(() => {
    const loadAllReservations = async () => {
      if (!reservationsData) return;

      let currentReservations = [...reservationsData.results];
      let nextUrl = reservationsData.next;

      while (nextUrl) {
        setIsLoadingMore(true);
        try {
          const response = await axios.get(nextUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = response.data as PaginatedResponse;
          currentReservations = [...currentReservations, ...data.results];
          nextUrl = data.next;
        } catch (error) {
          console.error('Error loading more reservations:', error);
          break;
        }
      }
      setIsLoadingMore(false);
      setAllReservations(currentReservations);
    };

    loadAllReservations();
  }, [reservationsData, token]);

  /**
   * handle sidebar click outside on mobile
   *
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (window.innerWidth <= 768 && sidebarOpen) {
        if (
          sidebarRef.current &&
          !sidebarRef.current.contains(event.target as Node) &&
          contentRef.current &&
          !contentRef.current.querySelector('.sidebar-toggle')?.contains(event.target as Node)
        ) {
          setSidebarOpen(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  // helper functions
  /**
   * get status badge
   *
   * @param reservation
   * @returns
   */
  const getStatusBadge = (reservation: Reservation) => {
    const now = new Date();
    const endTime = new Date(reservation.end_time);
    const isPastEndTime = endTime <= now;

    if (reservation.status === 'CONFIRMED' && isPastEndTime) {
      return (
        <Badge bg="info" className="text-white">
          COMPLETED
        </Badge>
      );
    }

    const variants = {
      PENDING: 'warning',
      CONFIRMED: 'success',
      CANCELLED: 'danger',
      COMPLETED: 'info',
      EXPIRED: 'secondary',
    };
    return (
      <Badge
        bg={variants[reservation.status]}
        className={reservation.status === 'EXPIRED' ? 'text-dark' : ''}
      >
        {reservation.status}
      </Badge>
    );
  };

  /**
   * filter reservations by status
   *
   * @param reservations
   * @returns
   */
  const filterReservationsByStatus = (reservations: Reservation[] | undefined) => {
    if (!reservations) return [];

    const now = new Date();
    let filteredReservations: Reservation[] = [];

    switch (activeTab) {
      case 'pending':
        filteredReservations = reservations.filter((r) => r.status === 'PENDING');
        break;
      case 'confirmed':
        filteredReservations = reservations.filter(
          (r) => r.status === 'CONFIRMED' && new Date(r.end_time) > now
        );
        break;
      case 'completed':
        filteredReservations = reservations.filter(
          (r) =>
            r.status === 'COMPLETED' || (r.status === 'CONFIRMED' && new Date(r.end_time) <= now)
        );
        break;
      case 'cancelled':
        filteredReservations = reservations.filter((r) => r.status === 'CANCELLED');
        break;
      case 'expired':
        filteredReservations = reservations.filter((r) => r.status === 'EXPIRED');
        break;
      default:
        filteredReservations = reservations;
    }

    return filteredReservations.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  /**
   * render reservation cards
   *
   * @param reservations
   * @returns
   */
  const renderReservationCards = (reservations: Reservation[]) => {
    if (reservations.length === 0) {
      return <div className="dark-mode-card py-4">No {activeTab} reservations found.</div>;
    }

    return (
      <Row xs={1} md={2} lg={3} className="g-4">
        {reservations.map((reservation) => (
          <Col key={reservation.id}>
            <Card className="dark-mode-card h-100">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <span className="text-start">Reservation #{reservation.id}</span>
                {getStatusBadge(reservation)}
              </Card.Header>
              <Card.Body className="text-start">
                <Card.Title className="text-center">
                  {reservation.location_name || 'Unknown Location'}
                </Card.Title>
                <div className="mb-3">
                  <strong>Slot Number:</strong> {reservation.slot_number || 'Unknown'}
                </div>
                <div className="mb-3">
                  <strong>Vehicle Plate:</strong> {reservation.vehicle_plate}
                </div>
                <div className="mb-3">
                  <strong>Start Time:</strong>{' '}
                  {format(new Date(reservation.start_time), 'MMM d, yyyy h:mm a')}
                </div>
                <div className="mb-3">
                  <strong>End Time:</strong>{' '}
                  {format(new Date(reservation.end_time), 'MMM d, yyyy h:mm a')}
                </div>
                <div className="mb-3">
                  <strong>User:</strong> {reservation.user_email}
                </div>
                {reservation.status === 'PENDING' && (
                  <div className="d-flex gap-2 justify-content-end">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => declineMutation.mutate(reservation.id)}
                      disabled={declineMutation.isPending}
                    >
                      Decline
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => confirmMutation.mutate(reservation.id)}
                      disabled={confirmMutation.isPending}
                    >
                      Confirm
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  // loading and error states
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-light" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="alert alert-danger" role="alert">
          Error loading reservations. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <Sidebar ref={sidebarRef} className={sidebarOpen ? 'show' : ''} />
      <div ref={contentRef} className="admin-content">
        <Button
          variant="outline-light"
          className="sidebar-toggle d-md-none mb-3"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <i className={`bi ${sidebarOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
        </Button>
        <h1 className="mb-4 text-start">Reservations</h1>
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k || 'pending')}
          className="d-flex gap-2 mb-4"
          variant="pills"
        >
          <Tab eventKey="pending" title="Pending">
            <div className="reservations-container">
              {renderReservationCards(filterReservationsByStatus(allReservations))}
            </div>
          </Tab>
          <Tab eventKey="confirmed" title="Confirmed">
            <div className="reservations-container">
              {renderReservationCards(filterReservationsByStatus(allReservations))}
            </div>
          </Tab>
          <Tab eventKey="completed" title="Completed">
            <div className="reservations-container">
              {renderReservationCards(filterReservationsByStatus(allReservations))}
            </div>
          </Tab>
          <Tab eventKey="cancelled" title="Cancelled">
            <div className="reservations-container">
              {renderReservationCards(filterReservationsByStatus(allReservations))}
            </div>
          </Tab>
          <Tab eventKey="expired" title="Expired">
            <div className="reservations-container">
              {renderReservationCards(filterReservationsByStatus(allReservations))}
            </div>
          </Tab>
        </Tabs>
        {isLoadingMore && (
          <div className="text-center py-3">
            <div className="spinner-border text-light" role="status">
              <span className="visually-hidden">Loading more reservations...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
