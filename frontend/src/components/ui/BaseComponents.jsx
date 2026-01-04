import React from 'react';
import './components.css';

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    return (
        <button
            className={`btn btn-${variant} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export const Input = ({ label, icon: Icon, error, ...props }) => {
    return (
        <div className="input-wrapper">
            {label && (
                <label className="input-label">
                    {label}
                </label>
            )}
            <div className="input-container">
                {Icon && (
                    <div className="input-icon">
                        <Icon size={20} />
                    </div>
                )}
                <input
                    className={`input-field ${Icon ? 'has-icon' : ''} ${error ? 'error' : ''}`}
                    {...props}
                />
            </div>
            {error && <p style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>{error}</p>}
        </div>
    );
};
