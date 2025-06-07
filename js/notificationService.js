const nodemailer = require('nodemailer');
const schedule = require('node-schedule');
const Payment = require('../models/Payment');
const Property = require('../models/Property');
const sanitizeHtml = require('sanitize-html');

class NotificationService {
    constructor() {
        // Validate required environment variables
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            throw new Error('Missing required SMTP configuration');
        }

        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            tls: {
                rejectUnauthorized: true, // Reject unauthorized TLS/SSL certs
                minVersion: 'TLSv1.2' // Enforce minimum TLS version
            }
        });

        // Verify SMTP connection
        this.transporter.verify((error) => {
            if (error) {
                console.error('SMTP connection error:', error);
                throw error;
            }
        });
    }

    sanitizeContent(content) {
        return sanitizeHtml(content, {
            allowedTags: ['h2', 'p', 'br', 'ul', 'li'],
            allowedAttributes: {}
        });
    }

    async sendEmail(to, subject, html) {
        try {
            // Validate email address
            if (!this.isValidEmail(to)) {
                throw new Error('Invalid recipient email address');
            }

            // Sanitize content
            const sanitizedHtml = this.sanitizeContent(html);

            await this.transporter.sendMail({
                from: `"InRent" <${process.env.SMTP_USER}>`,
                to,
                subject: this.sanitizeContent(subject),
                html: sanitizedHtml,
                headers: {
                    'X-Priority': '3', // Normal priority
                    'X-Mailer': 'InRent Notification Service'
                }
            });
            return true;
        } catch (error) {
            console.error('Email sending error:', error);
            return false;
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async sendPaymentReminder(payment, property, tenant) {
        const subject = 'Rent Payment Reminder';
        const html = `
            <h2>Rent Payment Reminder</h2>
            <p>Dear ${tenant.name},</p>
            <p>This is a reminder that your rent payment of ${process.env.CURRENCY_SYMBOL}${payment.amount} for ${property.title} is due in 3 days.</p>
            <p>Please ensure timely payment to avoid any late fees.</p>
            <p>You can make your payment through our secure payment portal.</p>
            <p>Best regards,<br>InRent Team</p>
        `;
        return this.sendEmail(tenant.email, subject, html);
    }

    async sendPaymentConfirmation(payment) {
        const property = await Property.findById(payment.property);
        const subject = 'Payment Confirmation';
        const html = `
            <h2>Payment Confirmation</h2>
            <p>Thank you for your payment!</p>
            <p>Details:</p>
            <ul>
                <li>Property: ${property.title}</li>
                <li>Amount: ${process.env.CURRENCY_SYMBOL}${payment.amount}</li>
                <li>Transaction ID: ${payment.transactionId}</li>
                <li>Date: ${payment.paymentDate}</li>
            </ul>
            <p>Best regards,<br>InRent Team</p>
        `;
        return this.sendEmail(payment.tenant.email, subject, html);
    }

    async sendLandlordPaymentNotification(payment) {
        const property = await Property.findById(payment.property);
        const subject = 'Rent Payment Received';
        const html = `
            <h2>Rent Payment Received</h2>
            <p>A rent payment has been processed for your property.</p>
            <p>Details:</p>
            <ul>
                <li>Property: ${property.title}</li>
                <li>Total Amount: ${process.env.CURRENCY_SYMBOL}${payment.amount}</li>
                <li>Commission (${payment.commissionPercentage}%): ${process.env.CURRENCY_SYMBOL}${payment.commission}</li>
                <li>Net Amount: ${process.env.CURRENCY_SYMBOL}${payment.landlordAmount}</li>
                <li>Transaction ID: ${payment.transactionId}</li>
                <li>Date: ${payment.paymentDate}</li>
            </ul>
            <p>The net amount will be transferred to your bank account within 2 business days.</p>
            <p>Best regards,<br>InRent Team</p>
        `;
        return this.sendEmail(payment.landlord.email, subject, html);
    }

    async sendLatePaymentAlert(payment, property, tenant) {
        const subject = 'Late Payment Notice';
        const html = `
            <h2>Late Payment Notice</h2>
            <p>Dear ${tenant.name},</p>
            <p>Your rent payment of ${process.env.CURRENCY_SYMBOL}${payment.amount} for ${property.title} is overdue.</p>
            <p>Please make the payment as soon as possible to avoid any additional penalties.</p>
            <p>If you have already made the payment, please disregard this notice.</p>
            <p>Best regards,<br>InRent Team</p>
        `;
        return this.sendEmail(tenant.email, subject, html);
    }

    scheduleReminders() {
        // Add error handling and retry logic for scheduled jobs
        const handleScheduleError = (error, jobName) => {
            console.error(`Error in scheduled job ${jobName}:`, error);
            // Implement retry logic or alerting system
        };

        // Send payment reminders daily at 9:00 AM
        schedule.scheduleJob('0 9 * * *', async () => {
            try {
                const threeDaysFromNow = new Date();
                threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

                const payments = await Payment.find({
                    dueDate: {
                        $gte: new Date(),
                        $lte: threeDaysFromNow
                    },
                    status: 'pending'
                }).populate('property tenant');

                for (const payment of payments) {
                    await this.sendPaymentReminder(
                        payment,
                        payment.property,
                        payment.tenant
                    );
                }
            } catch (error) {
                handleScheduleError(error, 'payment reminders');
            }
        });

        // Check for late payments daily at 10:00 AM
        schedule.scheduleJob('0 10 * * *', async () => {
            try {
                const payments = await Payment.find({
                    dueDate: { $lt: new Date() },
                    status: 'pending'
                }).populate('property tenant');

                for (const payment of payments) {
                    await this.sendLatePaymentAlert(
                        payment,
                        payment.property,
                        payment.tenant
                    );
                }
            } catch (error) {
                handleScheduleError(error, 'late payment alerts');
            }
        });
    }
}

module.exports = new NotificationService(); 