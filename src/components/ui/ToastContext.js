import React, { createContext, useState, useEffect } from 'react';

export const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [
            ...prev,
            { id, message, type }
        ]);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== toasts[0]?.id));
        }, 3000);

        return () => clearTimeout(timer);
    }, [toasts]);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                />
            ))}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = React.useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
