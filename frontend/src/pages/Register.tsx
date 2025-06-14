import { Container, Row, Col } from 'react-bootstrap';
import { RegisterForm } from '../components/auth/RegisterForm';

/**
 * Register page
 *
 * @returns {React.ReactNode}
 */
export function Register() {
  return (
    <Container fluid className="auth-container">
      <Row className="justify-content-center align-items-center min-vh-100">
        <Col xs={12} sm={10} md={8} lg={6} xl={5}>
          <RegisterForm />
        </Col>
      </Row>
    </Container>
  );
}
