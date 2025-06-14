import { Container } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

/**
 * Dashboard page
 *
 * @returns {React.ReactNode}
 */
export function Dashboard() {
  const { user } = useAuth();

  return (
    <Container className="py-4">
      <h1>Welcome, {user?.first_name}!</h1>
      <p>This is your dashboard. More features coming soon!</p>
    </Container>
  );
}
