import { useState } from 'react';
import { Button, Card, Alert, InputGroup } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import * as Yup from 'yup';
import { Formik, Form, Field } from 'formik';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Validation schema for the login form
 *
 * @returns {Yup.ObjectSchema}
 */
const loginSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email address').required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

/**
 * Login form component
 *
 * @returns Login form component
 */
export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname === '/admin/login';
  const [showPassword, setShowPassword] = useState(false);

  /**
   * Handle the form submission
   *
   * @param values
   * @param {any} param1
   */
  const handleSubmit = async (
    values: { email: string; password: string },
    { setStatus, setSubmitting }: any
  ) => {
    try {
      await login(values.email, values.password, isAdmin);
      navigate(isAdmin ? '/admin/dashboard' : '/dashboard');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'An error occurred');
      setSubmitting(false);
    }
  };

  return (
    <Card className="login-form shadow-sm py-4">
      <Card.Body className="p-4">
        <Card.Title className="text-center mb-4">
          {isAdmin ? 'Admin Login' : 'User Login'}
        </Card.Title>

        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={loginSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched, isSubmitting, status }) => (
            <Form>
              {status && (
                <Alert variant="danger" className="mb-3">
                  {status}
                </Alert>
              )}

              <div className="d-flex flex-column mb-3 text-start">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <Field
                  type="email"
                  name="email"
                  className={`form-control ${errors.email && touched.email ? 'is-invalid' : ''}`}
                  placeholder="Enter your email"
                />
                {errors.email && touched.email && (
                  <div className="invalid-feedback">{errors.email}</div>
                )}
              </div>

              <div className="d-flex flex-column mb-3 text-start">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <InputGroup>
                  <Field
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className={`form-control ${errors.password && touched.password ? 'is-invalid' : ''}`}
                    placeholder="Enter your password"
                  />
                  <Button
                    variant="light"
                    type="button"
                    className="border-start-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </Button>
                  {errors.password && touched.password && (
                    <div className="invalid-feedback">{errors.password}</div>
                  )}
                </InputGroup>
              </div>

              <Button variant="primary" type="submit" className="w-100" disabled={isSubmitting}>
                {isSubmitting ? 'Logging in...' : 'Login'}
              </Button>
            </Form>
          )}
        </Formik>
        {!isAdmin && (
          <div className="auth-footer">
            <p className="mb-0 text-subtitle-gray">Don't have an account?</p>
            <Link to="/register">Register here</Link>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
