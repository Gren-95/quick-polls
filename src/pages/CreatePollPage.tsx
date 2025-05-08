import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AnswerOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  prompt: string;
  options: AnswerOption[];
  type: 'single' | 'multiple';
  randomize: boolean;
}

const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 20;
const MIN_OPTIONS = 3;

const CreatePollPage: React.FC = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([
    ...Array(MIN_QUESTIONS).fill(0).map((_, i) => ({
      id: `${Date.now()}-q${i}`,
      prompt: '',
      options: [
        { id: `${Date.now()}-q${i}-a1`, text: '' },
        { id: `${Date.now()}-q${i}-a2`, text: '' },
        { id: `${Date.now()}-q${i}-a3`, text: '' }
      ],
      type: 'single' as const,
      randomize: false
    }))
  ]);
  const [pollTitle, setPollTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successLink, setSuccessLink] = useState('');

  // Access control: check if user is authenticated
  React.useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // Add/remove/reorder questions
  const addQuestion = () => {
    if (questions.length >= MAX_QUESTIONS) return;
    setQuestions([
      ...questions,
      {
        id: `${Date.now()}-q${questions.length}`,
        prompt: '',
        options: [
          { id: `${Date.now()}-q${questions.length}-a1`, text: '' },
          { id: `${Date.now()}-q${questions.length}-a2`, text: '' },
          { id: `${Date.now()}-q${questions.length}-a3`, text: '' }
        ],
        type: 'single',
        randomize: false
      }
    ]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= MIN_QUESTIONS) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const moveQuestion = (from: number, to: number) => {
    if (to < 0 || to >= questions.length) return;
    const newQuestions = [...questions];
    const [moved] = newQuestions.splice(from, 1);
    newQuestions.splice(to, 0, moved);
    setQuestions(newQuestions);
  };

  // Update question/option fields
  const updateQuestion = (idx: number, changes: Partial<Question>) => {
    setQuestions(qs => qs.map((q, i) => (i === idx ? { ...q, ...changes } : q)));
  };
  const updateOption = (qIdx: number, oIdx: number, text: string) => {
    setQuestions(qs =>
      qs.map((q, i) =>
        i === qIdx
          ? {
            ...q,
            options: q.options.map((o, j) => (j === oIdx ? { ...o, text } : o))
          }
          : q
      )
    );
  };
  const addOption = (qIdx: number) => {
    setQuestions(qs =>
      qs.map((q, i) =>
        i === qIdx
          ? {
            ...q,
            options: [
              ...q.options,
              { id: `${Date.now()}-q${i}-a${q.options.length + 1}`, text: '' }
            ]
          }
          : q
      )
    );
  };
  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions(qs =>
      qs.map((q, i) =>
        i === qIdx && q.options.length > MIN_OPTIONS
          ? { ...q, options: q.options.filter((_, j) => j !== oIdx) }
          : q
      )
    );
  };

  // Validation
  const validatePoll = () => {
    if (!pollTitle.trim()) return 'Poll title is required.';
    if (questions.length < MIN_QUESTIONS) return 'At least 5 questions required.';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) return `Question ${i + 1} prompt required.`;
      const optionTexts = q.options.map(o => o.text.trim());
      if (optionTexts.length < MIN_OPTIONS) return `Each question needs at least 3 options.`;
      if (optionTexts.some(t => !t)) return `No empty options allowed in question ${i + 1}.`;
      const unique = new Set(optionTexts);
      if (unique.size !== optionTexts.length) return `Duplicate options in question ${i + 1}.`;
    }
    return '';
  };

  // Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errMsg = validatePoll();
    if (errMsg) {
      setError(errMsg);
      return;
    }
    setLoading(true);
    // Simulate POST to /api/polls/create
    setTimeout(() => {
      setLoading(false);
      // Generate mock poll link (in real app, use response)
      const pollId = Math.random().toString(36).substring(2, 8);
      setSuccessLink(`/polls/${pollId}`);
    }, 1200);
  };

  // Copy to clipboard
  const copyLink = () => {
    if (successLink) {
      navigator.clipboard.writeText(window.location.origin + successLink);
    }
  };

  if (successLink) {
    return (
      <div className="create-poll-page">
        <div className="poll-success">
          <h2>Poll created!</h2>
          <div className="poll-link-container">
            <input
              type="text"
              value={window.location.origin + successLink}
              readOnly
              style={{ width: '80%', marginRight: 8 }}
            />
            <button onClick={copyLink}>Copy to clipboard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-poll-page">
      <h2>Create a New Poll</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Poll Title</label>
          <input
            type="text"
            value={pollTitle}
            onChange={e => setPollTitle(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        {questions.map((q, qIdx) => (
          <div className="question-block" key={q.id}>
            <div className="question-header">
              <span>Question {qIdx + 1}</span>
              <button type="button" onClick={() => moveQuestion(qIdx, qIdx - 1)} disabled={qIdx === 0 || loading}>&uarr;</button>
              <button type="button" onClick={() => moveQuestion(qIdx, qIdx + 1)} disabled={qIdx === questions.length - 1 || loading}>&darr;</button>
              <button type="button" onClick={() => removeQuestion(qIdx)} disabled={questions.length <= MIN_QUESTIONS || loading}>Remove</button>
            </div>
            <input
              type="text"
              placeholder="Question prompt"
              value={q.prompt}
              onChange={e => updateQuestion(qIdx, { prompt: e.target.value })}
              disabled={loading}
              required
            />
            <div className="options-list">
              {q.options.map((o, oIdx) => (
                <div key={o.id} className="option-row">
                  <input
                    type="text"
                    placeholder={`Option ${oIdx + 1}`}
                    value={o.text}
                    onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                    disabled={loading}
                    required
                  />
                  <button type="button" onClick={() => removeOption(qIdx, oIdx)} disabled={q.options.length <= MIN_OPTIONS || loading}>Remove</button>
                </div>
              ))}
              <button type="button" onClick={() => addOption(qIdx)} disabled={loading}>Add Option</button>
            </div>
            <div className="question-settings">
              <label>
                <input
                  type="checkbox"
                  checked={q.type === 'multiple'}
                  onChange={e => updateQuestion(qIdx, { type: e.target.checked ? 'multiple' : 'single' })}
                  disabled={loading}
                />
                Allow multiple answers
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={q.randomize}
                  onChange={e => updateQuestion(qIdx, { randomize: e.target.checked })}
                  disabled={loading}
                />
                Randomize answer order
              </label>
            </div>
          </div>
        ))}
        <button type="button" onClick={addQuestion} disabled={questions.length >= MAX_QUESTIONS || loading}>
          Add Question
        </button>
        <div style={{ color: 'red', margin: '10px 0' }}>{error}</div>
        <button type="submit" disabled={loading}>Create Poll</button>
        {loading && <span style={{ marginLeft: 8 }}>Saving...</span>}
      </form>
    </div>
  );
};

export default CreatePollPage;
