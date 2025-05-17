import axios from 'axios';

const GOOGLE_AUTH_CONFIG = {
    clientId: '797598087935-p33kdti00jeglup3gdb8mvklcc8o79ju.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    redirectUri: window.location.origin + '/auth/google/callback'
};

export const GoogleAuth = {
    async getAuthUrl() {
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            new URLSearchParams({
                client_id: GOOGLE_AUTH_CONFIG.clientId,
                redirect_uri: GOOGLE_AUTH_CONFIG.redirectUri,
                response_type: 'token',
                scope: GOOGLE_AUTH_CONFIG.scope,
                access_type: 'offline',
                prompt: 'consent'
            });
        return authUrl;
    },

    async getAccessToken() {
        // Check if we have a token in localStorage
        const token = localStorage.getItem('google_access_token');
        if (token) {
            return token;
        }
        
        // If no token, redirect to auth URL
        const authUrl = await this.getAuthUrl();
        window.location.href = authUrl;
    },

    async handleAuthResponse() {
        // Handle the OAuth response
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const token = params.get('access_token');
        
        if (token) {
            localStorage.setItem('google_access_token', token);
            // Redirect back to the original page
            const state = params.get('state');
            if (state) {
                window.location.href = state;
            } else {
                window.location.href = '/';
            }
        }
    }
};
