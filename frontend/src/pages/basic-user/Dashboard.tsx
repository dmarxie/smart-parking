import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal, Form, Card, Dropdown } from 'react-bootstrap';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import type { Location, LocationsResponse } from '../../types/location';
import type { Reservation, ReservationsResponse } from '../../types/reservation';
import type { UpdateProfileData, ChangePasswordData, MessageModalData } from '../../types/user';

interface LocationWithAvailability extends Location {
  confirmedReservations: number;
}

/**
 * Dashboard page for basic users
 * Shows active reservations, reservation history, and available parking locations
 *
 */
export function Dashboard() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalData, setMessageModalData] = useState<MessageModalData>({
    title: '',
    message: '',
    type: 'success',
  });
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [profileData, setProfileData] = useState<UpdateProfileData>({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    notification_preference: user?.notification_preference || 'ALL',
  });
  const [passwordData, setPasswordData] = useState<ChangePasswordData>({
    old_password: '',
    new_password: '',
    new_password2: '',
  });

  // data fetching queries
  const { data: reservationsData } = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/reservations/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      return response.data as ReservationsResponse;
    },
  });

  const { data: locationsData, isLoading: isLoadingLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/locations/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      return response.data as LocationsResponse;
    },
    // refresh every 30 seconds
    refetchInterval: 30000,
  });

  // mutations
  const updateProfile = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/users/me/`, data, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      updateUser(data);
      setShowProfileModal(false);
      setMessageModalData({
        title: 'Success',
        message: 'Profile updated successfully',
        type: 'success',
      });
      setShowMessageModal(true);
    },
    onError: () => {
      setMessageModalData({
        title: 'Error',
        message: 'Failed to update profile. Please try again.',
        type: 'error',
      });
      setShowMessageModal(true);
    },
  });

  const changePassword = useMutation({
    mutationFn: async (data: ChangePasswordData) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/users/me/change-password/`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      setShowPasswordModal(false);
      setPasswordData({
        old_password: '',
        new_password: '',
        new_password2: '',
      });
      setMessageModalData({
        title: 'Success',
        message: 'Password changed successfully',
        type: 'success',
      });
      setShowMessageModal(true);
    },
    onError: () => {
      setMessageModalData({
        title: 'Error',
        message: 'Failed to change password. Please try again.',
        type: 'error',
      });
      setShowMessageModal(true);
    },
  });

  // effects
  /**
   * load all reservations
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
              Authorization: `Bearer ${localStorage.getItem('access_token')}`,
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
      setIsLoadingMore(false);
      setAllReservations(currentReservations);
    };

    loadAllReservations();
  }, [reservationsData]);

  // helper functions
  /**
   * get confirmed reservations by location
   *
   * @returns
   */
  const getConfirmedReservationsByLocation = () => {
    if (!reservationsData?.results) return new Map<number, number>();

    const confirmedCounts = new Map<number, number>();
    reservationsData.results.forEach((reservation) => {
      if (reservation.status === 'CONFIRMED' && new Date(reservation.end_time) > new Date()) {
        const locationId = reservation.location;
        confirmedCounts.set(locationId, (confirmedCounts.get(locationId) || 0) + 1);
      }
    });
    return confirmedCounts;
  };

  /**
   * get locations with availability
   *
   * @returns
   */
  const getLocationsWithAvailability = (): LocationWithAvailability[] => {
    if (!locationsData?.results) return [];

    const confirmedReservations = getConfirmedReservationsByLocation();

    return locationsData.results.map((location) => ({
      ...location,
      confirmedReservations: confirmedReservations.get(location.id) || 0,
    }));
  };

  /**
   * handle profile submit
   *
   * @param e
   */
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.first_name || !profileData.last_name) {
      setMessageModalData({
        title: 'Validation Error',
        message: 'Please fill in all required fields',
        type: 'error',
      });
      setShowMessageModal(true);
      return;
    }
    setShowProfileModal(false);
    updateProfile.mutate(profileData);
  };

  /**
   * handle password submit
   *
   * @param e
   */
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.new_password2) {
      setMessageModalData({
        title: 'Validation Error',
        message: 'New passwords do not match',
        type: 'error',
      });
      setShowMessageModal(true);
      return;
    }
    changePassword.mutate(passwordData);
  };

  /**
   * handle logout
   *
   */
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const activeReservations = allReservations.filter(
    (reservation) =>
      reservation.status === 'CONFIRMED' && new Date(reservation.end_time) > new Date()
  ).length;
  const totalReservations = allReservations.length;

  return (
    <div className="w-100 h-100 d-flex flex-column gap-4">
      <div className="d-flex justify-content-end">
        {/* profile dropdown */}
        <Dropdown align="end">
          <Dropdown.Toggle
            variant="outline-light"
            className="d-flex align-items-center gap-2"
            id="profile-dropdown"
          >
            <i className="bi bi-person-circle"></i>
            {user?.first_name} {user?.last_name}
          </Dropdown.Toggle>

          <Dropdown.Menu>
            <Dropdown.Item onClick={() => setShowProfileModal(true)}>
              <i className="bi bi-person me-2"></i>
              Update Profile
            </Dropdown.Item>
            <Dropdown.Item onClick={() => setShowPasswordModal(true)}>
              <i className="bi bi-key me-2"></i>
              Change Password
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item onClick={handleLogout} className="text-danger">
              <i className="bi bi-box-arrow-right me-2"></i>
              Logout
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>

      <div className="row g-4">
        {/* user stats card */}
        <div className="col-12 col-md-4 col-lg-3">
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
                          <h6 className="text-start mb-1">Active Reservations</h6>
                          <h3 className="text-start mb-0">{activeReservations}</h3>
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
                          <h6 className="text-start mb-1">Reservation History</h6>
                          <h3 className="text-start mb-0">{totalReservations}</h3>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* location cards */}
        {isLoadingLocations ? (
          <div className="col-12 text-center py-4">
            <div className="spinner-border text-light" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          getLocationsWithAvailability().map((location) => (
            <div key={location.id} className="col-12 col-md-4 col-lg-3">
              <Card className="h-100 location-card">
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="card-title text-start mb-0">{location.name}</h5>
                    <span className={`badge ${location.is_active ? 'bg-success' : 'bg-danger'}`}>
                      {location.is_active ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <p className="text-subtitle-gray text-start mb-3">
                    <i className="bi bi-geo-alt me-2"></i>
                    {location.address}
                  </p>
                  <div className="d-flex justify-content-between align-items-center mb-3 mt-auto">
                    <div className="d-flex w-100 justify-content-between">
                      <small className="text-subtitle-gray d-block">Available Spots</small>
                      <span className="h5 mb-0">
                        <span className="text-primary">{location.available_slots}</span> /{' '}
                        {location.total_slots}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    className="w-100"
                    onClick={() => navigate(`/locations/${location.id}`)}
                  >
                    View Details
                  </Button>
                </Card.Body>
              </Card>
            </div>
          ))
        )}
      </div>

      {/* profile update modal */}
      <Modal show={showProfileModal} onHide={() => setShowProfileModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Update Profile</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleProfileSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>First Name</Form.Label>
              <Form.Control
                type="text"
                value={profileData.first_name}
                onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                type="text"
                value={profileData.last_name}
                onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notification Preference</Form.Label>
              <Form.Select
                value={profileData.notification_preference}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    notification_preference: e.target.value as 'ALL' | 'IMPORTANT' | 'NONE',
                  })
                }
              >
                <option value="ALL">All Notifications</option>
                <option value="IMPORTANT">Important Only</option>
                <option value="NONE">No Notifications</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowProfileModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* change password modal */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Change Password</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePasswordSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <div className="position-relative">
                <Form.Control
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.old_password}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, old_password: e.target.value })
                  }
                  required
                />
                <Button
                  variant="link"
                  className="position-absolute end-0 top-50 translate-middle-y text-dark p-0 me-2"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <i className={`bi ${showCurrentPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </Button>
              </div>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <div className="position-relative">
                <Form.Control
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.new_password}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, new_password: e.target.value })
                  }
                  required
                />
                <Button
                  variant="link"
                  className="position-absolute end-0 top-50 translate-middle-y text-dark p-0 me-2"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  <i className={`bi ${showNewPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </Button>
              </div>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Confirm New Password</Form.Label>
              <div className="position-relative">
                <Form.Control
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordData.new_password2}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, new_password2: e.target.value })
                  }
                  required
                />
                <Button
                  variant="link"
                  className="position-absolute end-0 top-50 translate-middle-y text-dark p-0 me-2"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </Button>
              </div>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? 'Changing...' : 'Change Password'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* message modal */}
      <Modal show={showMessageModal} onHide={() => setShowMessageModal(false)} centered>
        <Modal.Header
          closeButton
          className={`bg-dark text-white border-bottom ${
            messageModalData.type === 'success' ? 'border-success' : 'border-danger'
          }`}
        >
          <Modal.Title className="d-flex align-items-center gap-2">
            {messageModalData.type === 'success' ? (
              <i className="bi bi-check-circle-fill text-success"></i>
            ) : (
              <i className="bi bi-exclamation-circle-fill text-danger"></i>
            )}
            {messageModalData.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          <p className="mb-0">{messageModalData.message}</p>
        </Modal.Body>
        <Modal.Footer className="bg-dark text-white">
          <Button
            variant={messageModalData.type === 'success' ? 'success' : 'danger'}
            onClick={() => setShowMessageModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {isLoadingMore && (
        <div className="position-fixed bottom-0 end-0 m-3">
          <div className="spinner-border text-light" role="status">
            <span className="visually-hidden">Loading more reservations...</span>
          </div>
        </div>
      )}
    </div>
  );
}
