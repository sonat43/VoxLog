import React from 'react';

const Logo = ({ size = 'medium', showText = true, className = '' }) => {
    const dimensions = {
        small: { icon: 24, text: '1rem' },
        medium: { icon: 32, text: '1.25rem' },
        large: { icon: 40, text: '1.5rem' },
    }[size] || { icon: 32, text: '1.25rem' };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} className={className}>
            {/* Custom SVG Icon taking inspiration from the user's uploaded mockup */}
            <svg 
                width={dimensions.icon} 
                height={dimensions.icon} 
                viewBox="0 0 100 100" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ flexShrink: 0 }}
            >
                {/* Left Triangle - Cyan */}
                <path d="M10 20 L50 90 L50 20 Z" fill="url(#cyan-grad)" />
                {/* Right Triangle - Purple */}
                <path d="M90 20 L50 90 L50 20 Z" fill="url(#purple-grad)" />

                {/* Lighting Bolt (Zap) in the middle */}
                <path 
                    d="M 58 10 L 35 55 L 50 55 L 42 90 L 65 45 L 50 45 Z" 
                    fill="url(#yellow-grad)" 
                    stroke="#ffffff" 
                    strokeWidth="2" 
                    strokeLinejoin="round" 
                />

                <defs>
                    <linearGradient id="cyan-grad" x1="10" y1="20" x2="50" y2="90" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                    <linearGradient id="purple-grad" x1="90" y1="20" x2="50" y2="90" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#c084fc" />
                        <stop offset="100%" stopColor="#9333ea" />
                    </linearGradient>
                    <linearGradient id="yellow-grad" x1="58" y1="10" x2="42" y2="90" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="50%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#ca8a04" />
                    </linearGradient>
                </defs>
            </svg>

            {showText && (
                <span style={{
                    fontWeight: '800',
                    fontSize: dimensions.text,
                    color: 'white',
                    letterSpacing: '-0.02em',
                    fontFamily: 'serif',
                    lineHeight: 1
                }}>
                    VoxLog
                </span>
            )}
        </div>
    );
};

export default Logo;
