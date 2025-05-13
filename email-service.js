// EmailJS configuration
const EMAILJS_CONFIG = {
    serviceID: 'service_joj5e08',
    templateID: 'template_jqs8hda',
    userID: '9Qa5C6aURxlLtfsb-'
};

// Email templates
const EMAIL_TEMPLATES = {
    verification: {
        subject: 'Verify your InRent account',
        template: `
            <h2>Welcome to InRent!</h2>
            <p>Thank you for signing up. Please use the following code to verify your email address:</p>
            <h1 style="font-size: 32px; color: #228B22; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px;">{{code}}</h1>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
            <p>Best regards,<br>The InRent Team</p>
        `
    },
    viewingConfirmation: {
        subject: 'Viewing Request Confirmation',
        template: `
            <h2>Viewing Request Confirmed</h2>
            <p>Your viewing request for {{propertyTitle}} has been confirmed.</p>
            <p><strong>Date:</strong> {{date}}</p>
            <p><strong>Time:</strong> {{time}}</p>
            <p><strong>Location:</strong> {{location}}</p>
            <p>Please arrive 5 minutes before your scheduled time.</p>
            <p>If you need to reschedule, please contact us at least 24 hours in advance.</p>
            <p>Best regards,<br>The InRent Team</p>
        `
    },
    messageNotification: {
        subject: 'New Message from InRent',
        template: `
            <h2>New Message</h2>
            <p>You have received a new message from {{senderName}} regarding {{propertyTitle}}.</p>
            <p><strong>Message:</strong></p>
            <p style="padding: 15px; background: #f5f5f5; border-radius: 8px;">{{message}}</p>
            <p>Please log in to your account to respond.</p>
            <p>Best regards,<br>The InRent Team</p>
        `
    }
};

// Email service functions
const EmailService = {
    async init() {
        try {
            // Check if EmailJS is already loaded
            if (typeof emailjs === 'undefined') {
                // Load EmailJS SDK
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
                    script.onload = resolve;
                    script.onerror = () => reject(new Error('Failed to load EmailJS SDK'));
                    document.head.appendChild(script);
                });
            }

            // Initialize EmailJS
            await emailjs.init(EMAILJS_CONFIG.userID);
            console.log('EmailJS initialized successfully with config:', EMAILJS_CONFIG);
            return true;
        } catch (error) {
            console.error('Error initializing EmailJS:', error);
            throw new Error('Failed to initialize EmailJS: ' + error.message);
        }
    },

    async sendVerificationEmail(email, code) {
        try {
            if (typeof emailjs === 'undefined') {
                throw new Error('EmailJS not loaded');
            }

            const templateParams = {
                to_email: email,
                code: code,
                subject: EMAIL_TEMPLATES.verification.subject
            };

            console.log('Sending email with params:', JSON.stringify(templateParams));

            const response = await emailjs.send(
                EMAILJS_CONFIG.serviceID,
                EMAILJS_CONFIG.templateID,
                templateParams
            );

            console.log('EmailJS response:', JSON.stringify(response));
            return true;
        } catch (error) {
            console.error('Detailed error:', JSON.stringify(error));
            throw new Error('Failed to send verification email: ' + (error.message || JSON.stringify(error) || 'Unknown error'));
        }
    },

    async sendViewingConfirmation(email, viewingDetails) {
        try {
            const templateParams = {
                to_email: email,
                propertyTitle: viewingDetails.propertyTitle,
                date: viewingDetails.date,
                time: viewingDetails.time,
                location: viewingDetails.location,
                subject: EMAIL_TEMPLATES.viewingConfirmation.subject
            };

            await emailjs.send(
                EMAILJS_CONFIG.serviceID,
                EMAILJS_CONFIG.templateID,
                templateParams
            );

            console.log('Viewing confirmation email sent successfully');
            return true;
        } catch (error) {
            console.error('Error sending viewing confirmation:', error);
            return false;
        }
    },

    async sendMessageNotification(email, messageDetails) {
        try {
            const templateParams = {
                to_email: email,
                senderName: messageDetails.senderName,
                propertyTitle: messageDetails.propertyTitle,
                message: messageDetails.message,
                subject: EMAIL_TEMPLATES.messageNotification.subject
            };

            await emailjs.send(
                EMAILJS_CONFIG.serviceID,
                EMAILJS_CONFIG.templateID,
                templateParams
            );

            console.log('Message notification email sent successfully');
            return true;
        } catch (error) {
            console.error('Error sending message notification:', error);
            return false;
        }
    }
};

// Export the email service
export default EmailService; 