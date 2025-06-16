const axios = require('axios');
const crypto = require('crypto');

class PaymentGateway {
    constructor() {
        this.paygateId = process.env.PAYGATE_ID;
        this.paygateSecret = process.env.PAYGATE_SECRET;
        this.gatewayUrl = process.env.PAYMENT_GATEWAY_URL;
    }

    generateReference() {
        return `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }

    generateChecksum(data) {
        const values = Object.values(data).join('');
        return crypto
            .createHash('md5')
            .update(values + this.paygateSecret)
            .digest('hex');
    }

    async initiatePayment(amount, description, customerEmail, returnUrl) {
        try {
            const reference = this.generateReference();
            const data = {
                PAYGATE_ID: this.paygateId,
                REFERENCE: reference,
                AMOUNT: Math.round(amount * 100), // Convert to cents
                CURRENCY: process.env.CURRENCY_CODE,
                RETURN_URL: returnUrl,
                TRANSACTION_DATE: new Date().toISOString(),
                EMAIL: customerEmail,
                NOTIFY_URL: `${process.env.API_URL}/api/payments/webhook`,
                USER3: description
            };

            data.CHECKSUM = this.generateChecksum(data);

            const response = await axios.post(this.gatewayUrl, data);

            if (response.data.ERROR) {
                throw new Error(response.data.ERROR);
            }

            return {
                success: true,
                paymentUrl: response.data.PAY_REQUEST_URL,
                reference: reference
            };
        } catch (error) {
            console.error('PayGate initiation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async processRefund(transactionId, amount, reason) {
        try {
            const data = {
                PAYGATE_ID: this.paygateId,
                TRANSACTION_ID: transactionId,
                AMOUNT: Math.round(amount * 100),
                REASON: reason
            };

            data.CHECKSUM = this.generateChecksum(data);

            const response = await axios.post(
                `${this.gatewayUrl}/api/v1/refund`,
                data
            );

            return {
                success: true,
                refundId: response.data.REFUND_ID
            };
        } catch (error) {
            console.error('PayGate refund error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    verifyChecksum(data, providedChecksum) {
        const calculatedChecksum = this.generateChecksum(data);
        return calculatedChecksum === providedChecksum;
    }
}

module.exports = new PaymentGateway(); 