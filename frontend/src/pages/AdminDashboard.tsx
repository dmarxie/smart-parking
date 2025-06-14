import { Container, Row, Col, Card } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

/**
 * Admin dashboard page
 *
 * @returns {React.ReactNode}
 */
export function AdminDashboard() {
  const { user } = useAuth();

  return (
    <Container className="py-4">
      <h1 className="mb-4">Admin Dashboard</h1>
      <Row>
        <Col md={4}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Welcome, {user?.first_name}!</Card.Title>
              <Card.Text>You are logged in as an administrator.</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={8}>
          <Card>
            <Card.Body>
              <Card.Title>Admin Controls</Card.Title>
              <Card.Text>
                More admin features coming soon:
                <ul>
                  <li>User Management</li>
                  <li>Parking Space Management</li>
                  <li>Reports and Analytics</li>
                  <li>System Settings</li>
                </ul>
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
