import { useState, useRef, useEffect } from 'react';
import { Card, Col, Container, Row, Button, Modal, Form } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/admin/Sidebar';

interface Location {
  id: number;
  name: string;
  address: string;
  total_slots: number;
  available_slots: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AddLocationData {
  name: string;
  address: string;
  total_slots: number;
  is_active: boolean;
}

interface LocationsPaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Location[];
}

/**
 * Admin locations page
 *
 * @returns {React.ReactNode}
 */
export function AdminLocationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState<AddLocationData>({
    name: '',
    address: '',
    total_slots: 1,
    is_active: true,
  });
  const [editFormData, setEditFormData] = useState<AddLocationData>({
    name: '',
    address: '',
    total_slots: 1,
    is_active: true,
  });

  /**
   * Get locations data
   *
   * @returns {LocationsPaginatedResponse}
   */
  const { data: locationsData, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await axios.get<LocationsPaginatedResponse>(
        `${import.meta.env.VITE_API_URL}/api/locations/`
      );
      return response.data.results;
    },
  });

  /**
   * Add location mutation
   *
   * @returns {void}
   */
  const addLocation = useMutation({
    mutationFn: async (data: AddLocationData) => {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/locations/`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setShowAddModal(false);
      setFormData({ name: '', address: '', total_slots: 1, is_active: true });
    },
  });

  /**
   * Update location mutation
   *
   * @returns {void}
   */
  const updateLocation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: AddLocationData }) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/locations/${id}/`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setShowEditModal(false);
      setSelectedLocation(null);
    },
  });

  /**
   * Delete location mutation
   *
   * @returns {void}
   */
  const deleteLocation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/locations/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setShowDeleteModal(false);
      setSelectedLocation(null);
    },
  });

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
   * Handle submit
   *
   * @param {React.FormEvent} e
   * @returns {void}
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addLocation.mutate(formData);
  };

  /**
   * Handle location click and navigate to slots page
   *
   * @param {number} locationId
   * @returns {void}
   */
  const handleLocationClick = (locationId: number) => {
    navigate(`/admin/locations/${locationId}/slots`);
  };

  /**
   * Handle edit location
   *
   * @param {React.MouseEvent} e
   * @param {Location} location
   * @returns {void}
   */
  const handleEditClick = (e: React.MouseEvent, location: Location) => {
    e.stopPropagation();
    setSelectedLocation(location);
    setEditFormData({
      name: location.name,
      address: location.address,
      total_slots: location.total_slots,
      is_active: location.is_active,
    });
    setShowEditModal(true);
  };

  /**
   * Handle delete location
   *
   * @param {React.MouseEvent} e
   * @param {Location} location
   * @returns {void}
   */
  const handleDeleteClick = (e: React.MouseEvent, location: Location) => {
    e.stopPropagation();
    setSelectedLocation(location);
    setShowDeleteModal(true);
  };

  /**
   * Handle edit submission
   *
   * @param {React.FormEvent} e
   * @returns {void}
   */
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLocation) {
      updateLocation.mutate({ id: selectedLocation.id, data: editFormData });
    }
  };

  /**
   * Handle delete confirmation
   *
   * @returns {void}
   */
  const handleDeleteConfirm = () => {
    if (selectedLocation) {
      deleteLocation.mutate(selectedLocation.id);
    }
  };

  if (isLoading) {
    return (
      <Container className="py-4">
        <div className="text-center">Loading locations...</div>
      </Container>
    );
  }

  const locations = Array.isArray(locationsData) ? locationsData : [];

  return (
    <div className="admin-layout">
      <Sidebar ref={sidebarRef} className={sidebarOpen ? 'show' : ''} />
      <Container className="admin-content">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>Parking Locations</h1>
        </div>

        <Row className="g-4">
          {/* add location card */}
          <Col xs={12} md={6} lg={4}>
            <Card
              className="h-100 location-card add-card"
              onClick={() => setShowAddModal(true)}
              style={{ minHeight: '200px' }}
            >
              <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center p-4">
                <i className="bi bi-plus-circle display-4 mb-3"></i>
                <Card.Title className="h5 mb-2">Add New Location</Card.Title>
                <Card.Text className="text-muted mb-0">
                  Click to add a new parking location
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>

          {/* existing locations */}
          {locations && locations.length > 0 ? (
            locations.map((location) => {
              return (
                <Col key={location.id} xs={12} md={6} lg={4}>
                  <Card
                    className="h-100 location-card"
                    onClick={() => handleLocationClick(location.id)}
                    style={{ minHeight: '200px' }}
                  >
                    <Card.Body className="d-flex flex-column p-4">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <Card.Title className="h5 mb-0">{location.name}</Card.Title>
                        <div className="d-flex gap-2">
                          <Button
                            variant="link"
                            className="p-0 text-light"
                            onClick={(e) => handleEditClick(e, location)}
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                          <Button
                            variant="link"
                            className="p-0 text-danger"
                            onClick={(e) => handleDeleteClick(e, location)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </div>
                      </div>
                      <Card.Text className="text-subtitle-gray address-text mb-3 text-start flex-grow-1">
                        {location.address}
                      </Card.Text>
                      <div className="d-flex justify-content-between align-items-center mt-auto">
                        <div className="d-flex gap-1 flex-column">
                          <small className="text-subtitle-gray d-block">Total Slots</small>
                          <strong>{location.total_slots}</strong>
                        </div>
                        <div className="d-flex gap-1 flex-column">
                          <small className="text-subtitle-gray d-block">Available</small>
                          <strong>{location.available_slots}</strong>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })
          ) : (
            <Col xs={12}>
              <div className="text-center text-muted py-5">
                <i className="bi bi-geo-alt display-4 mb-3"></i>
                <h4>No Locations Found</h4>
                <p>Click the "Add Location" button to create your first parking location.</p>
              </div>
            </Col>
          )}
        </Row>

        {/* add location modal */}
        <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Add New Location</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Location Name</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Total Slots</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={formData.total_slots}
                  onChange={(e) =>
                    setFormData({ ...formData, total_slots: parseInt(e.target.value) })
                  }
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="active-switch"
                  label="Active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={addLocation.isPending}>
                {addLocation.isPending ? 'Adding...' : 'Add Location'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* edit location modal */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Edit Location</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleEditSubmit}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Location Name</Form.Label>
                <Form.Control
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Total Slots</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={editFormData.total_slots}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, total_slots: parseInt(e.target.value) })
                  }
                  required
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={updateLocation.isPending}>
                {updateLocation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* delete location modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Delete Location</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to delete "{selectedLocation?.name}"? This action cannot be
            undone.
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              disabled={deleteLocation.isPending}
            >
              {deleteLocation.isPending ? 'Deleting...' : 'Delete Location'}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
}
