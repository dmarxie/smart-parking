import { Link } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import { LoginForm } from '../components/auth/LoginForm';

/**
 * Admin Login page component
 *
 * @returns Admin login page component
 */
export function AdminLoginPage() {
  return (
    <Container className="py-5 h-100 d-flex justify-content-center align-items-center">
      <Row className="justify-content-center w-100">
        <Col md={8} lg={5}>
          <Link
            to="/"
            className="text-underline-hover text-white d-flex text-start align-items-center gap-2 mb-2"
          >
            <i className="bi bi-chevron-left"></i>
            Back to homepage
          </Link>
          <LoginForm isAdmin />
        </Col>
      </Row>
    </Container>
  );
}
