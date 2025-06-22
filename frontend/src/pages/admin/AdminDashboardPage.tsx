import { useState, useRef, useEffect } from 'react';
import { Button, Card, Col, Row } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from '../../components/admin/Sidebar';
import type { ReservationsResponse } from '../../types/reservation';
import type { LocationsResponse } from '../../types/location';

/**
 * Admin dashboard page
 *
 * @returns {React.ReactNode}
 */
export function AdminDashboard() {
  const { token } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [allReservations, setAllReservations] = useState<ReservationsResponse['results']>([]);

  // data fetching queries
  const { data: reservationsData, isLoading: isLoadingReservations } = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const response = await axios.get<ReservationsResponse>(
        `${import.meta.env.VITE_API_URL}/api/reservations/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
  });

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await axios.get<LocationsResponse>(
        `${import.meta.env.VITE_API_URL}/api/locations/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
  });

  // effects
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
        try {
          const response = await axios.get(nextUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = response.data as ReservationsResponse;
          currentReservations = [...currentReservations, ...data.results];
          nextUrl = data.next;
        } catch (error) {
          console.error('Error loading more reservations:', error);
          break;
        }
      }
      setAllReservations(currentReservations);
    };

    loadAllReservations();
  }, [reservationsData, token]);

  // helper functions
  /**
   * get reservation stats
   *
   * @returns {Object}
   */
  const getReservationStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const pendingReservations = allReservations.filter((r) => r.status === 'PENDING');
    const confirmedReservations = allReservations.filter(
      (r) => r.status === 'CONFIRMED' && new Date(r.end_time) > now
    );
    const completedReservations = allReservations.filter(
      (r) => r.status === 'COMPLETED' || (r.status === 'CONFIRMED' && new Date(r.end_time) <= now)
    );
    const cancelledReservations = allReservations.filter((r) => r.status === 'CANCELLED');
    const expiredReservations = allReservations.filter((r) => r.status === 'EXPIRED');

    const totalToday = allReservations.filter((r) => {
      const reservationDate = new Date(r.created_at);
      const isToday = reservationDate >= today;
      return isToday && (r.status === 'CONFIRMED' || r.status === 'COMPLETED');
    }).length;

    return {
      total: totalToday,
      pending: pendingReservations.length,
      confirmed: confirmedReservations.length,
      cancelled: cancelledReservations.length,
      completed: completedReservations.length,
      expired: expiredReservations.length,
    };
  };

  /**
   * get location stats
   *
   * @returns {Object}
   */
  const getLocationStats = () => {
    if (!locationsData?.results)
      return {
        total: 0,
        active: 0,
        totalSlots: 0,
        availableSlots: 0,
      };

    return locationsData.results.reduce(
      (acc, location) => {
        acc.total++;
        if (location.is_active) acc.active++;
        acc.totalSlots += location.total_slots;
        acc.availableSlots += location.available_slots;
        return acc;
      },
      { total: 0, active: 0, totalSlots: 0, availableSlots: 0 }
    );
  };

  const reservationStats = getReservationStats();
  const locationStats = getLocationStats();

  if (isLoadingReservations) {
    return (
      <div className="admin-layout">
        <Sidebar ref={sidebarRef} className={sidebarOpen ? 'show' : ''} />
        <div ref={contentRef} className="admin-content">
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ height: '100vh' }}
          >
            <div className="spinner-border text-light" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
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
        <h1 className="mb-4 text-start">Dashboard</h1>

        <div className="reservations-container">
          <Row className="g-4">
            {/* Reservation Stats */}
            <Col md={6}>
              <Card className="h-100 user-card">
                <Card.Body>
                  <div className="d-flex flex-column gap-4">
                    <div className="w-100">
                      <Card className="h-100 stat-card">
                        <Card.Body>
                          <div className="d-flex align-items-center gap-3">
                            <div className="stat-icon">
                              <i className="bi bi-calendar-check"></i>
                            </div>
                            <div>
                              <h6 className="text-start mb-1">Total Reservations Today</h6>
                              <h3 className="text-start mb-0">{reservationStats.total}</h3>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                    <div className="w-100">
                      <Card className="h-100 stat-card">
                        <Card.Body>
                          <div className="d-flex align-items-center gap-3">
                            <div className="stat-icon">
                              <i className="bi bi-clock"></i>
                            </div>
                            <div>
                              <h6 className="text-start mb-1">Pending Reservations</h6>
                              <h3 className="text-start mb-0">{reservationStats.pending}</h3>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Location Stats */}
            <Col md={6}>
              <Card className="h-100 user-card">
                <Card.Body>
                  <div className="d-flex flex-column gap-4">
                    <div className="w-100">
                      <Card className="h-100 stat-card">
                        <Card.Body>
                          <div className="d-flex align-items-center gap-3">
                            <div className="stat-icon">
                              <i className="bi bi-geo-alt"></i>
                            </div>
                            <div>
                              <h6 className="text-start mb-1">Active Locations</h6>
                              <h3 className="text-start mb-0">{locationStats.active}</h3>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                    <div className="w-100">
                      <Card className="h-100 stat-card">
                        <Card.Body>
                          <div className="d-flex align-items-center gap-3">
                            <div className="stat-icon">
                              <i className="bi bi-p-square"></i>
                            </div>
                            <div>
                              <h6 className="text-start mb-1">Available Slots</h6>
                              <h3 className="text-start mb-0">
                                {locationStats.availableSlots}/{locationStats.totalSlots}
                              </h3>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Additional Stats */}
            <Col md={12}>
              <Card className="h-100 user-card">
                <Card.Body>
                  <div className="d-flex flex-column gap-4">
                    <div className="w-100">
                      <Card className="h-100 stat-card">
                        <Card.Body>
                          <div className="d-flex align-items-center gap-3">
                            <div className="stat-icon">
                              <i className="bi bi-check-circle"></i>
                            </div>
                            <div>
                              <h6 className="text-start mb-1">Confirmed Reservations</h6>
                              <h3 className="text-start mb-0">{reservationStats.confirmed}</h3>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                    <div className="w-100">
                      <Card className="h-100 stat-card">
                        <Card.Body>
                          <div className="d-flex align-items-center gap-3">
                            <div className="stat-icon">
                              <i className="bi bi-x-circle"></i>
                            </div>
                            <div>
                              <h6 className="text-start mb-1">Cancelled Reservations</h6>
                              <h3 className="text-start mb-0">{reservationStats.cancelled}</h3>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                    <div className="w-100">
                      <Card className="h-100 stat-card">
                        <Card.Body>
                          <div className="d-flex align-items-center gap-3">
                            <div className="stat-icon">
                              <i className="bi bi-check2-all"></i>
                            </div>
                            <div>
                              <h6 className="text-start mb-1">Completed Reservations</h6>
                              <h3 className="text-start mb-0">{reservationStats.completed}</h3>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                    <div className="w-100">
                      <Card className="h-100 stat-card">
                        <Card.Body>
                          <div className="d-flex align-items-center gap-3">
                            <div className="stat-icon">
                              <i className="bi bi-clock-history"></i>
                            </div>
                            <div>
                              <h6 className="text-start mb-1">Expired Reservations</h6>
                              <h3 className="text-start mb-0">{reservationStats.expired}</h3>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    </div>
  );
}
