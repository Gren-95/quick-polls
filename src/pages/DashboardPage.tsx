import React from 'react';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || sessionStorage.getItem('username');

  React.useEffect(() => {
    // Redirect to login if not authenticated
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="dashboard-bg">
      <div className="dashboard-card">
        <h1 className="dashboard-welcome">Welcome back{username ? `, ${username}` : ''}!</h1>
        <p className="dashboard-desc">This is your dashboard. You can create new polls or manage your existing ones.</p>
        <button className="dashboard-create-btn" onClick={() => navigate('/create-poll')}>+ Create New Poll</button>
        <hr className="dashboard-divider" />
        <div className="dashboard-section">
          <h3>Your Polls</h3>
          <div className="dashboard-polls-placeholder">No polls yet. Create your first poll!</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
