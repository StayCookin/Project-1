import React, { useState, useRef, useEffect } from 'react';
import { GoogleSheetsService } from '../utils/GoogleSheetsService';
import { useToast } from './ui/ToastContext';
import AnalyticsService from '../utils/AnalyticsService';
import { GoogleAuth } from '../utils/GoogleAuth';

const BOTSWANA_SCHOOLS = [
    'University of Botswana',
    'Botswana International University of Science and Technology',
    'Botswana Accountancy College',
    'Botho University',
    'Gaborone University College of Law',
    'University of Botswana - Gaborone',
    'University of Botswana - Francistown',
    'University of Botswana - Lobatse',
    'University of Botswana - Maun',
    'University of Botswana - Palapye'
];

const Waitlist = () => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        school: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const buttonRef = useRef(null);
    const [buttonHover, setButtonHover] = useState(false);
    const [buttonActive, setButtonActive] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);

        try {
            // Track page view
            AnalyticsService.trackPageView('/waitlist');

            // Validate form
            if (!formData.name.trim() || !formData.email.trim() || !formData.school) {
                throw new Error('All fields are required');
            }

            // Validate email
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                throw new Error('Please enter a valid email address');
            }

            // Track form submission
            AnalyticsService.trackFormSubmission(formData);

            // Add to waitlist
            await GoogleSheetsService.addStudentToWaitlist(formData);

            // Show success message
            addToast('Successfully added to waitlist! We will contact you soon.');
            setSuccess(true);
            setFormData({ name: '', email: '', school: '' });
        } catch (error) {
            addToast(error.message || 'Failed to add to waitlist. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleButtonHover = () => {
        setButtonHover(true);
    };

    const handleButtonLeave = () => {
        setButtonHover(false);
    };

    const handleButtonDown = () => {
        setButtonActive(true);
    };

    const handleButtonUp = () => {
        setButtonActive(false);
    };

    useEffect(() => {
        // Handle OAuth callback if present
        if (window.location.hash) {
            GoogleAuth.handleAuthResponse();
        }
    }, []);

    return (
        <section className="waitlist-section">
            <div className="container">
                <div className="auth-container">
                    <h2>Join Our Student Waitlist</h2>
                    <p>Be the first to know when we launch our student housing platform. We'll keep you updated about our progress and exclusive offers.</p>

                {success && (
                    <div className="success-message">
                        <h3>Thank you for joining our waitlist!</h3>
                        <p>We'll be in touch soon with updates about our student housing platform.</p>
                    </div>
                )}

                {!success && (
                    <form onSubmit={handleSubmit} className="waitlist-form">
                        <div className="form-group">
                            <label htmlFor="name">Full Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="Enter your email address"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="school">Tertiary School</label>
                            <select
                                id="school"
                                name="school"
                                value={formData.school}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select your school</option>
                                {BOTSWANA_SCHOOLS.map(school => (
                                    <option key={school} value={school}>
                                        {school}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            ref={buttonRef}
                            type="submit"
                            disabled={loading}
                            onMouseEnter={handleButtonHover}
                            onMouseLeave={handleButtonLeave}
                            onMouseDown={handleButtonDown}
                            onMouseUp={handleButtonUp}
                            style={{
                                background: buttonHover 
                                    ? 'linear-gradient(45deg, #3498db, #2980b9)' 
                                    : 'linear-gradient(45deg, #3498db, #2980b9)',
                                boxShadow: buttonActive 
                                    ? '0 4px 8px rgba(52, 152, 219, 0.5)'
                                    : '0 2px 4px rgba(52, 152, 219, 0.3)',
                                transform: buttonActive 
                                    ? 'translateY(2px)'
                                    : 'translateY(0)'
                            }}
                        >
                            <span style={{
                                background: 'linear-gradient(45deg, #fff, #f0f0f0)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                {loading ? 'Adding to waitlist...' : 'Join Waitlist'}
                            </span>
                        </button>
                    </form>
                )}
            </div>
        </section>
    );
};

export default Waitlist;
