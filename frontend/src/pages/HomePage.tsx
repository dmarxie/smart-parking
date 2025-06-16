import { Button, Col, Container, Image } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import homepageImage from '../assets/images/homepage-bg.png';

/**
 * Homepage component
 *
 * @returns Homepage component
 */
export function HomePage() {
  const navigate = useNavigate();

  return (
    <Container className="homepage px-0">
      <Image src={homepageImage} alt="Car Image" className="homepage-image" />
      <Container className="p-4 h-100 d-flex flex-column">
        <h1 className="welcome-title mb-2">Welcome to Navipark</h1>
        <p className="text-subtitle-gray lead mb-5">
          Your hassle-free parking solution starts here.
        </p>

        <Container className="homepage--login-options-container px-0 pt-5">
          <h3 className="text-white">Who's logging in?</h3>
          <Col className="w-100 d-flex flex-column gap-3">
            <Button size="lg" className="btn-primary w-100 py-3" onClick={() => navigate('/login')}>
              User Login
            </Button>
            <Button
              size="lg"
              className="btn-secondary w-100 py-3"
              onClick={() => navigate('/admin/login')}
            >
              Admin Login
            </Button>
            <div className="auth-footer">
              <p className="mb-0 text-subtitle-gray">Don't have an account?</p>
              <Link to="/register">Register here</Link>
            </div>
          </Col>
        </Container>
      </Container>
    </Container>
  );
}
