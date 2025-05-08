import React from 'react';
import { Link } from 'react-router-dom';

const LoginPage: React.FC = () => {
  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Login</h2>
        <p>This is a placeholder for the login page.</p>
        <p>After successful signup, users will be redirected here.</p>
        <Link to="/signup">Go back to Signup</Link>
      </div>
    </div>
  );
};

export default LoginPage;
