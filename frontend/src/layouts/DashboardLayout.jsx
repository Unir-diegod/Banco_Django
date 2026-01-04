import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, CreditCard, Users, FileText, Settings, LogOut, Sun, Moon, Bell, Search } from 'lucide-react';
import './DashboardLayout.css';

const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const navItems = [
        { icon: LayoutGrid, path: '/dashboard', label: 'Panel' },
        { icon: CreditCard, path: '/loans', label: 'Préstamos' },
        { icon: Users, path: '/clients', label: 'Clientes' },
        { icon: FileText, path: '/reports', label: 'Reportes' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        navigate('/');
    };

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="logo-icon">
                        <CreditCard size={24} />
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <button
                            key={item.path}
                            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                            onClick={() => navigate(item.path)}
                            title={item.label}
                        >
                            <item.icon size={24} />
                        </button>
                    ))}
                </nav>

                <div className="sidebar-bottom">
                    <button className="nav-item" title="Configuración">
                        <Settings size={24} />
                    </button>
                    <button className="nav-item" onClick={handleLogout} title="Cerrar sesión">
                        <LogOut size={24} />
                    </button>
                </div>
            </aside>

            <div className="content-wrapper">
                <header className="top-header">
                    <div className="header-search">
                        <Search size={20} className="search-icon" />
                        <input type="text" placeholder="Buscar..." className="search-input-global" />
                    </div>
                    
                    <div className="header-actions-global">
                        <button 
                            className="icon-btn" 
                            onClick={toggleTheme} 
                            title={theme === 'dark' ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        
                        <button className="icon-btn">
                            <Bell size={20} />
                            <span className="notification-dot"></span>
                        </button>

                        <div className="user-profile-mini">
                            <div className="user-avatar-mini">AS</div>
                            <div className="user-info-mini">
                                <span className="user-name-mini">Admin</span>
                                <span className="user-role-mini">Superadmin</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
