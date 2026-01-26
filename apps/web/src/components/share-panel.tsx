'use client'

import { useState, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'

// =============================================================================
// SharePanel Component - Deep link sharing with QR code
// =============================================================================
// Provides: Copy link, Open in new window, QR code display
// Used for sharing RUN links with login gating support

interface SharePanelProps {
  runId: string
  runName?: string | null
  projectName?: string
  // Visual variant
  variant?: 'TECH' | 'IMMERSIVE' | 'COMPACT'
  // Theme for immersive mode
  theme?: {
    primaryColor?: string
    textColor?: string
    bgColor?: string
  }
  // Whether to show inline (small) or expanded
  expanded?: boolean
  // Callback when user clicks to open
  onOpen?: () => void
}

export function SharePanel({
  runId,
  runName,
  projectName,
  variant = 'TECH',
  theme,
  expanded = false,
  onOpen,
}: SharePanelProps) {
  const [showQRModal, setShowQRModal] = useState(false)
  const [copied, setCopied] = useState(false)

  // Generate the full URL for the run
  const getRunUrl = useCallback(() => {
    if (typeof window === 'undefined') return ''
    const baseUrl = window.location.origin
    return `${baseUrl}/runs/${runId}`
  }, [runId])

  // Copy link to clipboard
  const handleCopyLink = useCallback(async () => {
    const url = getRunUrl()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [getRunUrl])

  // Open in new window
  const handleOpenNewWindow = useCallback(() => {
    const url = getRunUrl()
    window.open(url, '_blank', 'noopener,noreferrer')
    onOpen?.()
  }, [getRunUrl, onOpen])

  // Download QR code
  const handleDownloadQR = useCallback(() => {
    const svg = document.getElementById('share-qr-code')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')

      const downloadLink = document.createElement('a')
      downloadLink.download = `rolhack-run-${runId.slice(0, 8)}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [runId])

  const url = getRunUrl()

  // COMPACT variant - minimal inline display
  if (variant === 'COMPACT') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopyLink}
          className="p-1.5 text-gray-400 hover:text-white transition-colors"
          title={copied ? 'Copiado!' : 'Copiar enlace'}
        >
          {copied ? (
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          )}
        </button>
        <button
          onClick={handleOpenNewWindow}
          className="p-1.5 text-gray-400 hover:text-white transition-colors"
          title="Abrir en nueva ventana"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
        <button
          onClick={() => setShowQRModal(true)}
          className="p-1.5 text-gray-400 hover:text-white transition-colors"
          title="Ver código QR"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </button>

        {/* QR Modal */}
        {showQRModal && (
          <QRModal
            url={url}
            runId={runId}
            runName={runName}
            projectName={projectName}
            onClose={() => setShowQRModal(false)}
            onCopy={handleCopyLink}
            onDownload={handleDownloadQR}
            copied={copied}
            variant="TECH"
          />
        )}
      </div>
    )
  }

  // IMMERSIVE variant
  if (variant === 'IMMERSIVE') {
    const primaryColor = theme?.primaryColor || '#00ff00'
    const textColor = theme?.textColor || '#00ff00'
    const bgColor = theme?.bgColor || '#000000'

    return (
      <>
        <div
          className="p-3 rounded font-mono text-sm"
          style={{ border: `1px solid ${primaryColor}33`, backgroundColor: `${bgColor}cc` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: `${primaryColor}88` }}>[</span>
            <span style={{ color: primaryColor }}>SHARE_LINK</span>
            <span style={{ color: `${primaryColor}88` }}>]</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1 rounded text-xs transition-colors"
              style={{
                border: `1px solid ${copied ? '#00ff00' : primaryColor}66`,
                color: copied ? '#00ff00' : primaryColor,
              }}
            >
              {copied ? '[COPIED]' : '[COPY]'}
            </button>
            <button
              onClick={handleOpenNewWindow}
              className="px-3 py-1 rounded text-xs transition-colors"
              style={{ border: `1px solid ${primaryColor}66`, color: primaryColor }}
            >
              [NEW_WINDOW]
            </button>
            <button
              onClick={() => setShowQRModal(true)}
              className="px-3 py-1 rounded text-xs transition-colors"
              style={{ border: `1px solid ${primaryColor}66`, color: primaryColor }}
            >
              [QR_CODE]
            </button>
          </div>
        </div>

        {/* QR Modal */}
        {showQRModal && (
          <QRModal
            url={url}
            runId={runId}
            runName={runName}
            projectName={projectName}
            onClose={() => setShowQRModal(false)}
            onCopy={handleCopyLink}
            onDownload={handleDownloadQR}
            copied={copied}
            variant="IMMERSIVE"
            theme={theme}
          />
        )}
      </>
    )
  }

  // TECH variant (default)
  return (
    <>
      <div className="bg-cyber-dark/50 border border-cyber-accent/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-cyber-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <h3 className="text-sm font-mono font-medium text-cyber-accent">COMPARTIR RUN</h3>
        </div>

        {expanded && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Enlace directo:</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={url}
                readOnly
                className="flex-1 bg-cyber-darker border border-gray-700 rounded px-2 py-1 text-xs text-gray-400 font-mono focus:outline-none"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-mono transition-colors ${
              copied
                ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                : 'bg-cyber-accent/20 border border-cyber-accent/30 hover:bg-cyber-accent/30 text-cyber-accent'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copiado
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copiar
              </>
            )}
          </button>

          <button
            onClick={handleOpenNewWindow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyber-primary/20 border border-cyber-primary/30 hover:bg-cyber-primary/30 text-cyber-primary rounded text-sm font-mono transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Nueva ventana
          </button>

          <button
            onClick={() => setShowQRModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 rounded text-sm font-mono transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            QR
          </button>
        </div>
      </div>

      {/* QR Modal */}
      {showQRModal && (
        <QRModal
          url={url}
          runId={runId}
          runName={runName}
          projectName={projectName}
          onClose={() => setShowQRModal(false)}
          onCopy={handleCopyLink}
          onDownload={handleDownloadQR}
          copied={copied}
          variant="TECH"
        />
      )}
    </>
  )
}

// =============================================================================
// QR Modal Component
// =============================================================================

interface QRModalProps {
  url: string
  runId: string
  runName?: string | null
  projectName?: string
  onClose: () => void
  onCopy: () => void
  onDownload: () => void
  copied: boolean
  variant: 'TECH' | 'IMMERSIVE'
  theme?: {
    primaryColor?: string
    textColor?: string
    bgColor?: string
  }
}

function QRModal({
  url,
  runId,
  runName,
  projectName,
  onClose,
  onCopy,
  onDownload,
  copied,
  variant,
  theme,
}: QRModalProps) {
  if (variant === 'IMMERSIVE') {
    const primaryColor = theme?.primaryColor || '#00ff00'
    const textColor = theme?.textColor || '#00ff00'
    const bgColor = theme?.bgColor || '#000000'

    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ backgroundColor: `${bgColor}ee` }}
        onClick={onClose}
      >
        <div
          className="p-6 rounded font-mono max-w-sm w-full"
          style={{ border: `1px solid ${primaryColor}44`, backgroundColor: bgColor }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span style={{ color: `${primaryColor}88` }}>[</span>
              <span style={{ color: primaryColor }}>QR_ACCESS_CODE</span>
              <span style={{ color: `${primaryColor}88` }}>]</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-sm hover:opacity-70 transition-opacity cursor-pointer"
              style={{ color: `${textColor}66` }}
            >
              [X]
            </button>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-4 p-4 rounded" style={{ backgroundColor: '#ffffff' }}>
            <QRCodeSVG
              id="share-qr-code"
              value={url}
              size={180}
              level="M"
              fgColor="#000000"
              bgColor="#ffffff"
            />
          </div>

          {/* Info */}
          <div className="text-xs mb-4" style={{ color: `${textColor}88` }}>
            <p>&gt; RUN: {runName || runId.slice(0, 8)}</p>
            {projectName && <p>&gt; PROJECT: {projectName}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onCopy}
              className="flex-1 px-3 py-2 rounded text-xs"
              style={{
                border: `1px solid ${copied ? '#00ff00' : primaryColor}66`,
                color: copied ? '#00ff00' : primaryColor,
              }}
            >
              {copied ? '[COPIED]' : '[COPY_LINK]'}
            </button>
            <button
              onClick={onDownload}
              className="flex-1 px-3 py-2 rounded text-xs"
              style={{ border: `1px solid ${primaryColor}66`, color: primaryColor }}
            >
              [DOWNLOAD]
            </button>
          </div>
        </div>
      </div>
    )
  }

  // TECH variant
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-cyber-dark border border-cyber-accent/30 rounded-xl p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyber-accent/20 border border-cyber-accent/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-cyber-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="text-lg font-mono font-bold text-cyber-accent">QR CODE</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-4 p-4 bg-white rounded-lg">
          <QRCodeSVG
            id="share-qr-code"
            value={url}
            size={200}
            level="M"
            fgColor="#000000"
            bgColor="#ffffff"
          />
        </div>

        {/* Info */}
        <div className="text-center mb-4">
          <p className="text-white font-medium">{runName || `Run ${runId.slice(0, 8)}`}</p>
          {projectName && <p className="text-gray-500 text-sm">{projectName}</p>}
        </div>

        {/* URL display */}
        <div className="mb-4">
          <input
            type="text"
            value={url}
            readOnly
            className="w-full bg-cyber-darker border border-gray-700 rounded px-3 py-2 text-xs text-gray-400 font-mono text-center focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCopy}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded font-mono text-sm transition-colors ${
              copied
                ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                : 'bg-cyber-accent/20 border border-cyber-accent/30 hover:bg-cyber-accent/30 text-cyber-accent'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copiado
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copiar
              </>
            )}
          </button>
          <button
            onClick={onDownload}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 rounded font-mono text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descargar
          </button>
        </div>

        <p className="text-center text-gray-600 text-[10px] mt-4">
          Escanea el QR para acceder directamente a esta RUN
        </p>
      </div>
    </div>
  )
}
