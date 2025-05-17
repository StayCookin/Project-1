// Main application JavaScript

// DOM Elements
const addListingBtn = document.getElementById('addListingBtn');
const addListingModal = document.getElementById('add-listing-modal');
const documentUploads = document.querySelectorAll('.document-upload');
const amenityInput = document.getElementById('amenityInput');
const conditionRating = document.getElementById('conditionRating');
const safetyRating = document.getElementById('safetyRating');
const writeReviewBtn = document.getElementById('writeReviewBtn');
const reviewModal = document.getElementById('review-modal');
const ratingStars = document.querySelectorAll('#ratingStars i');

// State
let selectedRating = 0;

// Initialize
function initialize() {
    // Add listing form submission
    if (document.getElementById('addListingForm')) {
        document.getElementById('addListingForm').addEventListener('submit', handleListingSubmit);
    }

    // Waitlist form submission
    if (document.getElementById('waitlistForm')) {
        document.getElementById('waitlistForm').addEventListener('submit', handleWaitlistSubmit);
    }

    // Review modal handlers
    if (writeReviewBtn) {
        writeReviewBtn.addEventListener('click', openReviewModal);
    }
    if (reviewModal) {
        ratingStars.forEach(star => {
            star.addEventListener('click', handleStarClick);
            star.addEventListener('mouseover', handleStarHover);
            star.addEventListener('mouseout', handleStarHoverOut);
        });
        reviewModal.querySelector('form').addEventListener('submit', handleReviewSubmit);
    }

    // Photo uploads
    const photoUploadItems = document.querySelectorAll('.photo-upload-item');
    photoUploadItems.forEach(item => {
        const input = item.querySelector('input[type="file"]');
        const placeholder = item.querySelector('.photo-upload-placeholder');
        
        item.addEventListener('click', () => input.click());
        input.addEventListener('change', handlePhotoUpload);
    });

    // Load existing reviews
    const existingReviews = JSON.parse(localStorage.getItem('landlordReviews')) || [];
    existingReviews.forEach(review => addReviewToList(review));
    updateAverageRating();
}

// Waitlist form handler
function handleWaitlistSubmit(e) {
    e.preventDefault();
    const messageDiv = document.querySelector('.waitlist-message');
    
    try {
        const formData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            university: document.getElementById('university').value,
            role: document.getElementById('role').value,
            interest: document.getElementById('interest').value
        };

        // Here you would typically make an API call to submit the data
        // For now, we'll just show a success message
        messageDiv.classList.remove('error');
        messageDiv.classList.add('success');
        messageDiv.textContent = 'Thank you for joining the waitlist!';
        messageDiv.style.display = 'block';

        // Clear the form
        e.target.reset();
    } catch (error) {
        console.error('Error submitting waitlist form:', error);
        messageDiv.classList.remove('success');
        messageDiv.classList.add('error');
        messageDiv.textContent = 'An error occurred. Please try again.';
        messageDiv.style.display = 'block';
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', initialize);

// Functions
function handleListingSubmit(e) {
    e.preventDefault();
    
    // Validate photos
    const uploadedPhotos = Array.from(photoUploadItems)
        .filter(item => item.querySelector('input[type="file"]').files.length > 0);
    
    if (uploadedPhotos.length < 3) {
        alert('Please upload at least 3 photos of your property');
        return;
    }
    
    // Validate documents
    const uploads = Array.from(documentUploads).every(upload => 
        upload.querySelector('input[type="file"]').files.length > 0
    );
    
    if (!uploads) {
        alert('Please upload all required documents');
        return;
    }
    
    // Get amenities
    const amenities = Array.from(amenitiesList.children).map(tag => 
        tag.textContent.trim()
    );
    
    // Process listing
    const landlordData = JSON.parse(localStorage.getItem('landlordData'));
    if (landlordData) {
        landlordData.freeListings--;
        localStorage.setItem('landlordData', JSON.stringify(landlordData));
        
        if (landlordData.freeListings <= 0) {
            addListingBtn.style.display = 'none';
        }
    }
    
    // Close modal and show success
    addListingModal.classList.remove('active');
    alert('Your listing has been submitted for verification.');
}

function handlePhotoUpload(e) {
    const file = e.target.files[0];
    
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        e.target.value = '';
        return;
    }

    if (!file.type.startsWith('image/')) {
        alert('Please upload only image files');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        e.target.parentElement.appendChild(img);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'photo-delete';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = function(e) {
            e.stopPropagation();
            e.target.parentElement.querySelector('input[type="file"]').value = '';
            img.remove();
            deleteBtn.remove();
            e.target.parentElement.querySelector('.photo-upload-placeholder').classList.remove('hidden');
        };
        e.target.parentElement.appendChild(deleteBtn);
        
        e.target.parentElement.querySelector('.photo-upload-placeholder').classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

function openReviewModal() {
    const studentData = JSON.parse(localStorage.getItem('studentData'));
    if (!studentData || !studentData.verified) {
        alert('Please log in as a student to write a review.');
        return;
    }
    reviewModal.classList.add('active');
}

function handleReviewSubmit(e) {
    e.preventDefault();
    
    if (selectedRating === 0) {
        alert('Please select a rating');
        return;
    }
    
    const reviewText = e.target.querySelector('textarea').value;
    const studentData = JSON.parse(localStorage.getItem('studentData'));
    
    const review = {
        id: Date.now(),
        rating: selectedRating,
        text: reviewText,
        reviewer: {
            name: studentData.name,
            initial: studentData.name.charAt(0).toUpperCase()
        },
        date: new Date().toLocaleDateString()
    };
    
    // Add review
    const reviews = JSON.parse(localStorage.getItem('landlordReviews')) || [];
    reviews.push(review);
    localStorage.setItem('landlordReviews', JSON.stringify(reviews));
    
    // Update UI
    addReviewToList(review);
    updateAverageRating();
    
    // Reset
    reviewModal.classList.remove('active');
    e.target.reset();
    selectedRating = 0;
    updateStars(0);
}

function handleStarHover() {
    const rating = this.dataset.rating;
    updateStars(rating);
}

function handleStarHoverOut() {
    updateStars(selectedRating);
}

function handleStarClick() {
    selectedRating = this.dataset.rating;
    updateStars(selectedRating);
}

function updateStars(rating) {
    ratingStars.forEach(star => {
        const starRating = star.dataset.rating;
        if (starRating <= rating) {
            star.classList.remove('far');
            star.classList.add('fas');
        } else {
            star.classList.remove('fas');
            star.classList.add('far');
        }
    });
}

function addReviewToList(review) {
    try {
        const reviewsList = document.querySelector('.reviews-list');
        if (!reviewsList) {
            console.error('Reviews list container not found');
            return;
        }

        const reviewCard = document.createElement('div');
        reviewCard.className = 'review-card';
        reviewCard.innerHTML = `
            <div class="review-header">
                <div class="reviewer-info">
                    <div class="reviewer-avatar">${review.reviewer.initial}</div>
                    <div class="reviewer-name">${review.reviewer.name}</div>
                </div>
                <div class="review-date">${review.date}</div>
            </div>
            <div class="review-rating">
                ${createStarRatingHTML(review.rating)}
            </div>
            <div class="review-text">${review.text}</div>
        `;

        reviewsList.insertBefore(reviewCard, reviewsList.firstChild);
    } catch (error) {
        console.error('Error adding review:', error);
    }
}

function createStarRatingHTML(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<i class="fas fa-star ${i <= rating ? 'active' : ''}"></i>`;
    }
    return stars;
}

function updateAverageRating() {
    try {
        const reviews = JSON.parse(localStorage.getItem('landlordReviews')) || [];
        if (reviews.length === 0) return;

        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const average = (totalRating / reviews.length).toFixed(1);
        document.getElementById('averageRating')?.textContent = average;
    } catch (error) {
        console.error('Error updating average rating:', error);
    }
}

// Initialize
function initialize() {
    // Load existing reviews
    const existingReviews = JSON.parse(localStorage.getItem('landlordReviews')) || [];
    existingReviews.forEach(review => addReviewToList(review));
    updateAverageRating();
}

document.addEventListener('DOMContentLoaded', initialize);
