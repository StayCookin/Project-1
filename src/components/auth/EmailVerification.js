import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { rateLimiters } from '../../utils/RateLimiter';
import { useToast } from '../ui/ToastContext';

const EmailVerification = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const [state, setState] = useState({
        loading: false,
        error: null,
        success: false,
        code: '',
        email: '',
        token: location.search ? new URLSearchParams(location.search).get('token') : null
    });

    useEffect(() => {
        // Check if token is valid
        if (!state.token) {
            navigate('/register');
        }

        // Get email from query params
        const urlParams = new URLSearchParams(location.search);
        const email = urlParams.get('email');
        if (email) {
            setState(prev => ({ ...prev, email }));
        }
    }, [state.token, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            // Rate limiting
            await rateLimiters.emailVerification.check(window.location.hostname);

            // Token validation
            if (!state.token) {
                throw new Error('Invalid verification token');
            }

            // Email validation
            if (!state.email) {
                throw new Error('Email is required');
            }

            // Input sanitization
            const sanitizedEmail = this.sanitizeInput(state.email);
            const sanitizedCode = this.sanitizeInput(state.code);

            const response = await axios.post(`/api/auth/verify-email/${state.token}`, {
                email: sanitizedEmail
            });

            // Show success toast
            addToast('Email verified successfully! Redirecting to login...');

            setState({
                loading: false,
                success: true,
                error: null,
                code: ''
            });

            // Redirect after success with delay
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error.response?.data?.msg || 'Failed to verify email'
            }));
        }
    };

    const handleChange = (e) => {
        setState(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const resendVerification = async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            // Rate limiting for resend
            await rateLimiters.emailVerification.check(window.location.hostname);

            // Email validation
            if (!state.email) {
                throw new Error('Email is required');
            }

            // Input sanitization
            const sanitizedEmail = this.sanitizeInput(state.email);

            await axios.post('/api/auth/resend-verification', {
                email: sanitizedEmail
            });

            setState(prev => ({
                ...prev,
                loading: false,
                error: null
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error.response?.data?.msg || 'Failed to resend verification email'
            }));
        }
    };

    sanitizeInput = (input) => {
        // Remove potentially dangerous characters
        return input
            .replace(/[<>]/g, '')
            .replace(/script/gi, '')
            .replace(/[^A-Za-z0-9@._-]/g, '');
    };

    return (
        <div className="auth-container">
            <h2>Email Verification</h2>
            
            {!state.success && !state.code && (
                <div className="email-check-message">
                    Please check your email for the verification code. It may be in your spam folder.
                </div>
            )}
            
            {/* Toast container will be rendered by ToastProvider */}
            
            {state.error && (
                <div className="error-message">
                    {state.error}
                </div>
            )}

            {state.success && (
                <div className="success-message">
                    Email verified successfully! Redirecting to login...
                </div>
            )}

            {!state.success && (
                <div className="verification-form">
                    <p>Please enter the verification code sent to your email:</p>
                    
                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label>Verification Code</label>
                            <input
                                type="text"
                                name="code"
                                value={state.code}
                                onChange={handleChange}
                                required
                                disabled={state.loading}
                                maxLength={6}
                            />
                        </div>

                        <button type="submit" disabled={state.loading}>
                            {state.loading ? 'Verifying...' : 'Verify Email'}
                        </button>
                    </form>

                    <button
                        onClick={resendVerification}
                        disabled={state.loading}
                        className="secondary-button"
                    >
                        Resend Verification Code
                    </button>
                </div>
            )}
        </div>
    );
};

export default EmailVerification;
