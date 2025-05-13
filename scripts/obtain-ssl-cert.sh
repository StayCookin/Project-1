#!/bin/bash

# Stop any running containers
docker-compose down

# Create required directories
mkdir -p data/certbot/conf/live/$DOMAIN
mkdir -p data/certbot/www

# Start nginx container
docker-compose up -d nginx

# Obtain SSL certificate
docker-compose run --rm certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# Restart nginx to apply new certificates
docker-compose restart nginx

# Start all services
docker-compose up -d 