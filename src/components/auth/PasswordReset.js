import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { rateLimiters } from '../../utils/RateLimiter';

const PasswordReset = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [state, setState] = useState({
        loading: false,
        error: null,
        success: false,
        password: '',
        confirmPassword: '',
        token: location.search ? new URLSearchParams(location.search).get('token') : null,
        passwordStrength: 0
    });

    useEffect(() => {
        // Check if token is valid
        if (!state.token) {
            navigate('/forgot-password');
        }

        // Initialize rate limiter
        rateLimiters.passwordReset.clear(window.location.hostname);
    }, [state.token, navigate]);

    useEffect(() => {
        // Check if token is valid
        if (!state.token) {
            navigate('/forgot-password');
        }
    }, [state.token, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            // Rate limiting
            await rateLimiters.passwordReset.check(window.location.hostname);

            // Password validation
            if (state.password !== state.confirmPassword) {
                throw new Error('Passwords do not match');
            }

            if (state.passwordStrength < 3) {
                throw new Error('Password is not strong enough. Must include uppercase, lowercase, numbers, and special characters.');
            }

            // Check password strength
            const passwordStrength = this.getPasswordStrength(state.password);
            if (passwordStrength < 3) {
                throw new Error('Password is not strong enough. Must include uppercase, lowercase, numbers, and special characters.');
            }

            // Token validation
            if (!state.token) {
                throw new Error('Invalid reset token');
            }

            // Input sanitization
            const sanitizedPassword = this.sanitizeInput(state.password);

            const response = await axios.put(`/api/auth/reset-password/${state.token}`, {
                password: sanitizedPassword
            });

            setState({
                loading: false,
                success: true,
                error: null,
                password: '',
                confirmPassword: ''
            });

            // Redirect after success with delay
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error.response?.data?.msg || 'Failed to reset password'
            }));
        }
    };

    const handleChange = (e) => {
        const value = e.target.value;
        setState(prev => ({
            ...prev,
            [e.target.name]: value,
            passwordStrength: this.getPasswordStrength(value)
        }));
    };

    getPasswordStrength = (password) => {
        let strength = 0;
        
        // Check length
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        
        // Check for uppercase
        if (/[A-Z]/.test(password)) strength++;
        
        // Check for lowercase
        if (/[a-z]/.test(password)) strength++;
        
        // Check for numbers
        if (/[0-9]/.test(password)) strength++;
        
        // Check for special characters
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        return strength;
    };

    sanitizeInput = (input) => {
        // Remove potentially dangerous characters
        return input
            .replace(/[<>]/g, '')
            .replace(/script/gi, '');
    };

    return (
        <div className="auth-container">
            <h2>Reset Password</h2>
            
            {state.error && (
                <div className="error-message">
                    {state.error}
                </div>
            )}

            {state.success && (
                <div className="success-message">
                    Password reset successful! Redirecting to login...
                </div>
            )}

            {!state.success && (
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            name="password"
                            value={state.password}
                            onChange={handleChange}
                            required
                            disabled={state.loading}
                            minLength={8}
                        />
                    </div>

                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={state.confirmPassword}
                            onChange={handleChange}
                            required
                            disabled={state.loading}
                            minLength={8}
                        />
                    </div>

                    <button type="submit" disabled={state.loading}>
                        {state.loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default PasswordReset;
