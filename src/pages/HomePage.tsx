import React from 'react';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <div className="home-container">
        <h1>Welcome to Quick Polls</h1>
        <p>Create and share polls quickly and easily.</p>
        <div className="cta-buttons">
          <Link to="/signup" className="cta-button">Sign Up</Link>
          <Link to="/login" className="cta-button secondary">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
