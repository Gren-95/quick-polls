import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Poll, PollQuestion, PollAnswer } from '../utils/mockApi';
import '../styles/PollViewPage.css';

const PollViewPage: React.FC = () => {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [authRequired, setAuthRequired] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Check if user is logged in
  useEffect(() => {
    // In a real app, this would check the user's session
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);
  
  // Fetch poll data
  useEffect(() => {
    const fetchPoll = async () => {
      try {
        setLoading(true);
        console.log('Attempting to fetch poll with ID:', pollId);
        
        const response = await fetch(`/api/polls/${pollId}`);
        const data = await response.json();
        
        console.log('Poll fetch response:', data);
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch poll');
        }
        
        setPoll(data.poll);
        
        // Check if poll requires authentication
        if (data.poll.isRestricted && !userId) {
          setAuthRequired(true);
        }
        
        // Check if user has already completed this poll
        if (userId) {
          const hasCompleted = await fetch(`/api/polls/${pollId}/completed?userId=${userId}`).then(res => res.json());
          if (hasCompleted) {
            setSubmitted(true);
            setError('You have already completed this poll.');
          }
        }
      } catch (err) {
        console.error('Error fetching poll:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    if (pollId) {
      fetchPoll();
    }
  }, [pollId, userId]);
  
  // Handle option selection
  const handleOptionSelect = (questionId: string, optionId: string, isMultiple: boolean) => {
    setAnswers(prev => {
      const currentAnswers = prev[questionId] || [];
      
      // For single choice questions, replace the answer
      if (!isMultiple) {
        return { ...prev, [questionId]: [optionId] };
      }
      
      // For multiple choice, toggle the selection
      if (currentAnswers.includes(optionId)) {
        return { ...prev, [questionId]: currentAnswers.filter(id => id !== optionId) };
      } else {
        return { ...prev, [questionId]: [...currentAnswers, optionId] };
      }
    });
    
    // Clear validation error for this question if it exists
    if (validationErrors[questionId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };
  
  // Validate current question
  const validateCurrentQuestion = (): boolean => {
    if (!poll) return false;
    
    const currentQuestion = poll.questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestion.id] || [];
    
    // Check if question is answered
    if (currentAnswer.length === 0) {
      setValidationErrors(prev => ({
        ...prev,
        [currentQuestion.id]: 'Please answer this question'
      }));
      return false;
    }
    
    // For single choice questions, ensure only one option is selected
    if (currentQuestion.type === 'single' && currentAnswer.length !== 1) {
      setValidationErrors(prev => ({
        ...prev,
        [currentQuestion.id]: 'Please select exactly one option'
      }));
      return false;
    }
    
    return true;
  };
  
  // Navigate to next question
  const handleNext = () => {
    if (validateCurrentQuestion()) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };
  
  // Navigate to previous question
  const handlePrevious = () => {
    setCurrentQuestionIndex(prev => prev - 1);
  };
  
  // Submit poll answers
  const handleSubmit = async () => {
    if (!poll) return;
    
    // Validate all questions are answered
    const allQuestionsAnswered = poll.questions.every(q => {
      const questionAnswers = answers[q.id] || [];
      return questionAnswers.length > 0 && (q.type !== 'single' || questionAnswers.length === 1);
    });
    
    if (!allQuestionsAnswered) {
      // Find unanswered questions and set validation errors
      const newErrors: Record<string, string> = {};
      
      poll.questions.forEach(q => {
        const questionAnswers = answers[q.id] || [];
        if (questionAnswers.length === 0) {
          newErrors[q.id] = 'Please answer this question';
        } else if (q.type === 'single' && questionAnswers.length !== 1) {
          newErrors[q.id] = 'Please select exactly one option';
        }
      });
      
      setValidationErrors(newErrors);
      
      // Navigate to the first unanswered question
      const firstUnansweredIndex = poll.questions.findIndex(q => newErrors[q.id]);
      if (firstUnansweredIndex >= 0) {
        setCurrentQuestionIndex(firstUnansweredIndex);
      }
      
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Format answers for submission
      const formattedAnswers: PollAnswer[] = Object.entries(answers).map(([questionId, selectedOptions]) => ({
        questionId,
        selectedOptions
      }));
      
      const response = await fetch(`/api/polls/submit/${pollId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          answers: formattedAnswers,
          userId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit poll');
      }
      
      setSubmitted(true);
      
      // Automatically redirect to home page after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while submitting your answers');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="poll-view-page">
        <div className="loading-spinner"></div>
        <p>Loading poll...</p>
      </div>
    );
  }
  
  // Render error state
  if (error && !authRequired) {
    return (
      <div className="poll-view-page">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="primary-button">
            Back to Home
          </button>
        </div>
      </div>
    );
  }
  
  // Render authentication required state
  if (authRequired) {
    return (
      <div className="poll-view-page">
        <div className="auth-required-container">
          <h2>Authentication Required</h2>
          <p>You need to be logged in to answer this poll.</p>
          <div className="button-group">
            <button onClick={() => navigate('/login')} className="primary-button">
              Log In
            </button>
            <button onClick={() => navigate('/signup')} className="secondary-button">
              Sign Up
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Render success state after submission
  if (submitted) {
    return (
      <div className="poll-view-page">
        <div className="success-container">
          <h2>Thank you for completing the poll!</h2>
          <p>Your responses have been recorded.</p>
          <button onClick={() => navigate('/')} className="primary-button">
            Back to Home
          </button>
        </div>
      </div>
    );
  }
  
  // Render poll content
  if (!poll) {
    return null;
  }
  
  const currentQuestion = poll.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === poll.questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const progress = ((currentQuestionIndex + 1) / poll.questions.length) * 100;
  
  return (
    <div className="poll-view-page">
      <div className="poll-container">
        <h1>{poll.title}</h1>
        <p className="poll-description">{poll.description}</p>
        
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          <span className="progress-text">Question {currentQuestionIndex + 1} of {poll.questions.length}</span>
        </div>
        
        <div className="question-container">
          <h3 className="question-text">{currentQuestion.text}</h3>
          
          <div className="options-container">
            {currentQuestion.options.map(option => (
              <div 
                key={option.id} 
                className={`option ${answers[currentQuestion.id]?.includes(option.id) ? 'selected' : ''}`}
                onClick={() => handleOptionSelect(currentQuestion.id, option.id, currentQuestion.type === 'multiple')}
              >
                <div className={`option-selector ${currentQuestion.type === 'multiple' ? 'checkbox' : 'radio'}`}>
                  {answers[currentQuestion.id]?.includes(option.id) && (
                    <div className="selected-indicator"></div>
                  )}
                </div>
                <span className="option-text">{option.text}</span>
              </div>
            ))}
          </div>
          
          {validationErrors[currentQuestion.id] && (
            <div className="validation-error">{validationErrors[currentQuestion.id]}</div>
          )}
          
          <div className="navigation-buttons">
            {!isFirstQuestion && (
              <button 
                onClick={handlePrevious} 
                className="secondary-button"
                disabled={submitting}
              >
                Previous
              </button>
            )}
            
            {!isLastQuestion ? (
              <button 
                onClick={handleNext} 
                className="primary-button"
                disabled={submitting}
              >
                Next
              </button>
            ) : (
              <button 
                onClick={handleSubmit} 
                className="primary-button submit-button"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PollViewPage;
