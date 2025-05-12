const { expect } = require('chai');
const puppeteer = require('puppeteer');

describe('InRent Integration Tests', () => {
    let browser;
    let page;

    before(async () => {
        browser = await puppeteer.launch({ headless: false });
        page = await browser.newPage();
    });

    after(async () => {
        await browser.close();
    });

    describe('Main Page Tests', () => {
        it('should load the main page successfully', async () => {
            await page.goto('http://localhost:3000/InRent.html');
            const title = await page.title();
            expect(title).to.include('InRent');
        });

        it('should display all main sections', async () => {
            const sections = await page.$$eval('section', sections => 
                sections.map(section => section.id)
            );
            expect(sections).to.include('features');
            expect(sections).to.include('how-it-works');
            expect(sections).to.include('pricing');
            expect(sections).to.include('testimonials');
        });
    });

    describe('Authentication Tests', () => {
        it('should open student signup modal', async () => {
            await page.click('button[data-modal="student-signup"]');
            const modal = await page.$('#student-signup');
            expect(modal).to.not.be.null;
        });

        it('should validate student signup form', async () => {
            await page.type('#studentName', 'Test Student');
            await page.type('#studentEmail', 'test@student.com');
            await page.type('#studentPassword', 'Test123!');
            await page.select('#tertiarySchool', 'ub');
            await page.type('#studentId', '123456');
            await page.type('#studentPhone', '76123456');
            
            await page.click('#studentNextBtn');
            
            // Check for verification step
            const verificationStep = await page.$('.verification-step');
            expect(verificationStep).to.not.be.null;
        });

        it('should open landlord signup modal', async () => {
            await page.click('button[data-modal="landlord-signup"]');
            const modal = await page.$('#landlord-signup');
            expect(modal).to.not.be.null;
        });

        it('should validate landlord signup form', async () => {
            await page.type('#landlordFullName', 'Test Landlord');
            await page.type('#landlordEmail', 'test@landlord.com');
            await page.type('#landlordPhone', '76123456');
            await page.select('#location', 'gaborone');
            await page.select('#propertyType', 'apartment');
            await page.type('#landlordPassword', 'Test123!');
            await page.type('#landlordConfirmPassword', 'Test123!');
            
            await page.click('#landlordNextBtn');
            
            // Check for verification step
            const verificationStep = await page.$('.verification-step');
            expect(verificationStep).to.not.be.null;
        });
    });

    describe('Marketplace Tests', () => {
        it('should display property listings after student login', async () => {
            // Login as student
            await page.click('button[data-modal="login"]');
            await page.type('#studentLoginEmail', 'test@student.com');
            await page.type('#studentLoginPassword', 'Test123!');
            await page.click('#studentLoginForm button[type="submit"]');

            // Check for property listings
            const listings = await page.$$('.property-card');
            expect(listings.length).to.be.greaterThan(0);
        });

        it('should filter properties by price range', async () => {
            await page.select('#priceRange', '2000-4000');
            const listings = await page.$$('.property-card');
            expect(listings.length).to.be.greaterThan(0);
        });

        it('should filter properties by type', async () => {
            await page.select('#propertyType', 'apartment');
            const listings = await page.$$('.property-card');
            expect(listings.length).to.be.greaterThan(0);
        });
    });

    describe('Landlord Dashboard Tests', () => {
        it('should access landlord dashboard after login', async () => {
            // Login as landlord
            await page.click('button[data-modal="login"]');
            await page.click('.login-option-btn[data-type="landlord"]');
            await page.type('#landlordLoginEmail', 'test@landlord.com');
            await page.type('#landlordLoginPassword', 'Test123!');
            await page.click('#landlordLoginForm button[type="submit"]');

            // Check dashboard elements
            const overviewCards = await page.$$('.overview-card');
            expect(overviewCards.length).to.equal(3);
        });

        it('should add new property listing', async () => {
            await page.click('#addListingBtn');
            const modal = await page.$('#add-listing-modal');
            expect(modal).to.not.be.null;

            // Fill property details
            await page.type('input[placeholder="Property Title"]', 'Test Property');
            await page.type('textarea[placeholder="Describe your property..."]', 'Test description');
            
            // Upload photos (simulated)
            const fileInput = await page.$('input[type="file"]');
            await fileInput.uploadFile('./test-files/test-image.jpg');

            // Submit form
            await page.click('#addListingForm button[type="submit"]');
            
            // Check for success message
            const successMessage = await page.$('.success-message');
            expect(successMessage).to.not.be.null;
        });
    });

    describe('Chat Functionality Tests', () => {
        it('should open chat widget', async () => {
            await page.click('#chatHeader');
            const chatWidget = await page.$('#chatWidget');
            expect(chatWidget).to.not.be.null;
        });

        it('should send and receive messages', async () => {
            await page.type('#messageInput', 'Hello, I am interested in your property');
            await page.click('#sendMessage');
            
            // Check for sent message
            const messages = await page.$$('.message.sent');
            expect(messages.length).to.be.greaterThan(0);
        });
    });

    describe('Review System Tests', () => {
        it('should open review modal', async () => {
            await page.click('#writeReviewBtn');
            const modal = await page.$('#review-modal');
            expect(modal).to.not.be.null;
        });

        it('should submit a review', async () => {
            // Select rating
            await page.click('#ratingStars i[data-rating="5"]');
            
            // Write review
            await page.type('textarea[placeholder="Share your experience..."]', 'Great property and landlord!');
            
            // Submit review
            await page.click('#reviewForm button[type="submit"]');
            
            // Check for new review in list
            const reviews = await page.$$('.review-card');
            expect(reviews.length).to.be.greaterThan(0);
        });
    });
}); 