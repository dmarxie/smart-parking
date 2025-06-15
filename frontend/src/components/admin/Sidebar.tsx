import { forwardRef, useState } from 'react';
import { Image, Nav, Modal, Button } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/logos/logo.jpg';

interface SidebarProps {
  className?: string;
}

/**
 * Sidebar component for the admin dashboard
 *
 * @param {SidebarProps} props
 * @param {string} props.className
 * @returns {React.ReactNode}
 */
export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(({ className }, ref) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
    { path: '/admin/locations', label: 'Parking Locations', icon: 'bi-geo-alt' },
    { path: '/admin/reservations', label: 'Reservations', icon: 'bi-calendar-check' },
    { path: '/admin/users', label: 'User Management', icon: 'bi-people' },
  ];

  /**
   * Handle logout click
   *
   * @returns {void}
   */
  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  /**
   * Handle confirm logout
   *
   * @returns {void}
   */
  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/');
  };

  return (
    <>
      <div ref={ref} className={`admin-sidebar ${className || ''}`}>
        <div className="sidebar-header p-3">
          <Image src={logo} alt="Navipark Logo" className="w-100 h-75 object-fit-contain" />
        </div>
        <div className="d-flex flex-column h-100">
          <Nav className="flex-column p-3">
            {navItems.map((item) => (
              <Nav.Link
                key={item.path}
                as={Link}
                to={item.path}
                className={`d-flex align-items-center gap-2 ${
                  location.pathname === item.path ? 'active' : ''
                }`}
              >
                <i className={`bi ${item.icon}`}></i>
                {item.label}
              </Nav.Link>
            ))}
          </Nav>
          <div className="px-3">
            <Nav.Link
              onClick={handleLogoutClick}
              className="d-flex align-items-center gap-2 text-danger"
            >
              <i className="bi bi-box-arrow-right"></i>
              Logout
            </Nav.Link>
          </div>
        </div>
      </div>

      <Modal
        show={showLogoutModal}
        onHide={() => setShowLogoutModal(false)}
        centered
        className="logout-modal"
      >
        <Modal.Header closeButton className="border-0">
          <Modal.Title>Confirm Logout</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to logout? You will need to login again to access the admin panel.
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmLogout}>
            Logout
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
});
