import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const KPICard = ({ title, value, icon: Icon, trend, trendLabel, color = "#14b8a6" }) => {
    const isPositive = trend >= 0;

    return (
        <div style={{
            background: 'rgba(31, 41, 55, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '1rem',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            transition: 'transform 0.2s',
            cursor: 'default'
        }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0, fontWeight: 500 }}>{title}</p>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.25rem 0 0 0', color: 'white' }}>{value}</h3>
                </div>
                <div style={{
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    backgroundColor: `${color}20`, // 20% opacity using hex
                    color: color
                }}>
                    <Icon size={24} />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                    color: isPositive ? '#34d399' : '#f87171',
                    fontWeight: 600
                }}>
                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{Math.abs(trend)}%</span>
                </div>
                <span style={{ color: '#6b7280' }}>{trendLabel || "vs last month"}</span>
            </div>
        </div>
    );
};

export default KPICard;
