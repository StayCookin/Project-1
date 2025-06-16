describe('Email Service', () => {
    beforeEach(() => {
        // Reset mocks
        EmailJS.init.mockClear();
        EmailJS.send.mockClear();
    });

    describe('Initialization', () => {
        test('should initialize EmailJS with correct configuration', () => {
            require('../email-service.js');
            expect(EmailJS.init).toHaveBeenCalledWith('YOUR_PUBLIC_KEY');
        });
    });

    describe('Email Sending', () => {
        test('should send verification email successfully', async () => {
            const mockEmail = 'test@example.com';
            const mockCode = '123456';
            
            EmailJS.send.mockResolvedValueOnce({ status: 200 });
            
            const result = await window.EmailService.sendVerificationEmail(mockEmail, mockCode);
            
            expect(EmailJS.send).toHaveBeenCalledWith(
                'service_123',
                'template_verification',
                expect.objectContaining({
                    to_email: mockEmail,
                    verification_code: mockCode
                })
            );
            expect(result).toBe(true);
        });

        test('should send viewing confirmation email successfully', async () => {
            const mockData = {
                studentName: 'Test Student',
                studentEmail: 'test@example.com',
                propertyTitle: 'Test Property',
                viewingDate: '2024-03-20',
                viewingTime: '14:00'
            };
            
            EmailJS.send.mockResolvedValueOnce({ status: 200 });
            
            const result = await window.EmailService.sendViewingConfirmation(mockData);
            
            expect(EmailJS.send).toHaveBeenCalledWith(
                'service_123',
                'template_viewing',
                expect.objectContaining(mockData)
            );
            expect(result).toBe(true);
        });

        test('should send message notification email successfully', async () => {
            const mockData = {
                recipientName: 'Test Recipient',
                recipientEmail: 'test@example.com',
                senderName: 'Test Sender',
                message: 'Test message'
            };
            
            EmailJS.send.mockResolvedValueOnce({ status: 200 });
            
            const result = await window.EmailService.sendMessageNotification(mockData);
            
            expect(EmailJS.send).toHaveBeenCalledWith(
                'service_123',
                'template_message',
                expect.objectContaining(mockData)
            );
            expect(result).toBe(true);
        });

        test('should handle email sending failure', async () => {
            EmailJS.send.mockRejectedValueOnce(new Error('Failed to send email'));
            
            const result = await window.EmailService.sendVerificationEmail('test@example.com', '123456');
            
            expect(result).toBe(false);
        });
    });
}); 