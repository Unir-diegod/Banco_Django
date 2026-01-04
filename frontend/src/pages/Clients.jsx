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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
                <div className="clients-table-container">
                    <div className="table-controls">
                        <div className="search-bar">
                            <Search size={18} />
                            <input type="text" placeholder="Buscar cliente..." />
                        </div>
                        <button className="filter-btn">
                            <Filter size={18} />
                            Filtros
                        </button>
                    </div>

                    <div className="clients-table">
                        <div className="table-header">
                            <div className="col-id">ID</div>
                            <div className="col-name">NOMBRE</div>
                            <div className="col-email">EMAIL</div>
                            <div className="col-phone">TELÉFONO</div>
                            <div className="col-status">ESTADO</div>
                        </div>

                        {clients.length === 0 && (
                            <div className="empty-state">
                                <p>No hay clientes registrados</p>
                            </div>
                        )}

                        {clients.map((client) => (
                            <div key={client.client_id} className="table-row">
                                <div className="col-id">#{String(client.client_id).slice(0, 6)}</div>
                                <div className="col-name">
                                    <div className="client-avatar">
                                        {getInitials(client.name)}
                                    </div>
                                    {client.name}
                                </div>
                                <div className="col-email">{client.email}</div>
                                <div className="col-phone">{client.phone || 'N/A'}</div>
                                <div className="col-status">
                                    <span className={`status-badge ${client.is_delinquent ? 'status-delinquent' : 'status-active'}`}>
                                        {client.is_delinquent ? 'Moroso' : 'Activo'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Nuevo Cliente</h2>
                                <p className="modal-subtitle">Registrar un nuevo cliente en el sistema.</p>
                            </div>
                            <button className="close-btn" onClick={() => setShowModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Nombre Completo</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        placeholder="juan@ejemplo.com"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Teléfono</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+54 11 ..."
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Dirección</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Calle Falsa 123"
                                />
                            </div>

                            <div className="modal-actions">
                                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" className="btn-primary">
                                    Registrar Cliente
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
