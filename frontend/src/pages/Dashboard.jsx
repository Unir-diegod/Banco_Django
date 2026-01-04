import React, { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CreditCard, FileText, Users, Activity } from 'lucide-react'
import { Button } from '../components/ui/BaseComponents'
import { useNavigate } from 'react-router-dom'
import { fetchClients } from '../services/clients'
import { fetchLoans } from '../services/loans'
import './Dashboard.css'

const formatCurrency = (amountString, currency) => {
  const amount = Number(amountString)
  if (!Number.isFinite(amount)) return `${amountString} ${currency}`
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency || 'USD'}`
  }
}

const formatLongDate = (date) => {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date)
  } catch {
    return date.toDateString()
  }
}

const Dashboard = () => {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loans, setLoans] = useState([])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [clientsData, loansData] = await Promise.all([fetchClients(), fetchLoans()])
        if (cancelled) return
        setClients(clientsData)
        setLoans(loansData)
      } catch (error) {
        console.error(error)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const totals = {
      totalLoans: loans.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      totalPrincipal: 0,
      delinquentClients: 0,
    }

    for (const loan of loans) {
      if (loan.status === 'pending') totals.pending += 1
      if (loan.status === 'approved') totals.approved += 1
      if (loan.status === 'rejected') totals.rejected += 1

      const principal = Number(loan.principal_amount)
      if (Number.isFinite(principal)) totals.totalPrincipal += principal
    }

    for (const client of clients) {
      if (client.is_delinquent) totals.delinquentClients += 1
    }

    return totals
  }, [clients, loans])

  const recentLoans = useMemo(() => loans.slice(0, 6), [loans])

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hola, Administrador</h1>
          <p className="page-subtitle">Aquí tienes el resumen financiero de hoy, {formatLongDate(new Date())}</p>
        </div>
        <div className="header-actions">
          <Button onClick={() => navigate('/loans')} className="btn-primary">
            Nuevo Préstamo <ArrowUpRight size={18} style={{ marginLeft: '8px' }} />
          </Button>
        </div>
      </div>

      <div className="bento-grid">
        {/* Main Stats Card - Large */}
        <div className="bento-card card-main-stats">
          <div className="card-content">
            <div className="stat-label">Capital Total Colocado</div>
            <div className="stat-value-lg text-gradient">{formatCurrency(String(stats.totalPrincipal), 'USD')}</div>
            <div className="stat-trend positive">
              <Activity size={16} />
              <span>+12.5% vs mes anterior</span>
            </div>
          </div>
          <div className="card-decoration">
            <div className="chart-placeholder"></div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="bento-card card-stat-1">
          <div className="kpi-header">
            <div className="kpi-icon icon-cyan"><Users size={24} /></div>
            <span className="kpi-label">Clientes Activos</span>
          </div>
          <div className="kpi-value">{clients.length}</div>
          <div className="kpi-meta">
            {stats.delinquentClients > 0 ? (
              <span style={{ color: 'var(--error-color)' }}>{stats.delinquentClients} en mora</span>
            ) : (
              <span className="text-neon">Sin morosidad</span>
            )}
          </div>
        </div>

        <div className="bento-card card-stat-2">
          <div className="kpi-header">
            <div className="kpi-icon icon-pink"><CreditCard size={24} /></div>
            <span className="kpi-label">Préstamos Totales</span>
          </div>
          <div className="kpi-value">{stats.totalLoans}</div>
          <div className="kpi-meta">
            <span className="text-neon">{stats.pending} pendientes</span>
          </div>
        </div>

        <div className="bento-card card-stat-3">
          <div className="kpi-header">
            <div className="kpi-icon icon-violet"><Activity size={24} /></div>
            <span className="kpi-label">Tasa Aprobación</span>
          </div>
          <div className="kpi-value">
            {stats.totalLoans > 0 
              ? `${Math.round((stats.approved / stats.totalLoans) * 100)}%` 
              : '0%'}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${stats.totalLoans > 0 ? (stats.approved / stats.totalLoans) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Recent Activity - Wide */}
        <div className="bento-card card-recent">
          <div className="section-header">
            <h2 className="section-title">Actividad Reciente</h2>
            <Button variant="ghost" onClick={() => navigate('/loans')}>Ver todo</Button>
          </div>

          <div className="recent-table">
            <div className="recent-header">
              <div>ID Préstamo</div>
              <div>Cliente</div>
              <div>Monto</div>
              <div>Estado</div>
            </div>

            {recentLoans.length === 0 && (
              <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p>No hay actividad reciente para mostrar</p>
              </div>
            )}

            {recentLoans.map((loan) => (
              <div key={loan.loan_id} className="recent-row">
                <div className="mono" style={{ color: 'var(--accent-primary)' }}>#{loan.loan_id.substring(0, 8)}...</div>
                <div className="client-info">
                  <span className="client-name">Cliente {loan.client_id}</span>
                </div>
                <div className="amount">{formatCurrency(loan.principal_amount, loan.currency)}</div>
                <div>
                  <span className={`status-pill status-${loan.status}`}>{loan.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
