// Modal Functions
require ("dotenv").config();
function showStudentSignup() {
    document.getElementById('student-signup-modal').style.display = 'block';
}

function showLandlordSignup() {
    document.getElementById('landlord-signup-modal').style.display = 'block';
}

// Close modals when clicking the close button or outside the modal
window.onclick = function(event) {
    const modals = document.getElementsByClassName('modal');
    for (let i = 0; i < modals.length; i++) {
        if (event.target === modals[i]) {
            modals[i].style.display = 'none';
        }
    }
};

document.querySelectorAll('.close-modal').forEach(button => {
    button.onclick = function() {
        const modal = this.closest('.modal');
        modal.style.display = 'none';
    };
});

// Form Validation Functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

function validatePhone(phone) {
    // Botswana phone number format
    return /^\+267\d{7}$/.test(phone);
}

// Handle form submissions
function handleStudentSignup(e) {
    e.preventDefault();
    const form = e.target;
    
    // Get form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Validate form
    if (!validateEmail(data.email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    // TODO: Add your form submission logic here
    console.log('Student signup data:', data);
    
    // Close modal
    document.getElementById('student-signup-modal').style.display = 'none';
}

function handleLandlordSignup(e) {
    e.preventDefault();
    const form = e.target;
    
    // Get form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Validate form
    if (!validateEmail(data.email)) {
        alert('Please enter a valid email address');
        return;
    }
    if (!validatePhone(data.phone)) {
        alert('Please enter a valid Botswana phone number');
        return;
    }
    
    // TODO: Add your form submission logic here
    console.log('Landlord signup data:', data);
    
    // Close modal
    document.getElementById('landlord-signup-modal').style.display = 'none';
}

// Add event listeners to forms
document.getElementById('student-signup-form').addEventListener('submit', handleStudentSignup);
document.getElementById('landlord-signup-form').addEventListener('submit', handleLandlordSignup);

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Add smooth scrolling to all links with hash
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});
