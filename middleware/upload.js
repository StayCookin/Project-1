<<<<<<< HEAD
const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        let uploadPath = process.env.FILE_UPLOAD_PATH;
        
        // Determine subfolder based on file type
        if (file.fieldname === 'photos') {
            uploadPath = path.join(uploadPath, 'properties');
        } else if (file.fieldname === 'documents') {
            uploadPath = path.join(uploadPath, 'documents');
        }
        
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        // Generate unique filename: timestamp-originalname
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Allow images and PDFs
    if (file.fieldname === 'photos') {
        if (!file.mimetype.startsWith('image')) {
            return cb(new Error('Please upload an image file'), false);
        }
    } else if (file.fieldname === 'documents') {
        if (!file.mimetype.startsWith('image') && file.mimetype !== 'application/pdf') {
            return cb(new Error('Please upload an image or PDF file'), false);
        }
    }
    
    cb(null, true);
};

// Initialize multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: process.env.MAX_FILE_SIZE
    }
});

=======
const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        let uploadPath = process.env.FILE_UPLOAD_PATH;
        
        // Determine subfolder based on file type
        if (file.fieldname === 'photos') {
            uploadPath = path.join(uploadPath, 'properties');
        } else if (file.fieldname === 'documents') {
            uploadPath = path.join(uploadPath, 'documents');
        }
        
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        // Generate unique filename: timestamp-originalname
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Allow images and PDFs
    if (file.fieldname === 'photos') {
        if (!file.mimetype.startsWith('image')) {
            return cb(new Error('Please upload an image file'), false);
        }
    } else if (file.fieldname === 'documents') {
        if (!file.mimetype.startsWith('image') && file.mimetype !== 'application/pdf') {
            return cb(new Error('Please upload an image or PDF file'), false);
        }
    }
    
    cb(null, true);
};

// Initialize multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: process.env.MAX_FILE_SIZE
    }
});

>>>>>>> c24ff08aad83fc64379c0b79e46151d3783b8082
module.exports = upload; 