import React from 'react';
import { Routes, Route } from 'react-router-dom';
import EmailVerification from './components/auth/EmailVerification';
import PasswordReset from './components/auth/PasswordReset';
import ForgotPassword from './components/auth/ForgotPassword';
import Waitlist from './components/Waitlist';

const App = () => {
    return (
        <div className="app">
            <Routes>
                <Route path="/verify-email" element={<EmailVerification />} />
                <Route path="/reset-password" element={<PasswordReset />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/waitlist" element={<Waitlist />} />
                {/* Add other routes here */}
            </Routes>
        </div>
    );
};

export default App;
