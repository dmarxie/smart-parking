import { useState, useRef, useEffect } from 'react';
import { Button, Card, Col, Row, Modal } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from '../../components/admin';
import type { User } from '../../types/user';
import type { PaginatedResponse } from '../../types/reservation';

/**
 * Admin user management page
 *
 * @returns {React.ReactNode}
 */
export function AdminUserManagementPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // data fetching
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await axios.get<PaginatedResponse<User>>(
        `${import.meta.env.VITE_API_URL}/api/users/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
  });

  // Load all users
  useEffect(() => {
    const loadAllUsers = async () => {
      if (!usersData) return;

      let currentUsers = [...usersData.results];
      let nextUrl = usersData.next;

      while (nextUrl) {
        try {
          const response = await axios.get(nextUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = response.data as PaginatedResponse<User>;
          currentUsers = [...currentUsers, ...data.results];
          nextUrl = data.next;
        } catch (error) {
          console.error('Error loading more users:', error);
          break;
        }
      }
      setAllUsers(currentUsers);
    };

    loadAllUsers();
  }, [usersData, token]);

  // mutations
  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowDeleteModal(false);
      setUserToDelete(null);
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

  // loading state
  if (isLoading) {
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
        <h1 className="mb-4 text-start">User Management</h1>

        <Row xs={1} md={2} lg={3} className="g-4">
          {allUsers.map((user) => (
            <Col key={user.id}>
              <Card className="dark-mode-card h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <span className="text-start">User #{user.id}</span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setUserToDelete(user);
                      setShowDeleteModal(true);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <i className="bi bi-trash"></i>
                  </Button>
                </Card.Header>
                <Card.Body className="text-start">
                  <div className="d-flex flex-column gap-3">
                    <p className="break-all">
                      <strong>Email:</strong> {user.email}
                    </p>
                    <p>
                      <strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* delete confirmation modal */}
        <Modal
          show={showDeleteModal}
          onHide={() => {
            setShowDeleteModal(false);
            setUserToDelete(null);
          }}
          centered
          className="dark-mode-modal"
        >
          <Modal.Header closeButton>
            <Modal.Title>Confirm Delete</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to delete user {userToDelete?.email}? This action cannot be
            undone.
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setUserToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (userToDelete) {
                  deleteMutation.mutate(userToDelete.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}
