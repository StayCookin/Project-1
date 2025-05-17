import axios from 'axios';
import { GoogleAuth } from './GoogleAuth';

// Get the Google Sheets ID from your URL
const GOOGLE_SHEETS_ID = process.env.REACT_APP_GOOGLE_SHEETS_ID;
const SHEET_NAME = 'Student Waitlist';

// Google Sheets API configuration
const API_CONFIG = {
    baseURL: 'https://sheets.googleapis.com/v4',
    headers: {
        'Content-Type': 'application/json'
    }
};

// Create an axios instance with API configuration
const sheetsApi = axios.create(API_CONFIG);

// Add token interceptor
sheetsApi.interceptors.request.use(async (config) => {
    const token = await GoogleAuth.getAccessToken();
    config.headers.Authorization = `Bearer ${token}`;
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const GoogleSheetsService = {
    async addStudentToWaitlist(studentData) {
        try {
            // First, get the current rows to find the next row number
            const response = await sheetsApi.get(`/spreadsheets/${GOOGLE_SHEETS_ID}/values/${SHEET_NAME}!A1:Z`);
            const nextRow = response.data.values?.length || 1;

            // Add the new student data
            const values = [
                studentData.name,
                studentData.email,
                studentData.school,
                new Date().toISOString()
            ];

            await sheetsApi.post(`/spreadsheets/${GOOGLE_SHEETS_ID}/values/${SHEET_NAME}!A${nextRow}:D${nextRow}:append`, {
                values: [values],
                majorDimension: 'ROWS',
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS'
            });

            return true;
        } catch (error) {
            console.error('Error adding to waitlist:', error);
            throw error;
        }
    },

    async getWaitlist() {
        try {
            const response = await sheetsApi.get(`/spreadsheets/${GOOGLE_SHEETS_ID}/values/${SHEET_NAME}!A1:Z`);
            return response.data.values;
        } catch (error) {
            console.error('Error getting waitlist:', error);
            throw error;
        }
    }
};
