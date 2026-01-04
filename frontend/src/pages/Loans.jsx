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

    const annualPercentToMonthlyDecimalString = (annualPercent) => {
        const raw = String(annualPercent ?? '').trim();
        const normalized = raw.replace(',', '.');
        const annual = Number(normalized);
        if (!Number.isFinite(annual)) return '0.000000';
        const monthlyDecimal = (annual / 100) / 12;
        return monthlyDecimal.toFixed(6);
    };

    const sanitizeAmountString = (value) => {
        const raw = String(value ?? '').trim();
        const normalized = raw.replace(/[^0-9.,-]/g, '').replace(',', '.');
        const num = Number(normalized);
        if (!Number.isFinite(num)) return '0.00';
        return num.toFixed(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createLoan({
                client_id: formData.client_id,
                principal_amount: sanitizeAmountString(formData.principal_amount),
                currency: 'USD',
                monthly_rate: annualPercentToMonthlyDecimalString(formData.monthly_rate),
                term_months: Number.parseInt(formData.term_months, 10),
            });

            const loansData = await fetchLoans();
            setLoans(loansData);
            setShowModal(false);
        } catch (error) {
            console.error(error);
            alert('No se pudo crear el préstamo');
        }
    };

    return (
        <div className="loans-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Préstamos</h1>
                    <p className="page-subtitle">Gestión y seguimiento de créditos</p>
                </div>
                <Button onClick={() => setShowModal(true)} className="btn-primary">
                    <Plus size={20} style={{ marginRight: '8px' }} />
                    Nuevo Préstamo
                </Button>
            </div>

            <div className="content-section">
                <div className="loans-table-container">
                    <div className="table-controls">
                        <div className="search-bar">
                            <Search size={18} />
                            <input type="text" placeholder="Buscar préstamo..." />
                        </div>
                        <button className="filter-btn">
                            <Filter size={18} />
                            Filtros
                        </button>
                    </div>

                    <div className="loans-table">
                        <div className="table-header">
                            <div className="col-prestamo">PRÉSTAMO</div>
                            <div className="col-cliente">CLIENTE</div>
                            <div className="col-detalles">DETALLES</div>
                            <div className="col-estado">ESTADO</div>
                            <div className="col-acciones">ACCIONES</div>
                        </div>

                        {loans.length === 0 && (
                            <div className="empty-state">
                                <p>No hay préstamos registrados</p>
                            </div>
                        )}

                        {loans.map((loan) => (
                            <div key={loan.id} className="table-row">
                                <div className="col-prestamo">{loan.loan_id}</div>
                                <div className="col-cliente">{clientsById.get(loan.client_id)?.name ?? loan.client_id}</div>
                                <div className="col-detalles">
                                    ${loan.principal_amount} {loan.currency} • {loan.term_months}m • {(Number(loan.monthly_rate) * 12 * 100).toFixed(2)}%
                                </div>
                                <div className="col-estado">{loan.status}</div>
                                <div className="col-acciones">...</div>
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
                                <h2 className="modal-title">Solicitar Préstamo</h2>
                                <p className="modal-subtitle">Nueva solicitud de crédito.</p>
                            </div>
                            <button className="close-btn" onClick={() => setShowModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">CLIENTE</label>
                                <div className="select-wrapper">
                                    <select
                                        className="form-select"
                                        value={formData.client_id}
                                        onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Seleccionar cliente</option>
                                        {clients.map((client) => (
                                            <option key={client.client_id} value={client.client_id}>
                                                {client.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={20} className="select-icon" />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">MONTO ($)</label>
                                <input
                                    type="text"
                                    className="form-input amount-input"
                                    value={formData.principal_amount}
                                    onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">PLAZO (MESES)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.term_months}
                                        onChange={(e) => setFormData({ ...formData, term_months: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">TASA ANUAL (%)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.monthly_rate}
                                        onChange={(e) => setFormData({ ...formData, monthly_rate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <Button type="submit" className="btn-icon">
                                    Solicitar
                                    <span style={{ marginLeft: '0.5rem' }}>→</span>
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
