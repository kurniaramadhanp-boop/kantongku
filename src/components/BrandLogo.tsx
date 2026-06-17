import React from 'react';
import logoImg from '../logo.png';

interface BrandLogoProps {
  className?: string;
  glow?: boolean;
}

export default function BrandLogo({ className = "w-24 h-24", glow = true }: BrandLogoProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer Glow Effect */}
      {glow && (
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
      )}
      
      <img 
        src={logoImg} 
        alt="KantongKu Logo" 
        className="w-full h-full object-contain relative"
        style={glow ? { filter: 'drop-shadow(0 0 12px rgba(78, 222, 163, 0.6))' } : {}}
      />
    </div>
  );
}
