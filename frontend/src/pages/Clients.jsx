import React, { useEffect, useState } from 'react';
import { Search, Filter, Plus, X, User } from 'lucide-react';
import { Button } from '../components/ui/BaseComponents';
import './Clients.css';
import { fetchClients, createClient } from '../services/clients';

const Clients = () => {
    const [showModal, setShowModal] = useState(false);
    const [clients, setClients] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    const loadClients = async () => {
        try {
            const data = await fetchClients();
            setClients(data);
        } catch (error) {
            console.error('Error loading clients:', error);
        }
    };

    useEffect(() => {
        loadClients();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createClient(formData);
            await loadClients();
            setShowModal(false);
            setFormData({ name: '', email: '', phone: '', address: '' });
        } catch (error) {
            console.error('Error creating client:', error);
            alert('No se pudo crear el cliente');
        }
    };

    const getInitials = (name) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="clients-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Clientes</h1>
                    <p className="page-subtitle">Gestión de cartera de clientes</p>
                </div>
                <Button onClick={() => setShowModal(true)} className="btn-primary">
                    <Plus size={20} style={{ marginRight: '8px' }} />
                    Nuevo Cliente
                </Button>
            </div>

            <div className="content-section">
                <div className="controls-bar">
                    <div className="search-wrapper">
                        <Search size={18} className="search-icon" />
                        <input type="text" className="search-input" placeholder="Buscar cliente..." />
                    </div>
                    <Button className="btn-secondary">
                        <Filter size={18} style={{ marginRight: '8px' }} />
                        Filtros
                    </Button>
                </div>

                <div className="table-container">
                    <table className="clients-table">
                        <thead>
                            <tr>
                                <th>CLIENTE</th>
                                <th>EMAIL</th>
                                <th>TELÉFONO</th>
                                <th>DIRECCIÓN</th>
                                <th>ESTADO</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>
                                        No hay clientes registrados
                                    </td>
                                </tr>
                            ) : (
                                clients.map((client) => (
                                    <tr key={client.client_id}>
                                        <td>
                                            <div className="client-info">
                                                <div className="client-avatar">
                                                    {getInitials(client.name)}
                                                </div>
                                                <div className="client-details">
                                                    <h3>{client.name}</h3>
                                                    <p>ID: #{String(client.client_id).slice(0, 6)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{client.email}</td>
                                        <td>{client.phone || 'N/A'}</td>
                                        <td>{client.address || 'N/A'}</td>
                                        <td>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '100px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                background: client.is_delinquent ? 'rgba(220, 38, 38, 0.15)' : 'rgba(21, 128, 61, 0.15)',
                                                color: client.is_delinquent ? 'var(--error-color)' : 'var(--success-color)'
                                            }}>
                                                {client.is_delinquent ? 'Moroso' : 'Activo'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>Nuevo Cliente</h2>
                                <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Registrar un nuevo cliente en el sistema.</p>
                            </div>
                            <button className="close-btn" onClick={() => setShowModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Nombre Completo</label>
                                <input
                                    type="text"
                                    className="search-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>

                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                                <div className="form-group">
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Email</label>
                                    <input
                                        type="email"
                                        className="search-input"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        placeholder="juan@ejemplo.com"
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Teléfono</label>
                                    <input
                                        type="tel"
                                        className="search-input"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+52 555..."
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Dirección</label>
                                <input
                                    type="text"
                                    className="search-input"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Calle Principal #123"
                                />
                            </div>

                            <div className="form-actions">
                                <Button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" className="btn-primary">
                                    Guardar Cliente
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clients;
