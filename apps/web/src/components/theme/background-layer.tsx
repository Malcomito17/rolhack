'use client'

import { useMemo } from 'react'
import type { ThemeDefinition } from '@/lib/theme'

interface BackgroundLayerProps {
  theme: Partial<ThemeDefinition>
  className?: string
}

/**
 * Renders the background layer with optional image, overlay, and pattern
 * Optimized for performance - uses CSS only, no JS animations here
 */
export function BackgroundLayer({ theme, className = '' }: BackgroundLayerProps) {
  const {
    background = '#000000',
    backgroundImage,
    backgroundOverlay,
    backgroundPattern,
  } = theme

  // Generate pattern CSS
  const patternStyle = useMemo(() => {
    if (!backgroundPattern) return null

    switch (backgroundPattern) {
      case 'grid':
        return {
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }

      case 'dots':
        return {
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }

      case 'stone':
        // Stone/brick texture pattern for medieval theme
        return {
          backgroundImage: `
            linear-gradient(90deg, transparent 0%, transparent 48%, rgba(139,90,43,0.15) 49%, rgba(139,90,43,0.15) 51%, transparent 52%, transparent 100%),
            linear-gradient(0deg, transparent 0%, transparent 48%, rgba(101,67,33,0.12) 49%, rgba(101,67,33,0.12) 51%, transparent 52%, transparent 100%),
            radial-gradient(ellipse 40% 30% at 25% 25%, rgba(139,90,43,0.08) 0%, transparent 70%),
            radial-gradient(ellipse 35% 25% at 75% 75%, rgba(101,67,33,0.06) 0%, transparent 70%),
            radial-gradient(ellipse 30% 20% at 60% 40%, rgba(139,90,43,0.05) 0%, transparent 60%),
            radial-gradient(ellipse 25% 35% at 30% 70%, rgba(80,50,20,0.07) 0%, transparent 60%)
          `,
          backgroundSize: '120px 60px, 120px 60px, 100% 100%, 100% 100%, 100% 100%, 100% 100%',
        }

      case 'eldritch':
        // Eldritch/tentacle pattern for Cthulhu theme
        return {
          backgroundImage: `
            radial-gradient(ellipse 100% 100% at 50% 50%, rgba(74,0,128,0.2) 0%, transparent 70%),
            radial-gradient(ellipse 60% 80% at 10% 90%, rgba(26,74,46,0.15) 0%, transparent 50%),
            radial-gradient(ellipse 80% 60% at 90% 10%, rgba(74,0,128,0.12) 0%, transparent 50%),
            radial-gradient(ellipse 40% 60% at 30% 20%, rgba(0,255,136,0.03) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 70% 80%, rgba(74,0,128,0.08) 0%, transparent 50%),
            repeating-linear-gradient(45deg, transparent 0px, transparent 40px, rgba(74,0,128,0.02) 40px, rgba(74,0,128,0.02) 80px),
            repeating-linear-gradient(-45deg, transparent 0px, transparent 40px, rgba(26,74,46,0.02) 40px, rgba(26,74,46,0.02) 80px)
          `,
        }

      case 'hex-grid':
        return {
          backgroundImage: `
            linear-gradient(30deg, transparent 49%, rgba(255,171,0,0.1) 50%, transparent 51%),
            linear-gradient(150deg, transparent 49%, rgba(255,171,0,0.1) 50%, transparent 51%),
            linear-gradient(270deg, transparent 49%, rgba(255,171,0,0.1) 50%, transparent 51%)
          `,
          backgroundSize: '60px 35px',
        }

      case 'matrix-rain':
        // Just the base - actual animation is in themed-effects
        return {
          backgroundImage: `linear-gradient(180deg, transparent 0%, rgba(0,255,0,0.02) 50%, transparent 100%)`,
        }

      default:
        return null
    }
  }, [backgroundPattern])

  return (
    <>
      {/* Base background color */}
      <div
        className={`absolute inset-0 ${className}`}
        style={{ backgroundColor: background }}
      />

      {/* Background image (if provided) */}
      {backgroundImage && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}

      {/* Overlay (darkening layer over image) */}
      {backgroundOverlay && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: backgroundOverlay }}
        />
      )}

      {/* Pattern overlay */}
      {patternStyle && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={patternStyle}
        />
      )}

      {/* Vignette effect (optional, enabled for some themes) */}
      {backgroundImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
          }}
        />
      )}
    </>
  )
}
