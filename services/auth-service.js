import EmailService from '../email-service.js';

const AuthService = {
    async generateVerificationCode() {
        // Generate a 6-digit verification code
        return Math.floor(100000 + Math.random() * 900000).toString();
    },

    async sendVerificationEmail(email) {
        try {
            // Generate verification code
            const code = await this.generateVerificationCode();
            
            // Send verification email
            await EmailService.sendVerificationEmail(email, code);
            
            // Store verification code in session or database
            // This would typically be stored in a database with an expiration time
            // For now, we'll just return it (in production, you'd want to store it securely)
            return code;
        } catch (error) {
            throw new Error('Failed to send verification email: ' + error.message);
        }
    },

    async verifyCode(email, code) {
        try {
            // In a real application, you would:
            // 1. Look up the stored verification code for this email
            // 2. Check if it's still valid (not expired)
            // 3. Compare it with the provided code
            
            // For demonstration, we'll just check if the code is valid format
            if (!/^[0-9]{6}$/.test(code)) {
                throw new Error('Invalid verification code format');
            }
            
            // In production, you would:
            // - Mark the email as verified in the database
            // - Return a JWT token or session cookie
            
            return true;
        } catch (error) {
            throw new Error('Verification failed: ' + error.message);
        }
    }
};

export default AuthService;
