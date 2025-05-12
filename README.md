<<<<<<< HEAD
# InRent - Student Accommodation Platform

## Overview
InRent is a comprehensive platform connecting tertiary students with landlords for student accommodation. The platform facilitates property listings, reviews, and direct communication between students and landlords.

## Features
- User authentication (students and landlords)
- Property listings with photo uploads
- Review and rating system
- Real-time chat between students and landlords
- Landlord dashboard with analytics
- Document verification system

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: MongoDB
- Cache: Redis
- Storage: AWS S3
- Real-time: Socket.io

## Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Redis
- AWS Account
- npm or yarn

## Environment Variables
Create a `.env` file in the root directory with the following variables:
```
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_bucket_name
REDIS_URL=your_redis_url
```

## Installation
1. Clone the repository
```bash
git clone https://github.com/yourusername/inrent.git
cd inrent
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

## API Documentation

### Authentication Routes
- POST /api/auth/register - Register new user
- POST /api/auth/login - User login
- GET /api/auth/me - Get current user

### Property Routes
- POST /api/properties - Create new property listing
- GET /api/properties - Get all properties
- GET /api/properties/:id - Get property by ID
- PUT /api/properties/:id - Update property
- DELETE /api/properties/:id - Delete property

### Review Routes
- POST /api/reviews/:propertyId - Create review
- GET /api/reviews/property/:propertyId - Get property reviews
- PUT /api/reviews/:id - Update review
- DELETE /api/reviews/:id - Delete review

### Chat Routes
- POST /api/chat/start/:propertyId - Start new chat
- POST /api/chat/:chatId/message - Send message
- GET /api/chat - Get user's chats
- GET /api/chat/:chatId - Get specific chat

## Security Measures
- Rate limiting on all endpoints
- Input sanitization
- XSS protection
- CORS configuration
- File upload restrictions
- JWT authentication
- Password hashing

## Testing
Run tests using:
```bash
npm test
```

## Deployment
1. Set up production environment variables
2. Build the frontend
```bash
npm run build
```
3. Deploy to your hosting provider

## Maintenance
- Regular database backups
- Log monitoring
- Performance monitoring
- Security updates

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License
This project is licensed under the MIT License.

## Support
=======
# InRent - Student Accommodation Platform

## Overview
InRent is a comprehensive platform connecting tertiary students with landlords for student accommodation. The platform facilitates property listings, reviews, and direct communication between students and landlords.

## Features
- User authentication (students and landlords)
- Property listings with photo uploads
- Review and rating system
- Real-time chat between students and landlords
- Landlord dashboard with analytics
- Document verification system

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: MongoDB
- Cache: Redis
- Storage: AWS S3
- Real-time: Socket.io

## Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Redis
- AWS Account
- npm or yarn

## Environment Variables
Create a `.env` file in the root directory with the following variables:
```
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_bucket_name
REDIS_URL=your_redis_url
```

## Installation
1. Clone the repository
```bash
git clone https://github.com/yourusername/inrent.git
cd inrent
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

## API Documentation

### Authentication Routes
- POST /api/auth/register - Register new user
- POST /api/auth/login - User login
- GET /api/auth/me - Get current user

### Property Routes
- POST /api/properties - Create new property listing
- GET /api/properties - Get all properties
- GET /api/properties/:id - Get property by ID
- PUT /api/properties/:id - Update property
- DELETE /api/properties/:id - Delete property

### Review Routes
- POST /api/reviews/:propertyId - Create review
- GET /api/reviews/property/:propertyId - Get property reviews
- PUT /api/reviews/:id - Update review
- DELETE /api/reviews/:id - Delete review

### Chat Routes
- POST /api/chat/start/:propertyId - Start new chat
- POST /api/chat/:chatId/message - Send message
- GET /api/chat - Get user's chats
- GET /api/chat/:chatId - Get specific chat

## Security Measures
- Rate limiting on all endpoints
- Input sanitization
- XSS protection
- CORS configuration
- File upload restrictions
- JWT authentication
- Password hashing

## Testing
Run tests using:
```bash
npm test
```

## Deployment
1. Set up production environment variables
2. Build the frontend
```bash
npm run build
```
3. Deploy to your hosting provider

## Maintenance
- Regular database backups
- Log monitoring
- Performance monitoring
- Security updates

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License
This project is licensed under the MIT License.

## Support
>>>>>>> c24ff08aad83fc64379c0b79e46151d3783b8082
For support, email support@inrent.com or create an issue in the repository. 