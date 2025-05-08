import React from 'react';
import { useParams } from 'react-router-dom';

const PollViewPage: React.FC = () => {
  const { pollId } = useParams<{ pollId: string }>();

  return (
    <div className="poll-view-page" style={{ maxWidth: 600, margin: '40px auto', background: '#fff', borderRadius: 8, padding: 32, boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
      <h2>Poll: {pollId}</h2>
      <div style={{ color: '#888', marginTop: 16 }}>
        This is a placeholder for poll content.<br />
        (Poll questions and voting will appear here.)
      </div>
    </div>
  );
};

export default PollViewPage;
