import React, { useEffect, useMemo, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  RadialBarChart, RadialBar,
  PieChart, Pie, Cell,
  ComposedChart
} from 'recharts';
import { 
  ArrowUpRight, Calendar, Clock, TrendingUp, TrendingDown, DollarSign,
  Users, FileText, CheckCircle, AlertCircle, Clock as ClockIcon
} from 'lucide-react';
import { Button } from '../components/ui/BaseComponents';
import { fetchDashboardAnalytics } from '../services/analytics';
import './Dashboard.css';

const MONTHS_ES_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_ES_FULL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function monthLabelFromISO(monthValue) {
  if (!monthValue) return '';
  if (typeof monthValue === 'number') return String(monthValue);

  // Soporta: YYYY-MM, YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss...
  const match = String(monthValue).match(/^(\d{4})-(\d{2})/);
  if (match) {
    const monthNum = Number(match[2]);
    if (monthNum >= 1 && monthNum <= 12) return MONTHS_ES_SHORT[monthNum - 1];
  }

  // Fallback: intenta Date, pero sin romper render.
  const dt = new Date(String(monthValue));
  if (!Number.isNaN(dt.getTime())) {
    try {
      return dt.toLocaleString('es-CO', { month: 'short' }).replace('.', '');
    } catch {
      return '';
    }
  }
  return '';
}

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Actualizar hora cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchDashboardAnalytics();
        if (mounted) {
          setAnalytics(data);
          setAnalyticsError(null);
        }
      } catch (e) {
        if (mounted) {
          setAnalyticsError(e);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const COLORS = [
    'var(--accent-primary)',
    'var(--accent-cyan)',
    'var(--accent-violet)',
    'var(--accent-yellow)',
  ];

  const currencyCOP = useMemo(() => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    });
  }, []);

  const loanPerformanceData = useMemo(() => {
    const rows = analytics?.series?.loans_by_month ?? [];
    if (!rows.length) return [];
    return rows.map((r) => {
      const label = monthLabelFromISO(r.month);
      return {
        name: label,
        solicitudes: r.solicitudes,
        aprobados: r.aprobados,
      };
    });
  }, [analytics]);

  const loanStatusData = useMemo(() => {
    const byStatus = analytics?.distributions?.loans_by_status ?? {};
    const order = [
      { key: 'approved', label: 'Aprobados' },
      { key: 'pending', label: 'Pendientes' },
      { key: 'rejected', label: 'Rechazados' },
      { key: 'cancelled', label: 'Cancelados' },
    ];
    return order
      .map((o) => ({ name: o.label, value: Number(byStatus[o.key] ?? 0) }))
      .filter((x) => x.value > 0);
  }, [analytics]);

  const statusBreakdown = useMemo(() => {
    const total = Number(analytics?.totals?.loans ?? 0);
    const byStatus = analytics?.distributions?.loans_by_status ?? {};
    const rows = [
      { key: 'approved', label: 'Aprobados', color: 'var(--success-color)', value: Number(byStatus.approved ?? 0) },
      { key: 'pending', label: 'Pendientes', color: 'var(--accent-yellow)', value: Number(byStatus.pending ?? 0) },
      { key: 'rejected', label: 'Rechazados', color: 'var(--error-color)', value: Number(byStatus.rejected ?? 0) },
      { key: 'cancelled', label: 'Cancelados', color: 'var(--text-muted)', value: Number(byStatus.cancelled ?? 0) },
    ];
    return rows.map((r) => ({
      ...r,
      pct: total > 0 ? (r.value / total) * 100 : 0,
    }));
  }, [analytics]);

  const approvalRateSeries = useMemo(() => {
    const rows = analytics?.series?.loans_by_month ?? [];
    if (!rows.length) return [];
    return rows.map((r) => {
      const label = monthLabelFromISO(r.month);
      const solicitudes = Number(r.solicitudes ?? 0);
      const aprobados = Number(r.aprobados ?? 0);
      const ratio = solicitudes > 0 ? (aprobados / solicitudes) * 100 : 0;
      return {
        name: label,
        ratio,
      };
    });
  }, [analytics]);

  const monthlyBars = useMemo(() => {
    const rows = analytics?.series?.loans_by_month ?? [];
    if (!rows.length) return [];
    return rows.map((r) => {
      const label = monthLabelFromISO(r.month);
      return {
        name: label,
        solicitudes: Number(r.solicitudes ?? 0),
        aprobados: Number(r.aprobados ?? 0),
      };
    });
  }, [analytics]);

  const totalLoans = Number(analytics?.totals?.loans ?? 0);
  const approvedLoans = Number(analytics?.distributions?.loans_by_status?.approved ?? 0);
  const approvalRate = totalLoans > 0 ? (approvedLoans / totalLoans) * 100 : 0;
  const principalSum = Number(analytics?.totals?.principal_sum ?? 0);
  const delinquentRate = Number(analytics?.totals?.delinquent_rate ?? 0) * 100;
  const delinquencyGauge = useMemo(() => [{ name: 'Mora', value: Math.max(0, Math.min(100, delinquentRate)) }], [delinquentRate]);

  const riskScore = useMemo(() => {
    const score = Math.round(100 - Math.max(0, Math.min(100, delinquentRate)));
    return Math.max(0, Math.min(100, score));
  }, [delinquentRate]);

  const recentActivity = [
    { id: 1, client: 'Juan Pérez', type: 'Personal', amount: '$5,000', status: 'approved', date: 'Hoy, 12:30' },
    { id: 2, client: 'Maria Garcia', type: 'Hipotecario', amount: '$150,000', status: 'pending', date: 'Hoy, 11:15' },
    { id: 3, client: 'Tech Solutions SA', type: 'Empresarial', amount: '$50,000', status: 'approved', date: 'Ayer, 16:45' },
    { id: 4, client: 'Carlos Ruiz', type: 'Automotriz', amount: '$25,000', status: 'rejected', date: 'Ayer, 09:20' },
  ];

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const formatDate = (date) => {
    const day = DAYS_ES[date.getDay()];
    const dayNum = date.getDate();
    const month = MONTHS_ES_FULL[date.getMonth()];
    const year = date.getFullYear();
    return `${day}, ${dayNum} de ${month} de ${year}`;
  };

  return (
    <div className="dashboard-page">
      <div className="page-header-modern">
        <div className="header-left">
          <div className="header-greeting">
            <h1 className="page-title-large">Dashboard</h1>
            <p className="page-subtitle-modern">Resumen de operaciones y métricas clave</p>
          </div>
        </div>
        <div className="header-right-modern">
          <div className="datetime-display">
            <div className="date-display">
              <Calendar size={18} />
              <span>{formatDate(currentTime)}</span>
            </div>
            <div className="time-display">
              <Clock size={18} />
              <span className="time-value">{formatTime(currentTime)}</span>
            </div>
          </div>
          <Button className="btn-primary-modern" type="button">
            <Calendar size={18} style={{ marginRight: '8px' }} />
            Este mes
          </Button>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Hero Panel - GIGANTE estilo Apple/Notion */}
        <div className="glass-panel hero-panel">
          {/* Sección Superior: Título + KPI Principal */}
          <div className="hero-left">
            <div className="hero-head">
              <div className="hero-eyebrow">RENDIMIENTO DE CARTERA</div>
              <div className="hero-title">Gestión Financiera</div>
            </div>

            <div className="hero-kpi">
              <div className="hero-kpi-label">CAPITAL TOTAL EN CIRCULACIÓN</div>
              <div className="hero-kpi-value">{analytics ? currencyCOP.format(principalSum) : '—'}</div>
              <div className="hero-kpi-trend">
                <span className="trend-pill">
                  <ArrowUpRight size={20} />
                  {analytics ? `${approvalRate.toFixed(0)}% tasa de aprobación` : 'Cargando…'}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid Horizontales */}
          <div className="hero-mini-grid">
            <MiniTile label="Préstamos activos" value={analytics ? String(totalLoans) : '—'} tone="primary" />
            <MiniTile label="Clientes totales" value={analytics ? String(analytics.totals?.clients ?? 0) : '—'} tone="cyan" />
            <MiniTile label="Aprobados" value={analytics ? String(approvedLoans) : '—'} tone="success" />
            <MiniTile label="En mora" value={analytics ? String(analytics.totals?.delinquent_clients ?? 0) : '—'} tone="danger" />
          </div>

          {/* Breakdown Horizontal Inline */}
          <div className="hero-breakdown">
            <div className="hero-breakdown-title">Distribución</div>
            <div className="breakdown-list">
              {statusBreakdown.map((s) => (
                <div className="breakdown-row" key={s.key}>
                  <span className="breakdown-dot" style={{ background: s.color }}></span>
                  <span className="breakdown-label">{s.label}</span>
                  <div className="breakdown-right">
                    <span className="breakdown-pct">{analytics ? `${Math.round(s.pct)}%` : '—'}</span>
                    <span className="breakdown-val">({analytics ? s.value : '—'})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Volumen Mensual - MEJORADO */}
        <div className="glass-panel bar-chart-section">
          <div className="chart-header-enhanced">
            <div>
              <h3>Volumen de Solicitudes Mensual</h3>
              <p className="chart-subtitle">Comparativa de solicitudes recibidas vs. aprobadas</p>
            </div>
            <div className="chart-legend">
              <div className="legend-item"><span className="dot" style={{background: 'var(--accent-primary)'}}></span>Solicitudes</div>
              <div className="legend-item"><span className="dot" style={{background: 'var(--accent-cyan)'}}></span>Aprobados</div>
            </div>
          </div>
          <div style={{ height: '340px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyBars} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="barGradient1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border-color)" strokeOpacity={0.3} strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 600}} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'var(--text-secondary)', fontSize: 12}} 
                  width={40}
                />
                <Tooltip
                  cursor={{fill: 'rgba(79, 70, 229, 0.05)'}}
                  contentStyle={{
                    backgroundColor: 'var(--surface-color)',
                    borderRadius: '16px',
                    border: '2px solid var(--border-color)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    color: 'var(--text-primary)',
                    padding: '12px 16px'
                  }}
                  labelStyle={{fontWeight: 700, marginBottom: '8px', fontSize: '14px'}}
                />
                <Bar dataKey="solicitudes" fill="url(#barGradient1)" radius={[12, 12, 0, 0]} maxBarSize={60} />
                <Bar dataKey="aprobados" fill="url(#barGradient2)" radius={[12, 12, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer">
            <div className="chart-stat">
              <span className="stat-label">Total Solicitudes</span>
              <span className="stat-value">{analytics ? monthlyBars.reduce((a,b) => a + b.solicitudes, 0) : '—'}</span>
            </div>
            <div className="chart-stat">
              <span className="stat-label">Total Aprobados</span>
              <span className="stat-value success">{analytics ? monthlyBars.reduce((a,b) => a + b.aprobados, 0) : '—'}</span>
            </div>
            <div className="chart-stat">
              <span className="stat-label">Tasa Promedio</span>
              <span className="stat-value">{analytics ? `${approvalRate.toFixed(1)}%` : '—'}</span>
            </div>
          </div>
        </div>

        {/* Tasa de Aprobación - MEJORADO */}
        <div className="glass-panel line-chart-section">
          <div className="chart-header-enhanced">
            <div>
              <h3>Tasa de Aprobación</h3>
              <p className="chart-subtitle">Evolución mensual del % de aprobación</p>
            </div>
            <div className="kpi-chip-large">{analytics ? `${approvalRate.toFixed(1)}%` : '—'}</div>
          </div>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={approvalRateSeries} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRatio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-violet)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--accent-violet)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border-color)" strokeOpacity={0.3} strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 600}} 
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'var(--text-secondary)', fontSize: 12}} 
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Tasa']}
                  contentStyle={{
                    backgroundColor: 'var(--surface-color)',
                    borderRadius: '16px',
                    border: '2px solid var(--border-color)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    color: 'var(--text-primary)',
                    padding: '12px 16px'
                  }}
                  labelStyle={{fontWeight: 700, marginBottom: '8px'}}
                />
                <Area 
                  type="monotone" 
                  dataKey="ratio" 
                  stroke="var(--accent-violet)" 
                  strokeWidth={3} 
                  fill="url(#colorRatio)"
                  dot={{r: 5, fill: 'var(--accent-violet)', strokeWidth: 2, stroke: 'var(--surface-color)'}}
                  activeDot={{r: 7}}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer">
            <div className="chart-stat">
              <span className="stat-label">Promedio</span>
              <span className="stat-value">{analytics ? `${approvalRate.toFixed(1)}%` : '—'}</span>
            </div>
            <div className="chart-stat">
              <span className="stat-label">Tendencia</span>
              <span className="stat-value success">↗ Positiva</span>
            </div>
          </div>
        </div>

        {/* Mora - Gauge (compacto) */}
        <div className="glass-panel gauge-card">
          <div className="chart-header">
            <h3>Riesgo / Mora</h3>
            <div className="kpi-chip">{analytics ? `${Math.round(delinquentRate)}%` : '—'}</div>
          </div>
          <div className="gauge-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="55%"
                innerRadius="70%"
                outerRadius="100%"
                barSize={12}
                data={delinquencyGauge}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar background dataKey="value" cornerRadius={8} fill="var(--accent-primary)" />
                <Tooltip />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="gauge-center">
              <div className="gauge-value">{analytics ? `${riskScore}/100` : '—'}</div>
              <div className="gauge-label">health score</div>
            </div>
          </div>
        </div>

        {/* Nuevas Métricas - Tarjetas de KPI */}
        <div className="glass-panel kpi-card">
          <div className="kpi-icon-wrapper" style={{background: 'var(--accent-primary-10)'}}>
            <DollarSign size={24} color="var(--accent-primary)" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Total Recaudado</div>
            <div className="kpi-value">{analytics ? currencyCOP.format(Number(analytics.totals?.total_paid_amount ?? 0)) : '—'}</div>
            <div className="kpi-meta">{analytics ? `${analytics.totals?.total_payments ?? 0} pagos realizados` : '—'}</div>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-wrapper" style={{background: 'var(--success-bg)'}}>
            <CheckCircle size={24} color="var(--success-color)" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Cuotas Pagadas</div>
            <div className="kpi-value">{analytics ? analytics.totals?.paid_installments ?? 0 : '—'}</div>
            <div className="kpi-meta">
              {analytics ? `${analytics.totals?.pending_installments ?? 0} pendientes` : '—'}
            </div>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-wrapper" style={{background: 'var(--warning-bg)'}}>
            <ClockIcon size={24} color="var(--warning-color)" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Cuotas Vencidas</div>
            <div className="kpi-value">{analytics ? analytics.totals?.overdue_installments ?? 0 : '—'}</div>
            <div className="kpi-meta">
              {analytics ? `${analytics.totals?.late_installments ?? 0} atrasadas` : '—'}
            </div>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-wrapper" style={{background: 'var(--accent-cyan-10)'}}>
            <Users size={24} color="var(--accent-cyan)" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Clientes Activos</div>
            <div className="kpi-value">{analytics ? analytics.totals?.active_clients ?? 0 : '—'}</div>
            <div className="kpi-meta">
              {analytics ? `${analytics.totals?.clients_with_multiple_loans ?? 0} con múltiples préstamos` : '—'}
            </div>
          </div>
        </div>

        {/* Nueva Gráfica: Evolución de Pagos */}
        <div className="glass-panel payments-chart-section">
          <div className="chart-header-enhanced">
            <div>
              <h3>Evolución de Pagos Mensuales</h3>
              <p className="chart-subtitle">Cantidad y monto total de pagos recibidos por mes</p>
            </div>
          </div>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={analytics?.series?.payments_by_month ?? []} 
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="paymentAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border-color)" strokeOpacity={0.3} strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 600}}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('es', { month: 'short' });
                  }}
                />
                <YAxis 
                  yAxisId="left"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'var(--text-secondary)', fontSize: 12}} 
                  label={{ value: 'Cantidad', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)' }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'var(--text-secondary)', fontSize: 12}}
                  tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-color)',
                    borderRadius: '16px',
                    border: '2px solid var(--border-color)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    color: 'var(--text-primary)',
                    padding: '12px 16px'
                  }}
                  formatter={(value, name) => {
                    if (name === 'total') return [value, 'Cantidad de Pagos'];
                    if (name === 'amount') return [currencyCOP.format(Number(value)), 'Monto Total'];
                    return [value, name];
                  }}
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('es', { month: 'long', year: 'numeric' });
                  }}
                />
                <Bar 
                  yAxisId="left"
                  dataKey="total" 
                  fill="var(--accent-primary)" 
                  radius={[8, 8, 0, 0]} 
                  maxBarSize={40}
                />
                <Area 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="amount" 
                  stroke="var(--accent-cyan)" 
                  strokeWidth={3} 
                  fill="url(#paymentAreaGradient)"
                  dot={{r: 4, fill: 'var(--accent-cyan)', strokeWidth: 2, stroke: 'var(--surface-color)'}}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer">
            <div className="chart-stat">
              <span className="stat-label">Total Pagos</span>
              <span className="stat-value">{analytics?.totals?.total_payments ?? 0}</span>
            </div>
            <div className="chart-stat">
              <span className="stat-label">Monto Acumulado</span>
              <span className="stat-value success">{analytics ? currencyCOP.format(Number(analytics.totals?.total_paid_amount ?? 0)) : '—'}</span>
            </div>
            <div className="chart-stat">
              <span className="stat-label">Promedio/Pago</span>
              <span className="stat-value">
                {analytics && analytics.totals?.total_payments ? 
                  currencyCOP.format(Number(analytics.totals?.total_paid_amount ?? 0) / analytics.totals.total_payments) 
                  : '—'
                }
              </span>
            </div>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-wrapper" style={{background: 'var(--success-bg)'}}>
            <CheckCircle size={24} color="var(--success-color)" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Cuotas Pagadas</div>
            <div className="kpi-value">{analytics ? analytics.totals?.paid_installments ?? 0 : '—'}</div>
            <div className="kpi-meta">
              {analytics ? `${analytics.totals?.pending_installments ?? 0} pendientes` : '—'}
            </div>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-wrapper" style={{background: 'var(--warning-bg)'}}>
            <ClockIcon size={24} color="var(--warning-color)" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Cuotas Vencidas</div>
            <div className="kpi-value">{analytics ? analytics.totals?.overdue_installments ?? 0 : '—'}</div>
            <div className="kpi-meta">
              {analytics ? `${analytics.totals?.late_installments ?? 0} atrasadas` : '—'}
            </div>
          </div>
        </div>

        <div className="glass-panel kpi-card">
          <div className="kpi-icon-wrapper" style={{background: 'var(--accent-cyan-10)'}}>
            <Users size={24} color="var(--accent-cyan)" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Clientes Activos</div>
            <div className="kpi-value">{analytics ? analytics.totals?.active_clients ?? 0 : '—'}</div>
            <div className="kpi-meta">
              {analytics ? `${analytics.totals?.clients_with_multiple_loans ?? 0} con múltiples préstamos` : '—'}
            </div>
          </div>
        </div>

        {/* Top Clientes */}
        <div className="glass-panel top-clients-section">
          <div className="chart-header">
            <h3>Top Clientes</h3>
            <span className="chart-subtitle">Por monto total prestado</span>
          </div>
          <div className="top-clients-list">
            {analytics?.top_clients && analytics.top_clients.length > 0 ? (
              analytics.top_clients.map((client, idx) => (
                <div key={client.client_id} className="top-client-item">
                  <div className="client-rank">#{idx + 1}</div>
                  <div className="client-info">
                    <div className="client-name">{client.username}</div>
                    <div className="client-loans">{client.loan_count} préstamo{client.loan_count > 1 ? 's' : ''}</div>
                  </div>
                  <div className="client-amount">{currencyCOP.format(Number(client.total_amount))}</div>
                </div>
              ))
            ) : (
              <div className="empty-state">No hay datos disponibles</div>
            )}
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="glass-panel activity-section">
          <div className="chart-header">
            <h3>Actividad Reciente</h3>
            <button className="btn-text">Ver todo</button>
          </div>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Tipo de Préstamo</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{fontWeight: 600, color: 'var(--text-primary)'}}>{item.client}</div>
                  </td>
                  <td>{item.type}</td>
                  <td style={{fontFamily: 'monospace', fontSize: '1rem'}}>{item.amount}</td>
                  <td>{item.date}</td>
                  <td>
                    <span className={`status-chip ${item.status}`}>
                      {item.status === 'approved' ? 'Aprobado' : item.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MiniTile = ({ label, value, tone }) => (
  <div className={`mini-tile ${tone}`}>
    <div className="mini-label">{label}</div>
    <div className="mini-value">{value}</div>
  </div>
);

export default Dashboard;
