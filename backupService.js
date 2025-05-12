const { MongoClient } = require('mongodb');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');

class BackupService {
    constructor() {
        this.s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        });
        
        this.backupPath = path.join(__dirname, '../backups');
        if (!fs.existsSync(this.backupPath)) {
            fs.mkdirSync(this.backupPath);
        }
    }

    async createDatabaseBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `db-backup-${timestamp}.gz`;
        const filepath = path.join(this.backupPath, filename);

        try {
            // Create MongoDB dump
            const client = await MongoClient.connect(process.env.MONGODB_URI);
            const db = client.db();
            
            const collections = await db.collections();
            const backupData = {};

            for (const collection of collections) {
                const documents = await collection.find({}).toArray();
                backupData[collection.collectionName] = documents;
            }

            // Write to file
            fs.writeFileSync(filepath, JSON.stringify(backupData));

            // Upload to S3
            await this.uploadToS3(filepath, `database-backups/${filename}`);

            // Cleanup local file
            fs.unlinkSync(filepath);

            console.log(`Database backup completed: ${filename}`);
            return true;
        } catch (error) {
            console.error('Database backup failed:', error);
            return false;
        }
    }

    async backupTransactionLogs() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `transaction-logs-${timestamp}.json`;
        const filepath = path.join(this.backupPath, filename);

        try {
            const client = await MongoClient.connect(process.env.MONGODB_URI);
            const db = client.db();
            
            // Get all payment transactions
            const transactions = await db.collection('payments')
                .find({})
                .sort({ createdAt: -1 })
                .toArray();

            // Write to file
            fs.writeFileSync(filepath, JSON.stringify(transactions));

            // Upload to S3
            await this.uploadToS3(filepath, `transaction-logs/${filename}`);

            // Cleanup local file
            fs.unlinkSync(filepath);

            console.log(`Transaction logs backup completed: ${filename}`);
            return true;
        } catch (error) {
            console.error('Transaction logs backup failed:', error);
            return false;
        }
    }

    async uploadToS3(filepath, key) {
        const fileContent = fs.readFileSync(filepath);
        
        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
            Body: fileContent,
            ServerSideEncryption: 'AES256'
        };

        await this.s3.upload(params).promise();
    }

    async restoreFromBackup(backupKey) {
        try {
            // Download from S3
            const response = await this.s3.getObject({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: backupKey
            }).promise();

            const backupData = JSON.parse(response.Body.toString());
            const client = await MongoClient.connect(process.env.MONGODB_URI);
            const db = client.db();

            // Restore each collection
            for (const [collectionName, documents] of Object.entries(backupData)) {
                await db.collection(collectionName).insertMany(documents);
            }

            console.log('Backup restored successfully');
            return true;
        } catch (error) {
            console.error('Backup restoration failed:', error);
            return false;
        }
    }

    scheduleBackups() {
        // Database backup every day at 2 AM
        schedule.scheduleJob('0 2 * * *', async () => {
            await this.createDatabaseBackup();
        });

        // Transaction logs backup every 6 hours
        schedule.scheduleJob('0 */6 * * *', async () => {
            await this.backupTransactionLogs();
        });
    }
}

module.exports = new BackupService(); 