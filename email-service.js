// EmailJS configuration
const EMAILJS_CONFIG = {
    service_joj5e08: 'YOUR_SERVICE_ID', // Your EmailJS service ID
    template_jqs8hda: 'YOUR_TEMPLATE_ID', // Your EmailJS template ID
    userID: 'YOUR_USER_ID' // Your EmailJS user ID
};

// Initialize EmailJS
let emailjs;

const EmailService = {
    async init() {
        try {
            // Check if EmailJS is already loaded
            if (typeof window !== 'undefined' && window.emailjs) {
                emailjs = window.emailjs;
                return true;
            }

            // Load EmailJS SDK
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
                script.onload = () => {
                    emailjs = window.emailjs;
                    resolve();
                };
                script.onerror = () => reject(new Error('Failed to load EmailJS SDK'));
                document.head.appendChild(script);
            });

            // Initialize EmailJS
            await emailjs.init(EMAILJS_CONFIG.userID);
            console.log('EmailJS initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing EmailJS:', error);
            throw new Error('Failed to initialize EmailJS: ' + error.message);
        }
    },

    // Helper function to load and replace template
    async loadTemplate(templatePath, replacements) {
        try {
            const templateHtml = await fetch(templatePath)
                .then(response => response.text());

            let result = templateHtml;
            for (const [key, value] of Object.entries(replacements)) {
                result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
            }
            return result;
        } catch (error) {
            console.error('Error loading template:', error);
            throw new Error('Failed to load email template');
        }
    }

    // Email templates
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
            <h2>Viewing Request Confirmation</h2>
            <p>Dear {{property_title}},</p>
            <p>We are pleased to confirm your viewing request for {{viewing_date}} at {{viewing_time}}.</p>
            <p>The viewing will take place at {{location}}.</p>
            <p>Please let us know if you have any questions or concerns.</p>
            <p>Best regards,<br>The InRent Team</p>
        `
    },
    messageNotification: {
        subject: 'Message Notification',
        template: `
            <h2>Message Notification</h2>
            <p>Dear {{sender_name}},</p>
            <p>You have received a message from {{property_title}}.</p>
            <p>The message is as follows:</p>
            <p>{{message_content}}</p>
            <p>Please respond to this message if necessary.</p>
            <p>Best regards,<br>The InRent Team</p>
        `
    },

    async sendVerificationEmail(email, code) {
        try {
            await this.init();

            // Load and replace template variables
            const template = await this.loadTemplate('/templates/verification-email.html', {
                code: code,
                verification_url: `${window.location.origin}/verify?code=${code}&email=${encodeURIComponent(email)}`
            });

            const templateParams = {
                to_email: email,
                message: template,
                subject: 'Verify your InRent account'
            };

            console.log('Sending verification email to:', email);
            
            const response = await emailjs.send(
                EMAILJS_CONFIG.service_joj5e08,
                'template_jqs8hda',
                templateParams
            );

            console.log('Email sent successfully:', response);
            return true;
        } catch (error) {
            console.error('Error sending verification email:', error);
            throw new Error('Failed to send verification email: ' + error.message);
        }
    },

    async sendViewingConfirmation(email, viewingDetails) {
        try {
            if (!emailjs) {
                throw new Error('EmailJS not initialized');
            }

            const templateParams = {
                to_email: email,
                property_title: viewingDetails.propertyTitle,
                viewing_date: viewingDetails.date,
                viewing_time: viewingDetails.time,
                location: viewingDetails.location
            };

            const response = await emailjs.send(
                EMAILJS_CONFIG.serviceID,
                EMAILJS_CONFIG.templateID,
                templateParams
            );

            return true;
        } catch (error) {
            console.error('Error sending viewing confirmation:', error);
            throw new Error('Failed to send viewing confirmation: ' + error.message);
        }
    },

    async sendMessageNotification(email, messageDetails) {
        try {
            if (!emailjs) {
                throw new Error('EmailJS not initialized');
            }

            const templateParams = {
                to_email: email,
                sender_name: messageDetails.senderName,
                property_title: messageDetails.propertyTitle,
                message_content: messageDetails.messageContent
            };

            const response = await emailjs.send(
                EMAILJS_CONFIG.serviceID,
                EMAILJS_CONFIG.templateID,
                templateParams
            );

            console.log('Message notification email sent successfully');
            return true;
        } catch (error) {
            console.error('Error sending message notification:', error);
            throw new Error('Failed to send message notification: ' + error.message);
        }
    },

    async sendPasswordResetEmail(email, resetToken, name) {
        try {
            await this.init();

            // Load and replace template variables
            const template = await this.loadTemplate('/templates/password-reset-email.html', {
                name: name || 'user',
                reset_url: `${window.location.origin}/reset-password?token=${resetToken}`
            });

            const templateParams = {
                to_email: email,
                message: template,
                subject: 'Password Reset Request'
            };

            console.log('Sending password reset email to:', email);
            
            const response = await emailjs.send(
                EMAILJS_CONFIG.service_joj5e08,
                'template_j1a3itt',
                templateParams
            );

            console.log('Password reset email sent successfully:', response);
            return true;
        } catch (error) {
            console.error('Error sending password reset email:', error);
            throw new Error('Failed to send password reset email: ' + error.message);
        }
    }
};

// Export the email service
export default EmailService;