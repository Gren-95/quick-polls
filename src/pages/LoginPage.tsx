import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as Yup from 'yup';

const LoginSchema = Yup.object().shape({
  username: Yup.string()
    .trim('No leading or trailing spaces')
    .required('Username is required'),
  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

const LoginPage: React.FC = () => {
  const [form, setForm] = useState({ username: '', password: '', remember: false });
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<{ username: boolean; password: boolean }>({ username: false, password: false });
  const navigate = useNavigate();

  // Validate the form fields
  const validate = async () => {
    try {
      await LoginSchema.validate(form, { abortEarly: false });
      setErrors({});
      return true;
    } catch (err: any) {
      const newErrors: any = {};
      err.inner.forEach((e: any) => {
        newErrors[e.path] = e.message;
      });
      setErrors(newErrors);
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    setTouched(t => ({ ...t, [name]: true }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched(t => ({ ...t, [e.target.name]: true }));
    validate();
  };

  const canSubmit =
    form.username.trim() !== '' &&
    form.password !== '' &&
    Object.keys(errors).length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    const isValid = await validate();
    if (!isValid) return;
    setLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username.trim(), password: form.password }),
      });
      const data = await response.json();
      if (response.ok) {
        // Store token/session (mock: just localStorage)
        if (form.remember) {
          localStorage.setItem('token', 'mock-token');
          localStorage.setItem('username', form.username.trim());
        } else {
          sessionStorage.setItem('token', 'mock-token');
          sessionStorage.setItem('username', form.username.trim());
        }
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setServerError(data.message || 'Incorrect username or password.');
      }
    } catch (err) {
      setServerError('Server error. Please try again later.');
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Login</h2>
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              disabled={loading}
            />
            {touched.username && errors.username && (
              <div className="error-msg">{errors.username}</div>
            )}
          </div>
          <div className="form-group">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            {touched.password && errors.password && (
              <div className="error-msg">{errors.password}</div>
            )}
          </div>
          <div className="form-group remember-me">
            <label>
              <input
                type="checkbox"
                name="remember"
                checked={form.remember}
                onChange={handleChange}
                disabled={loading}
              />
              Remember me
            </label>
          </div>
          {serverError && <div className="error-msg" style={{ marginBottom: 10 }}>{serverError}</div>}
          <button
            type="submit"
            className="login-btn"
            disabled={!canSubmit || loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div style={{ marginTop: 16 }}>
          <Link to="/signup">Go back to Signup</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
