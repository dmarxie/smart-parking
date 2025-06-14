import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Alert, InputGroup } from 'react-bootstrap';
import * as Yup from 'yup';
import { Formik, Form, Field } from 'formik';
import { useAuth } from '../../contexts/AuthContext';
import type { RegisterData } from '../../types/auth';

/**
 * Validation schema for the registration form
 *
 * @returns {Yup.ObjectSchema}
 */
const registerSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email address').required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters'),
  password2: Yup.string()
    .required('Please confirm your password')
    .oneOf([Yup.ref('password')], 'Passwords must match'),
  first_name: Yup.string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  last_name: Yup.string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  notification_preference: Yup.string()
    .oneOf(['ALL', 'IMPORTANT', 'NONE'], 'Invalid notification preference')
    .required('Notification preference is required'),
});

/**
 * Register form component
 *
 * @returns Register form component
 */
export function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const initialValues: RegisterData = {
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
    notification_preference: 'ALL',
  };

  const handleSubmit = async (values: RegisterData, { setStatus, setSubmitting }: any) => {
    try {
      await register(values);
      navigate('/dashboard');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'An error occurred during registration');
      setSubmitting(false);
    }
  };

  return (
    <Card className="register-form shadow-sm py-4">
      <Card.Body className="p-4">
        <Card.Title className="text-center mb-4">Create an Account</Card.Title>

        <Formik
          initialValues={initialValues}
          validationSchema={registerSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched, isSubmitting, status }) => (
            <Form>
              {status && (
                <Alert variant="danger" className="mb-3">
                  {status}
                </Alert>
              )}

              <div className="row mb-3">
                <div className="col-md-6">
                  <div className="d-flex flex-column text-start">
                    <label htmlFor="first_name" className="form-label">
                      First Name
                    </label>
                    <Field
                      type="text"
                      name="first_name"
                      className={`form-control ${errors.first_name && touched.first_name ? 'is-invalid' : ''}`}
                      placeholder="Enter your first name"
                    />
                    {errors.first_name && touched.first_name && (
                      <div className="invalid-feedback">{errors.first_name}</div>
                    )}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex flex-column text-start">
                    <label htmlFor="last_name" className="form-label">
                      Last Name
                    </label>
                    <Field
                      type="text"
                      name="last_name"
                      className={`form-control ${errors.last_name && touched.last_name ? 'is-invalid' : ''}`}
                      placeholder="Enter your last name"
                    />
                    {errors.last_name && touched.last_name && (
                      <div className="invalid-feedback">{errors.last_name}</div>
                    )}
                  </div>
                </div>
              </div>

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

              <div className="d-flex flex-column mb-3 text-start">
                <label htmlFor="password2" className="form-label">
                  Confirm Password
                </label>
                <InputGroup>
                  <Field
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="password2"
                    className={`form-control ${errors.password2 && touched.password2 ? 'is-invalid' : ''}`}
                    placeholder="Confirm your password"
                  />
                  <Button
                    variant="light"
                    type="button"
                    className="border-start-0"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </Button>
                  {errors.password2 && touched.password2 && (
                    <div className="invalid-feedback">{errors.password2}</div>
                  )}
                </InputGroup>
              </div>

              <div className="d-flex flex-column mb-4 text-start">
                <label htmlFor="notification_preference" className="form-label">
                  Notification Preference
                </label>
                <Field
                  as="select"
                  name="notification_preference"
                  className={`form-select ${errors.notification_preference && touched.notification_preference ? 'is-invalid' : ''}`}
                >
                  <option value="ALL">All Notifications</option>
                  <option value="IMPORTANT">Important Only</option>
                  <option value="NONE">No Notifications</option>
                </Field>
                {errors.notification_preference && touched.notification_preference && (
                  <div className="invalid-feedback">{errors.notification_preference}</div>
                )}
              </div>

              <Button variant="primary" type="submit" className="w-100" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Button>
            </Form>
          )}
        </Formik>

        <div className="auth-footer mt-3">
          <p className="mb-0 text-subtitle-gray">Already have an account?</p>
          <Link to="/login">Login here</Link>
        </div>
      </Card.Body>
    </Card>
  );
}
