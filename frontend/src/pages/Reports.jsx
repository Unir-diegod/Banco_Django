import React from 'react';
import { FileText, Download, PieChart, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '../components/ui/BaseComponents';
import './Reports.css';

const Reports = () => {
    const reportTypes = [
        {
            id: 1,
            title: 'Reporte de Colocación',
            description: 'Resumen detallado de préstamos otorgados en el periodo actual.',
            icon: TrendingUp,
            color: 'var(--accent-cyan)',
            date: 'Actualizado: Hoy'
        },
        {
            id: 2,
            title: 'Cartera Vencida',
            description: 'Listado de clientes con pagos atrasados y cálculo de mora.',
            icon: AlertTriangle,
            color: 'var(--error-color)',
            date: 'Actualizado: Hoy'
        },
        {
            id: 3,
            title: 'Proyección de Ingresos',
            description: 'Estimación de cobros de capital e intereses para el próximo mes.',
            icon: PieChart,
            color: 'var(--accent-violet)',
            date: 'Proyección: Feb 2026'
        },
        {
            id: 4,
            title: 'Cierre Mensual',
            description: 'Balance general de operaciones y rendimiento financiero.',
            icon: Calendar,
            color: 'var(--accent-pink)',
            date: 'Periodo: Ene 2026'
        }
    ];

    return (
        <div className="reports-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Reportes</h1>
                    <p className="page-subtitle">Análisis financiero y exportación de datos</p>
                </div>
                <div className="header-actions">
                    <Button className="btn-secondary">
                        <Calendar size={18} style={{ marginRight: '8px' }} />
                        Filtrar por Fecha
                    </Button>
                </div>
            </div>

            {/* Featured Stats for Reports */}
            <div className="reports-stats-grid">
                <div className="report-stat-card">
                    <div className="stat-icon-wrapper" style={{ background: 'rgba(198, 255, 0, 0.1)', color: 'var(--accent-primary)' }}>
                        <FileText size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Reportes Generados</span>
                        <span className="stat-value">24</span>
                        <span className="stat-sub">Este mes</span>
                    </div>
                </div>
                <div className="report-stat-card">
                    <div className="stat-icon-wrapper" style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--accent-cyan)' }}>
                        <Download size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Descargas</span>
                        <span className="stat-value">156</span>
                        <span className="stat-sub">Total histórico</span>
                    </div>
                </div>
            </div>

            <h2 className="section-title" style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>Documentos Disponibles</h2>

            <div className="reports-grid">
                {reportTypes.map((report) => (
                    <div key={report.id} className="report-card">
                        <div className="report-header">
                            <div className="report-icon" style={{ color: report.color, borderColor: report.color }}>
                                <report.icon size={24} />
                            </div>
                            <span className="report-date">{report.date}</span>
                        </div>
                        <h3 className="report-title">{report.title}</h3>
                        <p className="report-desc">{report.description}</p>
                        <div className="report-actions">
                            <Button className="btn-ghost" style={{ width: '100%', justifyContent: 'space-between' }}>
                                Vista Previa
                            </Button>
                            <Button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                                <Download size={18} style={{ marginRight: '8px' }} />
                                Exportar PDF
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Reports;
