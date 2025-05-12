<<<<<<< HEAD
// InRent Website JavaScript

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Navigation toggle for mobile
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (menuToggle && navMenu) {
      menuToggle.addEventListener('click', function() {
        navMenu.classList.toggle('show');
      });
    }
    
    // Add swirl effect to all elements with class 'swirl-hover'
    const swirlElements = document.querySelectorAll('.swirl-hover');
    
    swirlElements.forEach(element => {
      element.addEventListener('mousemove', function(e) {
        const x = e.pageX - this.offsetLeft;
        const y = e.pageY - this.offsetTop;
        
        this.style.setProperty('--x', `${x}px`);
        this.style.setProperty('--y', `${y}px`);
      });
    });
    
    // Form validation
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Basic validation
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
          if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
          } else {
            field.classList.remove('error');
          }
        });
        
        if (isValid) {
          // Submit form data to backend
          const formData = new FormData(form);
          
          fetch('/api/submit', {
            method: 'POST',
            body: formData
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              showNotification('Success!', 'Your information has been submitted.');
              form.reset();
            } else {
              showNotification('Error', 'There was a problem submitting your information.');
            }
          })
          .catch(error => {
            showNotification('Error', 'Connection error. Please try again later.');
            console.error('Error:', error);
          });
        }
      });
    });
    
    // Notification system
    function showNotification(title, message) {
      const notification = document.createElement('div');
      notification.className = 'notification';
      notification.innerHTML = `
        <div class="notification-header">${title}</div>
        <div class="notification-body">${message}</div>
      `;
      
      document.addEventListener('DOMContentLoaded', function() {
        // Add event listeners for all buttons
        const buttons = document.querySelectorAll('.btn');
        
        buttons.forEach(button => {
          button.addEventListener('click', function(e) {
            // Prevent default action for links
            e.preventDefault();
            
            // Get the button text to determine action
            const buttonText = this.textContent.trim();
            
            // You can handle different button actions based on text or classes
            console.log(`Button clicked: ${buttonText}`);
            
            // Example of specific button handling
            if (buttonText === 'Login') {
              // Open login modal
              showLoginModal();
            } else if (buttonText === 'Load More Listings') {
              // Load more listings
              loadMoreListings();
            }
          });
        });
        
        // Example functions for button actions
        function showLoginModal() {
          alert('Login functionality will be implemented here');
          // In a real implementation, you would show a modal with login form
        }
        
        function loadMoreListings() {
          // Fetch more listings from the backend
          fetch('/api/listings?page=2')
            .then(response => response.json())
            .then(data => {
              // Add the new listings to the page
              console.log('Loading more listings:', data);
            })
            .catch(error => {
              console.error('Error loading more listings:', error);
            });
        }
      });
      document.body.appendChild(notification);
      
      // Show notification
      setTimeout(() => {
        notification.classList.add('show');
      }, 10);
      
      // Hide and remove notification
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 300);
      }, 3000);
    }
=======
// InRent Website JavaScript

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Navigation toggle for mobile
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (menuToggle && navMenu) {
      menuToggle.addEventListener('click', function() {
        navMenu.classList.toggle('show');
      });
    }
    
    // Add swirl effect to all elements with class 'swirl-hover'
    const swirlElements = document.querySelectorAll('.swirl-hover');
    
    swirlElements.forEach(element => {
      element.addEventListener('mousemove', function(e) {
        const x = e.pageX - this.offsetLeft;
        const y = e.pageY - this.offsetTop;
        
        this.style.setProperty('--x', `${x}px`);
        this.style.setProperty('--y', `${y}px`);
      });
    });
    
    // Form validation
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Basic validation
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
          if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
          } else {
            field.classList.remove('error');
          }
        });
        
        if (isValid) {
          // Submit form data to backend
          const formData = new FormData(form);
          
          fetch('/api/submit', {
            method: 'POST',
            body: formData
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              showNotification('Success!', 'Your information has been submitted.');
              form.reset();
            } else {
              showNotification('Error', 'There was a problem submitting your information.');
            }
          })
          .catch(error => {
            showNotification('Error', 'Connection error. Please try again later.');
            console.error('Error:', error);
          });
        }
      });
    });
    
    // Notification system
    function showNotification(title, message) {
      const notification = document.createElement('div');
      notification.className = 'notification';
      notification.innerHTML = `
        <div class="notification-header">${title}</div>
        <div class="notification-body">${message}</div>
      `;
      
      document.addEventListener('DOMContentLoaded', function() {
        // Add event listeners for all buttons
        const buttons = document.querySelectorAll('.btn');
        
        buttons.forEach(button => {
          button.addEventListener('click', function(e) {
            // Prevent default action for links
            e.preventDefault();
            
            // Get the button text to determine action
            const buttonText = this.textContent.trim();
            
            // You can handle different button actions based on text or classes
            console.log(`Button clicked: ${buttonText}`);
            
            // Example of specific button handling
            if (buttonText === 'Login') {
              // Open login modal
              showLoginModal();
            } else if (buttonText === 'Load More Listings') {
              // Load more listings
              loadMoreListings();
            }
          });
        });
        
        // Example functions for button actions
        function showLoginModal() {
          alert('Login functionality will be implemented here');
          // In a real implementation, you would show a modal with login form
        }
        
        function loadMoreListings() {
          // Fetch more listings from the backend
          fetch('/api/listings?page=2')
            .then(response => response.json())
            .then(data => {
              // Add the new listings to the page
              console.log('Loading more listings:', data);
            })
            .catch(error => {
              console.error('Error loading more listings:', error);
            });
        }
      });
      document.body.appendChild(notification);
      
      // Show notification
      setTimeout(() => {
        notification.classList.add('show');
      }, 10);
      
      // Hide and remove notification
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 300);
      }, 3000);
    }
>>>>>>> c24ff08aad83fc64379c0b79e46151d3783b8082
  });