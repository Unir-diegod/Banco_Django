import React, { useEffect, useState } from 'react';
import { AlertCircle, X, WifiOff, AlertTriangle, Info } from 'lucide-react';
import { onApiError } from '../services/apiClient';
import './ErrorNotification.css';

const ICONS = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  network: WifiOff,
};

export function ErrorNotification() {
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const unsubscribe = onApiError((error) => {
      const id = Date.now();
      const type = 
        error.status === 0 || error.message?.includes('conexión') ? 'network' :
        error.status >= 500 ? 'error' :
        error.status === 429 || error.status === 409 ? 'warning' :
        'error';

      const newError = {
        id,
        type,
        message: error.message,
        detail: error.detail,
        status: error.status,
      };

      setErrors((prev) => [...prev, newError]);

      // Auto-remove después de 7 segundos
      setTimeout(() => {
        setErrors((prev) => prev.filter((e) => e.id !== id));
      }, 7000);
    });

    return unsubscribe;
  }, []);

  const removeError = (id) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  };

  if (errors.length === 0) return null;

  return (
    <div className="error-notification-container">
      {errors.map((error) => {
        const Icon = ICONS[error.type];
        return (
          <div key={error.id} className={`error-notification error-${error.type}`}>
            <div className="error-icon">
              <Icon size={20} />
            </div>
            <div className="error-content">
              <div className="error-message">{error.message}</div>
              {error.detail && <div className="error-detail">{error.detail}</div>}
              {error.status > 0 && (
                <div className="error-code">Código: {error.status}</div>
              )}
            </div>
            <button 
              className="error-close"
              onClick={() => removeError(error.id)}
              aria-label="Cerrar notificación"
            >
              <X size={18} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
