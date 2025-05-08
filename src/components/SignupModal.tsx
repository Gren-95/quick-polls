import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { useNavigate } from 'react-router-dom';
import { SignupSchema } from '../utils/validationSchemas';
import '../styles/SignupModal.css';

interface SignupFormValues {
  username: string;
  password: string;
  confirmPassword: string;
}

const SignupModal: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const initialValues: SignupFormValues = {
    username: '',
    password: '',
    confirmPassword: '',
  };

  const handleSubmit = async (values: SignupFormValues) => {
    try {
      setServerError(null);
      
      // In a real app, you would send a request to your API
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
      });

      // For demo purposes, simulate a successful response
      // In a real app, you would check the response status and handle accordingly
      if (response.ok) {
        setSignupSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        const errorData = await response.json();
        setServerError(errorData.message || 'Signup failed. Please try again.');
      }
    } catch (error) {
      setServerError('Network error. Please try again.');
      console.error('Signup error:', error);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="signup-modal-overlay">
      <div className="signup-modal">
        <h2>Create an Account</h2>
        
        {signupSuccess ? (
          <div className="success-message">
            Signup successful. Please log in.
          </div>
        ) : (
          <Formik
            initialValues={initialValues}
            validationSchema={SignupSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched, isValid, dirty }) => (
              <Form className="signup-form">
                {serverError && <div className="server-error">{serverError}</div>}
                
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <Field
                    id="username"
                    name="username"
                    type="text"
                    className={errors.username && touched.username ? 'error-input' : ''}
                  />
                  <ErrorMessage name="username" component="div" className="error-message" />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="password-field">
                    <Field
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      className={errors.password && touched.password ? 'error-input' : ''}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <ErrorMessage name="password" component="div" className="error-message" />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="password-field">
                    <Field
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={errors.confirmPassword && touched.confirmPassword ? 'error-input' : ''}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={toggleConfirmPasswordVisibility}
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <ErrorMessage name="confirmPassword" component="div" className="error-message" />
                </div>

                <button
                  type="submit"
                  className="signup-button"
                  disabled={!(isValid && dirty)}
                >
                  Sign Up
                </button>
              </Form>
            )}
          </Formik>
        )}
      </div>
    </div>
  );
};

export default SignupModal;
