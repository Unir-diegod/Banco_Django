import React, { useState } from 'react';
import { Wallet, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import './Login.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await apiClient.post('/auth/token/', { username, password });
            localStorage.setItem('access_token', response.data.access);
            localStorage.setItem('refresh_token', response.data.refresh);
            navigate('/dashboard');
        } catch (error) {
            console.error(error);
            alert('Credenciales inválidas');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-background-animate"></div>
            <div className="login-container">
                <div className="login-header fade-in-up">
                    <div className="brand-logo-minimal">
                        <Wallet size={24} />
                    </div>
                    <h1 className="login-title">Bienvenido</h1>
                    <p className="login-subtitle">Ingresa a tu cuenta para continuar</p>
                </div>

                <form onSubmit={handleLogin} className="login-form fade-in-up delay-1">
                    <div className="input-group">
                        <label className="input-label">Usuario</label>
                        <div className="input-wrapper">
                            <input
                                type="text"
                                className="form-input"
                                placeholder="nombre@empresa.com"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Contraseña</label>
                        <div className="input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <a href="#" className="forgot-password">Recuperar contraseña</a>
                    </div>

                    <button type="submit" className="login-btn" disabled={isLoading}>
                        {isLoading ? 'Cargando...' : (
                            <>
                                Iniciar Sesión <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer fade-in-up delay-2">
                    <p>¿No tienes una cuenta? <a href="#">Solicitar acceso</a></p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
