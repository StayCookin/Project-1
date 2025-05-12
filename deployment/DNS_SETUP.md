<<<<<<< HEAD
# DNS Configuration for inrent.com

## Domain Name Setup

1. Purchase the domain `inrent.com` from a domain registrar (e.g., GoDaddy, Namecheap, Google Domains)

2. Configure the following DNS records:

### A Records
```
inrent.com.             A     <YOUR_SERVER_IP>
www.inrent.com.         A     <YOUR_SERVER_IP>
```

### CNAME Records
```
*.inrent.com.           CNAME inrent.com.
```

### MX Records (for email)
```
inrent.com.             MX    10 mail.inrent.com.
```

### TXT Records (for SPF and DMARC)
```
inrent.com.             TXT   "v=spf1 mx include:_spf.google.com ~all"
_dmarc.inrent.com.      TXT   "v=DMARC1; p=reject; rua=mailto:admin@inrent.com"
```

## SSL Certificate Setup

1. Make the init-letsencrypt.sh script executable:
```bash
chmod +x init-letsencrypt.sh
```

2. Run the script to obtain SSL certificates:
```bash
./init-letsencrypt.sh
```

## Email Configuration

1. Set up email forwarding or hosting:
   - Configure email forwarding to your business email
   - Or set up email hosting with providers like Google Workspace

2. Configure DKIM if using email hosting:
   - Follow your email provider's instructions for DKIM setup
   - Add the provided DKIM record to your DNS configuration

## Verification

1. Verify DNS propagation:
```bash
dig inrent.com
dig www.inrent.com
```

2. Verify SSL certificate:
```bash
openssl s_client -connect inrent.com:443 -servername inrent.com
```

3. Verify email configuration:
```bash
dig inrent.com MX
dig inrent.com TXT
```

## Monitoring

1. Set up monitoring for:
   - SSL certificate expiration
   - DNS resolution
   - Domain expiration
   - Email delivery

2. Configure alerts for:
   - Certificate renewal failures
   - DNS changes
   - Domain expiration warnings

## Security Recommendations

1. Enable DNSSEC with your domain registrar
2. Use strong TTL values (e.g., 3600 for most records)
3. Implement CAA records
4. Monitor for unauthorized DNS changes
5. Keep domain registration private
=======
# DNS Configuration for inrent.com

## Domain Name Setup

1. Purchase the domain `inrent.com` from a domain registrar (e.g., GoDaddy, Namecheap, Google Domains)

2. Configure the following DNS records:

### A Records
```
inrent.com.             A     <YOUR_SERVER_IP>
www.inrent.com.         A     <YOUR_SERVER_IP>
```

### CNAME Records
```
*.inrent.com.           CNAME inrent.com.
```

### MX Records (for email)
```
inrent.com.             MX    10 mail.inrent.com.
```

### TXT Records (for SPF and DMARC)
```
inrent.com.             TXT   "v=spf1 mx include:_spf.google.com ~all"
_dmarc.inrent.com.      TXT   "v=DMARC1; p=reject; rua=mailto:admin@inrent.com"
```

## SSL Certificate Setup

1. Make the init-letsencrypt.sh script executable:
```bash
chmod +x init-letsencrypt.sh
```

2. Run the script to obtain SSL certificates:
```bash
./init-letsencrypt.sh
```

## Email Configuration

1. Set up email forwarding or hosting:
   - Configure email forwarding to your business email
   - Or set up email hosting with providers like Google Workspace

2. Configure DKIM if using email hosting:
   - Follow your email provider's instructions for DKIM setup
   - Add the provided DKIM record to your DNS configuration

## Verification

1. Verify DNS propagation:
```bash
dig inrent.com
dig www.inrent.com
```

2. Verify SSL certificate:
```bash
openssl s_client -connect inrent.com:443 -servername inrent.com
```

3. Verify email configuration:
```bash
dig inrent.com MX
dig inrent.com TXT
```

## Monitoring

1. Set up monitoring for:
   - SSL certificate expiration
   - DNS resolution
   - Domain expiration
   - Email delivery

2. Configure alerts for:
   - Certificate renewal failures
   - DNS changes
   - Domain expiration warnings

## Security Recommendations

1. Enable DNSSEC with your domain registrar
2. Use strong TTL values (e.g., 3600 for most records)
3. Implement CAA records
4. Monitor for unauthorized DNS changes
5. Keep domain registration private
>>>>>>> c24ff08aad83fc64379c0b79e46151d3783b8082
6. Use domain lock to prevent unauthorized transfers 