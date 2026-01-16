'use client'

import type { ThemeEffects } from '@/lib/theme'

interface ThemedEffectsProps {
  effects: Partial<ThemeEffects>
  primaryColor?: string
}

/**
 * Renders visual effects as CSS-only overlays
 * All effects are pointer-events-none and purely decorative
 * Optimized for performance (CSS animations, no JS)
 */
export function ThemedEffects({ effects, primaryColor = '#00ff00' }: ThemedEffectsProps) {
  return (
    <>
      {/* ===== CYBER EFFECTS ===== */}

      {/* Scanlines */}
      {effects.scanlines && (
        <div
          className="absolute inset-0 pointer-events-none z-50 opacity-10"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              ${primaryColor}08 0px,
              ${primaryColor}08 1px,
              transparent 1px,
              transparent 2px
            )`,
          }}
        />
      )}

      {/* Glitch effect */}
      {effects.glitch && (
        <div className="absolute inset-0 pointer-events-none z-40 animate-glitch-effect" />
      )}

      {/* Flicker effect (applied via parent class typically) */}
      {effects.flicker && (
        <div className="absolute inset-0 pointer-events-none z-30 animate-flicker-overlay" />
      )}

      {/* Matrix rain */}
      {effects.matrixRain && (
        <div
          className="absolute inset-0 pointer-events-none z-0 animate-matrix-rain"
          style={{ '--rain-color': primaryColor } as React.CSSProperties}
        />
      )}

      {/* Warning pulse */}
      {effects.warningPulse && (
        <div
          className="absolute inset-0 pointer-events-none z-0 animate-warning-pulse"
          style={{ '--pulse-color': primaryColor } as React.CSSProperties}
        />
      )}

      {/* Radar sweep */}
      {effects.radarSweep && (
        <div
          className="absolute inset-0 pointer-events-none z-0 animate-radar-sweep"
          style={{ '--radar-color': primaryColor } as React.CSSProperties}
        />
      )}

      {/* Neon glow (subtle gradient) */}
      {effects.neonGlow && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: `radial-gradient(ellipse at center, ${primaryColor}08 0%, transparent 70%)`,
          }}
        />
      )}

      {/* CRT curve (via box-shadow/border-radius) */}
      {effects.crtCurve && (
        <div
          className="absolute inset-0 pointer-events-none z-50 rounded-[20px]"
          style={{
            boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)',
          }}
        />
      )}

      {/* ===== MEDIEVAL EFFECTS ===== */}

      {/* Dust particles */}
      {effects.dust && (
        <div className="absolute inset-0 pointer-events-none z-20 animate-dust-float">
          {/* Multiple dust layers for depth */}
          <div className="dust-particle dust-1" />
          <div className="dust-particle dust-2" />
          <div className="dust-particle dust-3" />
        </div>
      )}

      {/* Fire embers */}
      {effects.fireEmbers && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          <div className="ember ember-1" />
          <div className="ember ember-2" />
          <div className="ember ember-3" />
          <div className="ember ember-4" />
          <div className="ember ember-5" />
        </div>
      )}

      {/* Candle flicker (warm light variation) */}
      {effects.candleFlicker && (
        <div className="absolute inset-0 pointer-events-none z-10 animate-candle-flicker" />
      )}

      {/* Torch glow */}
      {effects.torchGlow && (
        <div
          className="absolute inset-0 pointer-events-none z-5"
          style={{
            background: `
              radial-gradient(ellipse 40% 30% at 10% 20%, rgba(255,147,41,0.15) 0%, transparent 70%),
              radial-gradient(ellipse 35% 25% at 90% 25%, rgba(255,147,41,0.12) 0%, transparent 70%),
              radial-gradient(ellipse 30% 20% at 50% 90%, rgba(255,147,41,0.08) 0%, transparent 60%)
            `,
          }}
        />
      )}

      {/* ===== HORROR/CTHULHU EFFECTS ===== */}

      {/* Fog effect */}
      {effects.fog && (
        <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
          <div className="fog-layer fog-1" />
          <div className="fog-layer fog-2" />
        </div>
      )}

      {/* Tentacle shadows at edges */}
      {effects.tentacles && (
        <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden">
          <div className="tentacle tentacle-left" />
          <div className="tentacle tentacle-right" />
          <div className="tentacle tentacle-bottom" />
        </div>
      )}

      {/* Eye blink (subtle) */}
      {effects.eyeBlink && (
        <div className="absolute inset-0 pointer-events-none z-30 animate-eye-blink" />
      )}

      {/* Whispers (visual distortion) */}
      {effects.whispers && (
        <div className="absolute inset-0 pointer-events-none z-20 animate-whispers" />
      )}

      {/* Edge corruption */}
      {effects.corruption && (
        <div className="absolute inset-0 pointer-events-none z-35">
          <div className="corruption-edge corruption-top" />
          <div className="corruption-edge corruption-bottom" />
          <div className="corruption-edge corruption-left" />
          <div className="corruption-edge corruption-right" />
        </div>
      )}

      {/* Inline styles for effects */}
      <style jsx>{`
        /* ===== CYBER ANIMATIONS ===== */

        @keyframes glitch-effect {
          0%, 100% { clip-path: inset(0 0 0 0); }
          20% { clip-path: inset(10% 0 60% 0); transform: translate(-2px); }
          40% { clip-path: inset(40% 0 40% 0); transform: translate(2px); }
          60% { clip-path: inset(70% 0 10% 0); transform: translate(-1px); }
          80% { clip-path: inset(20% 0 50% 0); transform: translate(1px); }
        }

        .animate-glitch-effect::before {
          content: '';
          position: absolute;
          inset: 0;
          background: inherit;
          animation: glitch-effect 2s infinite;
        }

        @keyframes flicker-overlay {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.02; }
          52% { opacity: 0.05; }
          54% { opacity: 0; }
        }

        .animate-flicker-overlay {
          background: white;
          animation: flicker-overlay 0.15s infinite;
        }

        .animate-matrix-rain {
          background: linear-gradient(180deg,
            transparent 0%,
            var(--rain-color, #00ff00)05 50%,
            transparent 100%
          );
          animation: rain 20s linear infinite;
        }

        @keyframes rain {
          0% { background-position: 0 -100vh; }
          100% { background-position: 0 100vh; }
        }

        @keyframes warning-pulse {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.1; }
        }

        .animate-warning-pulse {
          background: var(--pulse-color, #ffab00);
          animation: warning-pulse 2s ease-in-out infinite;
        }

        .animate-radar-sweep {
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            var(--radar-color, #00b4d8)20 30deg,
            transparent 60deg
          );
          animation: radar 4s linear infinite;
        }

        @keyframes radar {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* ===== MEDIEVAL ANIMATIONS ===== */

        .dust-particle {
          position: absolute;
          width: 100%;
          height: 100%;
          background-image: radial-gradient(2px 2px at 20% 30%, rgba(212,165,116,0.3) 50%, transparent 50%),
                           radial-gradient(1px 1px at 40% 70%, rgba(212,165,116,0.2) 50%, transparent 50%),
                           radial-gradient(2px 2px at 60% 20%, rgba(212,165,116,0.25) 50%, transparent 50%),
                           radial-gradient(1px 1px at 80% 60%, rgba(212,165,116,0.2) 50%, transparent 50%);
        }

        .dust-1 { animation: dust-float-1 15s ease-in-out infinite; }
        .dust-2 { animation: dust-float-2 20s ease-in-out infinite; }
        .dust-3 { animation: dust-float-3 25s ease-in-out infinite; }

        @keyframes dust-float-1 {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.5; }
        }

        @keyframes dust-float-2 {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
          50% { transform: translateY(-15px) translateX(-8px); opacity: 0.4; }
        }

        @keyframes dust-float-3 {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.25; }
          50% { transform: translateY(-25px) translateX(5px); opacity: 0.45; }
        }

        .ember {
          position: absolute;
          width: 4px;
          height: 4px;
          background: radial-gradient(circle, #ff9329 0%, #ff6b00 50%, transparent 100%);
          border-radius: 50%;
          animation: ember-rise 4s ease-out infinite;
        }

        .ember-1 { left: 10%; bottom: 0; animation-delay: 0s; }
        .ember-2 { left: 30%; bottom: 0; animation-delay: 0.8s; }
        .ember-3 { left: 50%; bottom: 0; animation-delay: 1.6s; }
        .ember-4 { left: 70%; bottom: 0; animation-delay: 2.4s; }
        .ember-5 { left: 90%; bottom: 0; animation-delay: 3.2s; }

        @keyframes ember-rise {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(20px) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes candle-flicker {
          0%, 100% { opacity: 0; }
          10% { opacity: 0.02; }
          20% { opacity: 0; }
          30% { opacity: 0.03; }
          40% { opacity: 0.01; }
          50% { opacity: 0; }
          60% { opacity: 0.02; }
          70% { opacity: 0; }
          80% { opacity: 0.01; }
          90% { opacity: 0.02; }
        }

        .animate-candle-flicker {
          background: rgba(255,147,41,0.15);
          animation: candle-flicker 3s ease-in-out infinite;
        }

        /* ===== HORROR ANIMATIONS ===== */

        .fog-layer {
          position: absolute;
          width: 200%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(74,0,128,0.08) 25%,
            rgba(26,74,46,0.06) 50%,
            rgba(74,0,128,0.08) 75%,
            transparent 100%
          );
        }

        .fog-1 {
          animation: fog-drift-1 30s linear infinite;
          top: 20%;
        }

        .fog-2 {
          animation: fog-drift-2 40s linear infinite;
          top: 60%;
          opacity: 0.7;
        }

        @keyframes fog-drift-1 {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }

        @keyframes fog-drift-2 {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }

        .tentacle {
          position: absolute;
          background: linear-gradient(
            to right,
            rgba(74,0,128,0.3) 0%,
            transparent 100%
          );
          animation: tentacle-wave 8s ease-in-out infinite;
        }

        .tentacle-left {
          left: 0;
          top: 20%;
          width: 100px;
          height: 60%;
          transform-origin: left center;
        }

        .tentacle-right {
          right: 0;
          top: 30%;
          width: 100px;
          height: 50%;
          background: linear-gradient(to left, rgba(74,0,128,0.3) 0%, transparent 100%);
          transform-origin: right center;
          animation-delay: 2s;
        }

        .tentacle-bottom {
          bottom: 0;
          left: 30%;
          width: 40%;
          height: 80px;
          background: linear-gradient(to top, rgba(26,74,46,0.25) 0%, transparent 100%);
          transform-origin: bottom center;
          animation-delay: 4s;
        }

        @keyframes tentacle-wave {
          0%, 100% { transform: scaleX(1) skewY(0deg); }
          25% { transform: scaleX(1.1) skewY(2deg); }
          50% { transform: scaleX(0.95) skewY(-1deg); }
          75% { transform: scaleX(1.05) skewY(1deg); }
        }

        @keyframes eye-blink {
          0%, 95%, 100% { opacity: 0; }
          96%, 98% { opacity: 0.15; }
        }

        .animate-eye-blink {
          background: radial-gradient(
            ellipse 30% 15% at 50% 50%,
            rgba(0,255,136,0.3) 0%,
            transparent 70%
          );
          animation: eye-blink 10s ease-in-out infinite;
        }

        @keyframes whispers-distort {
          0%, 100% { filter: blur(0px); transform: scale(1); }
          50% { filter: blur(0.5px); transform: scale(1.002); }
        }

        .animate-whispers {
          animation: whispers-distort 5s ease-in-out infinite;
        }

        .corruption-edge {
          position: absolute;
          background: linear-gradient(
            var(--dir, to bottom),
            rgba(74,0,128,0.2) 0%,
            transparent 100%
          );
        }

        .corruption-top {
          --dir: to bottom;
          top: 0;
          left: 0;
          right: 0;
          height: 50px;
        }

        .corruption-bottom {
          --dir: to top;
          bottom: 0;
          left: 0;
          right: 0;
          height: 50px;
        }

        .corruption-left {
          --dir: to right;
          left: 0;
          top: 0;
          bottom: 0;
          width: 50px;
        }

        .corruption-right {
          --dir: to left;
          right: 0;
          top: 0;
          bottom: 0;
          width: 50px;
        }
      `}</style>
    </>
  )
}
