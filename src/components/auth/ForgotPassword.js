import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [state, setState] = useState({
        loading: false,
        error: null,
        success: false,
        email: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            await axios.post('/api/auth/forgot-password', {
                email: state.email
            });

            setState({
                loading: false,
                success: true,
                error: null,
                email: ''
            });

            // Redirect to login after success with delay
            setTimeout(() => {
                navigate('/login');
            }, 5000);

        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error.response?.data?.msg || 'Failed to send reset email'
            }));
        }
    };

    const handleChange = (e) => {
        setState(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <div className="auth-container">
            <h2>Forgot Password</h2>
            
            {state.error && (
                <div className="error-message">
                    {state.error}
                </div>
            )}

            {state.success && (
                <div className="success-message">
                    Password reset email sent! Please check your inbox and spam folder.
                    Redirecting to login...
                </div>
            )}

            {!state.success && (
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            name="email"
                            value={state.email}
                            onChange={handleChange}
                            required
                            disabled={state.loading}
                        />
                    </div>

                    <button type="submit" disabled={state.loading}>
                        {state.loading ? 'Sending...' : 'Send Reset Email'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default ForgotPassword;
