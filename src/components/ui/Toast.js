import React from 'react';
import { motion } from 'framer-motion';

const Toast = ({ message, type = 'success', onClose }) => {
    const variants = {
        enter: { opacity: 0, y: -20 },
        center: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 20 }
    };

    const styles = {
        success: {
            backgroundColor: '#e8f5e9',
            color: '#2e7d32'
        },
        error: {
            backgroundColor: '#ffebee',
            color: '#c62828'
        }
    };

    return (
        <motion.div
            className="toast"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{
                ...styles[type],
                padding: '1rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                maxWidth: '400px',
                margin: '1rem'
            }}
        >
            <span>{message}</span>
            <button
                onClick={onClose}
                style={{
                    background: 'none',
                    border: 'none',
                    color: styles[type].color,
                    cursor: 'pointer',
                    padding: '0 0.5rem'
                }}
            >
                ×
            </button>
        </motion.div>
    );
};

export default Toast;
