import React, { useState } from 'react';
import AuthService from '../services/auth-service';

const EmailVerification = () => {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [message, setMessage] = useState('');
    const [showVerification, setShowVerification] = useState(false);

    const handleSendVerification = async (e) => {
        e.preventDefault();
        try {
            await AuthService.sendVerificationEmail(email);
            setMessage('Verification code sent! Please check your email.');
            setShowVerification(true);
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        try {
            await AuthService.verifyCode(email, code);
            setMessage('Email verified successfully!');
            // In a real app, you would redirect to the next step here
        } catch (error) {
            setMessage('Error: ' + error.message);
        }
    };

    return (
        <div className="email-verification-container">
            <h2>Email Verification</h2>
            
            {!showVerification ? (
                <form onSubmit={handleSendVerification}>
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit">Send Verification Code</button>
                </form>
            ) : (
                <form onSubmit={handleVerifyCode}>
                    <div className="form-group">
                        <label htmlFor="code">Verification Code</label>
                        <input
                            type="text"
                            id="code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit">Verify Code</button>
                </form>
            )}
            
            {message && <div className="message">{message}</div>}
        </div>
    );
};

export default EmailVerification;
