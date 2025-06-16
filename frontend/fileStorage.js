const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// File type validation
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG and PDF files are allowed.'), false);
    }
};

// Configure multer for S3 upload
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        acl: 'public-read',
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            const fileName = `${Date.now()}_${path.basename(file.originalname)}`;
            cb(null, fileName);
        }
    }),
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// File cleanup function
const deleteFile = async (fileUrl) => {
    try {
        const key = fileUrl.split('/').pop();
        await s3.deleteObject({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key
        }).promise();
        return true;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};

// Image optimization
const optimizeImage = async (buffer) => {
    const sharp = require('sharp');
    return sharp(buffer)
        .resize(1200, 1200, {
            fit: 'inside',
            withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toBuffer();
};

module.exports = {
    upload,
    deleteFile,
    optimizeImage
}; 