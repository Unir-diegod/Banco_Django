import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Users, CreditCard, Activity, 
  ArrowUpRight, ArrowDownRight, DollarSign, Calendar 
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  // Mock Data for Charts
  const loanPerformanceData = [
    { name: 'Ene', solicitudes: 4000, aprobados: 2400 },
    { name: 'Feb', solicitudes: 3000, aprobados: 1398 },
    { name: 'Mar', solicitudes: 2000, aprobados: 9800 },
    { name: 'Abr', solicitudes: 2780, aprobados: 3908 },
    { name: 'May', solicitudes: 1890, aprobados: 4800 },
    { name: 'Jun', solicitudes: 2390, aprobados: 3800 },
    { name: 'Jul', solicitudes: 3490, aprobados: 4300 },
  ];

  const loanTypeData = [
    { name: 'Personal', value: 400 },
    { name: 'Hipotecario', value: 300 },
    { name: 'Automotriz', value: 300 },
    { name: 'Empresarial', value: 200 },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];

  const recentActivity = [
    { id: 1, client: 'Juan Pérez', type: 'Personal', amount: '$5,000', status: 'approved', date: 'Hoy, 12:30' },
    { id: 2, client: 'Maria Garcia', type: 'Hipotecario', amount: '$150,000', status: 'pending', date: 'Hoy, 11:15' },
    { id: 3, client: 'Tech Solutions SA', type: 'Empresarial', amount: '$50,000', status: 'approved', date: 'Ayer, 16:45' },
    { id: 4, client: 'Carlos Ruiz', type: 'Automotriz', amount: '$25,000', status: 'rejected', date: 'Ayer, 09:20' },
  ];

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-title">
          <h1>Panel Financiero</h1>
          <p>Resumen de operaciones y métricas clave</p>
        </div>
        <div className="date-filter">
          <button className="btn-glass">
            <Calendar size={18} />
            <span>Este Mes</span>
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Stats Row */}
        <div className="stats-container">
          <StatCard 
            title="Préstamos Activos" 
            value="$2.4M" 
            trend="+12.5%" 
            icon={<CreditCard />} 
            color="blue" 
          />
          <StatCard 
            title="Nuevos Clientes" 
            value="843" 
            trend="+5.2%" 
            icon={<Users />} 
            color="green" 
          />
          <StatCard 
            title="Tasa de Aprobación" 
            value="68%" 
            trend="-2.1%" 
            isNegative 
            icon={<Activity />} 
            color="purple" 
          />
          <StatCard 
            title="Ingresos Totales" 
            value="$892k" 
            trend="+8.4%" 
            icon={<DollarSign />} 
            color="orange" 
          />
        </div>

        {/* Main Chart - Area */}
        <div className="glass-panel main-chart-section">
          <div className="chart-header">
            <h3>Tendencia de Solicitudes vs Aprobaciones</h3>
            <div className="chart-legend">
              <div className="legend-item"><span className="dot" style={{background: '#3b82f6'}}></span>Solicitudes</div>
              <div className="legend-item"><span className="dot" style={{background: '#10b981'}}></span>Aprobados</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={loanPerformanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorApr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
              <CartesianGrid vertical={false} stroke="#e5e7eb" strokeOpacity={0.3} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="solicitudes" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSol)" />
              <Area type="monotone" dataKey="aprobados" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorApr)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Secondary Chart - Pie */}
        <div className="glass-panel secondary-chart-section">
          <div className="chart-header">
            <h3>Distribución por Tipo</h3>
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={loanTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {loanTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
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

const StatCard = ({ title, value, trend, icon, color, isNegative }) => (
  <div className="stat-card-modern">
    <div className={`stat-icon-box ${color}`}>
      {icon}
    </div>
    <div className="stat-info">
      <h3>{title}</h3>
      <div className="value">{value}</div>
    </div>
    <div className="trend-indicator" style={{ 
      position: 'absolute', 
      top: '1.5rem', 
      right: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      color: isNegative ? 'var(--error-color)' : 'var(--success-color)',
      fontWeight: 600,
      fontSize: '0.9rem'
    }}>
      {isNegative ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
      {trend}
    </div>
  </div>
);

export default Dashboard;
