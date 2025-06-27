import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import EmailVerification from './components/auth/EmailVerification';
import PasswordReset from './components/auth/PasswordReset';
import ForgotPassword from './components/auth/ForgotPassword';
import Waitlist from './components/Waitlist';

const App = () => {
    return (
        <div className="app">
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/verify-email" element={<EmailVerification />} />
                <Route path="/reset-password" element={<PasswordReset />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/waitlist" element={<Waitlist />} />
            </Routes>
        </div>
    );
};

export default App;
