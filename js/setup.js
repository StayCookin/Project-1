// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock window.location
delete window.location;
window.location = {
    href: '',
    assign: jest.fn(),
    replace: jest.fn()
};

// Mock fetch
global.fetch = jest.fn();

// Mock EmailJS
global.EmailJS = {
    init: jest.fn(),
    send: jest.fn()
};

// Setup DOM environment
document.body.innerHTML = ''; 