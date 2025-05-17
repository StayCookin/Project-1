class AnalyticsService {
    constructor() {
        this.initializeAnalytics();
    }

    initializeAnalytics() {
        // Initialize Google Analytics or other analytics service
        window.dataLayer = window.dataLayer || [];
        function gtag() {
            dataLayer.push(arguments);
        }
        gtag('js', new Date());
        gtag('config', 'YOUR_GOOGLE_ANALYTICS_ID');
    }

    trackEvent(category, action, label = null, value = null) {
        gtag('event', action, {
            event_category: category,
            event_label: label,
            value: value
        });
    }

    trackPageView(path) {
        gtag('config', 'YOUR_GOOGLE_ANALYTICS_ID', {
            page_path: path
        });
    }

    trackFormSubmission(data) {
        this.trackEvent('Waitlist', 'Form Submission', null, {
            name: data.name,
            school: data.school
        });
    }
}

export default new AnalyticsService();
