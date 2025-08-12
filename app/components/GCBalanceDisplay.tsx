import React from 'react'
import { useGCBalance } from '../contexts/GCBalanceContext'

interface GCBalanceDisplayProps {
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const GCBalanceDisplay: React.FC<GCBalanceDisplayProps> = ({ 
  showLabel = true, 
  size = 'md',
  className = ''
}) => {
  const { balance, isLoading } = useGCBalance()

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showLabel && (
        <span className="text-gray-400 text-sm">Balance:</span>
      )}
      {isLoading ? (
        <div className={`font-bold text-yellow-400 animate-pulse ${sizeClasses[size]}`}>
          ...
        </div>
      ) : (
        <div className={`font-bold text-yellow-400 ${sizeClasses[size]}`}>
          {balance.toLocaleString()} GC
        </div>
      )}
    </div>
  )
} 