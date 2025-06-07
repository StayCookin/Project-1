const winston = require('winston');
const Sentry = require('@sentry/node');
const { MongoClient } = require('mongodb');
const schedule = require('node-schedule');

class MonitoringService {
    constructor() {
        this.setupSentry();
        this.setupWinston();
        this.setupMetrics();
    }

    setupSentry() {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.NODE_ENV,
            tracesSampleRate: 1.0,
            integrations: [
                new Sentry.Integrations.Http({ tracing: true }),
                new Sentry.Integrations.Express()
            ]
        });
    }

    setupWinston() {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ 
                    filename: 'logs/error.log', 
                    level: 'error',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5
                }),
                new winston.transports.File({ 
                    filename: 'logs/payments.log',
                    level: 'info'
                })
            ]
        });

        if (process.env.NODE_ENV !== 'production') {
            this.logger.add(new winston.transports.Console({
                format: winston.format.simple()
            }));
        }
    }

    setupMetrics() {
        this.metrics = {
            paymentAttempts: 0,
            successfulPayments: 0,
            failedPayments: 0,
            totalAmount: 0,
            averageAmount: 0
        };
    }

    logPaymentAttempt(paymentData) {
        this.metrics.paymentAttempts++;
        this.logger.info('Payment attempt', {
            paymentId: paymentData.id,
            amount: paymentData.amount,
            userId: paymentData.userId
        });
    }

    logPaymentSuccess(paymentData) {
        this.metrics.successfulPayments++;
        this.metrics.totalAmount += paymentData.amount;
        this.metrics.averageAmount = this.metrics.totalAmount / this.metrics.successfulPayments;

        this.logger.info('Payment successful', {
            paymentId: paymentData.id,
            transactionId: paymentData.transactionId,
            amount: paymentData.amount
        });
    }

    logPaymentError(error, paymentData) {
        this.metrics.failedPayments++;
        
        this.logger.error('Payment failed', {
            error: error.message,
            paymentId: paymentData?.id,
            userId: paymentData?.userId,
            stack: error.stack
        });

        Sentry.captureException(error, {
            extra: {
                paymentData
            }
        });
    }

    async logAuditTrail(action, userId, data) {
        try {
            const client = await MongoClient.connect(process.env.MONGODB_URI);
            const db = client.db();
            
            await db.collection('audit_logs').insertOne({
                action,
                userId,
                data,
                timestamp: new Date(),
                ip: data.ip,
                userAgent: data.userAgent
            });
        } catch (error) {
            this.logger.error('Audit log failed', { error });
        }
    }

    startPerformanceMonitoring() {
        // Monitor system metrics every minute
        schedule.scheduleJob('* * * * *', () => {
            const metrics = {
                timestamp: new Date(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                uptime: process.uptime(),
                paymentMetrics: this.metrics
            };

            this.logger.info('System metrics', metrics);
        });
    }

    // Alert on suspicious activity
    async checkForSuspiciousActivity() {
        const threshold = 10; // Number of failed attempts
        const timeWindow = 15 * 60 * 1000; // 15 minutes

        try {
            const client = await MongoClient.connect(process.env.MONGODB_URI);
            const db = client.db();
            
            const failedAttempts = await db.collection('payments')
                .find({
                    status: 'failed',
                    createdAt: { 
                        $gte: new Date(Date.now() - timeWindow)
                    }
                })
                .count();

            if (failedAttempts >= threshold) {
                this.logger.warn('Suspicious activity detected', {
                    failedAttempts,
                    timeWindow: '15 minutes'
                });

                // Send alert
                // await notificationService.sendAlertEmail(...);
            }
        } catch (error) {
            this.logger.error('Suspicious activity check failed', { error });
        }
    }
}

module.exports = new MonitoringService(); 