import React from 'react'
import type { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  className?: string
}

// Light button component (bg: #cae9ff)
export function LightButton({ children, onClick, type = 'button', disabled = false, className = '' }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-light ${className}`}
    >
      {children}
    </button>
  )
}

// Medium button component (bg: #5fa8d3)
export function MediumButton({ children, onClick, type = 'button', disabled = false, className = '' }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-medium ${className}`}
    >
      {children}
    </button>
  )
}

// Dark button component (bg: #2C2C2C)
export function DarkButton({ children, onClick, type = 'button', disabled = false, className = '' }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-dark ${className}`}
    >
      {children}
    </button>
  )
}

// Gold button component (bg: #FFD700)
export function GoldButton({ children, onClick, type = 'button', disabled = false, className = '' }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-gold ${className}`}
    >
      {children}
    </button>
  )
}

// Accent button component (bg: #E63946)
export function AccentButton({ children, onClick, type = 'button', disabled = false, className = '' }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-accent ${className}`}
    >
      {children}
    </button>
  )
} 