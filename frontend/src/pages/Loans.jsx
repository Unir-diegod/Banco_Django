import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Plus, X, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/BaseComponents';
import './Loans.css';
import { fetchClients } from '../services/clients';
import { createLoan, fetchLoans } from '../services/loans';

const Loans = () => {
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        client_id: '',
        principal_amount: '0.00',
        term_months: '12',
        monthly_rate: '15'
    });

    const [clients, setClients] = useState([]);
    const [loans, setLoans] = useState([]);

    const clientsById = useMemo(() => {
        const map = new Map();
        for (const client of clients) {
            map.set(client.client_id, client);
        }
        return map;
    }, [clients]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const [clientsData, loansData] = await Promise.all([
                    fetchClients(),
                    fetchLoans(),
                ]);
                if (cancelled) return;
                setClients(clientsData);
                setLoans(loansData);
            } catch (error) {
                console.error(error);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createLoan(formData);
            const loansData = await fetchLoans();
            setLoans(loansData);
            setShowModal(false);
            setFormData({
                client_id: '',
                principal_amount: '0.00',
                term_months: '12',
                monthly_rate: '15'
            });
        } catch (error) {
            console.error(error);
            alert('Error al crear el préstamo');
        }
    };

    return (
        <div className="loans-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Préstamos</h1>
                    <p className="page-subtitle">Administración y seguimiento de créditos</p>
                </div>
                <Button onClick={() => setShowModal(true)} className="btn-primary">
                    <Plus size={20} style={{ marginRight: '8px' }} />
                    Solicitar Préstamo
                </Button>
            </div>

            <div className="content-section">
                <div className="controls-bar">
                    <div className="search-wrapper">
                        <Search size={18} className="search-icon" />
                        <input type="text" className="search-input" placeholder="Buscar préstamo..." />
                    </div>
                    <Button className="btn-secondary">
                        <Filter size={18} style={{ marginRight: '8px' }} />
                        Filtros
                    </Button>
                </div>

                <div className="table-container">
                    <table className="loans-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>CLIENTE</th>
                                <th>DETALLES</th>
                                <th>ESTADO</th>
                                <th>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loans.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>
                                        No hay préstamos registrados
                                    </td>
                                </tr>
                            ) : (
                                loans.map((loan) => (
                                    <tr key={loan.id}>
                                        <td style={{fontFamily: 'monospace', color: 'var(--accent-primary)'}}>
                                            #{String(loan.loan_id).slice(0, 8)}
                                        </td>
                                        <td style={{fontWeight: 600}}>
                                            {clientsById.get(loan.client_id)?.name ?? loan.client_id}
                                        </td>
                                        <td>
                                            <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
                                                <span style={{color: 'var(--text-primary)', fontWeight: 600}}>
                                                    ${Number(loan.principal_amount).toLocaleString()} {loan.currency}
                                                </span>
                                                <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                                                    {loan.term_months} meses • {(Number(loan.monthly_rate) * 12 * 100).toFixed(2)}% anual
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${loan.status.toLowerCase()}`}>
                                                {loan.status}
                                            </span>
                                        </td>
                                        <td>
                                            <Button className="btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem'}}>
                                                Ver Detalle
                                            </Button>
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
                                <h2>Solicitar Préstamo</h2>
                                <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Crear una nueva solicitud de crédito.</p>
                            </div>
                            <button className="close-btn" onClick={() => setShowModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Cliente</label>
                                <div style={{position: 'relative'}}>
                                    <select
                                        className="search-input"
                                        value={formData.client_id}
                                        onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                        required
                                        style={{appearance: 'none', cursor: 'pointer'}}
                                    >
                                        <option value="">Seleccionar cliente...</option>
                                        {clients.map(client => (
                                            <option key={client.client_id} value={client.client_id}>
                                                {client.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} style={{position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)'}} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Monto Principal</label>
                                    <input
                                        type="number"
                                        className="search-input"
                                        value={formData.principal_amount}
                                        onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })}
                                        required
                                        min="1000"
                                        step="100"
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Plazo (Meses)</label>
                                    <input
                                        type="number"
                                        className="search-input"
                                        value={formData.term_months}
                                        onChange={(e) => setFormData({ ...formData, term_months: e.target.value })}
                                        required
                                        min="1"
                                        max="120"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Tasa Mensual (%)</label>
                                <input
                                    type="number"
                                    className="search-input"
                                    value={formData.monthly_rate}
                                    onChange={(e) => setFormData({ ...formData, monthly_rate: e.target.value })}
                                    required
                                    step="0.01"
                                />
                            </div>

                            <div className="form-actions">
                                <Button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" className="btn-primary">
                                    Crear Solicitud
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Loans;
