import { useState } from 'react'
import { X, Download, FileText } from 'lucide-react'

type ExportTarget = 'claude' | 'cursor' | 'markdown'

interface ExportModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

const PRESETS: {
  id: ExportTarget
  label: string
  description: string
  filename: string
}[] = [
  {
    id: 'claude',
    label: 'Claude Code',
    description: 'CLAUDE.md — auto-loaded by Claude Code',
    filename: 'CLAUDE.md',
  },
  {
    id: 'cursor',
    label: 'Cursor',
    description: '.cursorrules — loaded by Cursor IDE',
    filename: '.cursorrules',
  },
  {
    id: 'markdown',
    label: 'Plain Markdown',
    description: 'handoff.md — universal format',
    filename: 'handoff.md',
  },
]

export function ExportModal({ projectId, isOpen, onClose }: ExportModalProps) {
  const [target, setTarget] = useState<ExportTarget>('claude')
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)

  const fetchPreview = async (t: ExportTarget) => {
    setLoading(true)
    setPreview(null)
    setError(null)
    try {
      const res = await fetch(`/api/pipeline/${projectId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: t }),
      })
      if (!res.ok) throw new Error('Failed to generate export')
      const data = await res.json()
      setPreview(data.content)
    } catch {
      setError('Failed to generate preview. Try again.')
    } finally {
      setLoading(false)
      setFetched(true)
    }
  }

  const handlePresetChange = (t: ExportTarget) => {
    setTarget(t)
    fetchPreview(t)
  }

  const handleDownload = () => {
    if (!preview) return
    const preset = PRESETS.find(p => p.id === target)!
    const blob = new Blob([preview], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = preset.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  // Auto-load preview on first open
  if (!fetched && !loading) {
    fetchPreview(target)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        backgroundColor: '#0f0f17',
        border: '1px solid #1e1e2e',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '780px',
        maxHeight: '82vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #1e1e2e',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={15} color="#00d4ff" />
            <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '14px' }}>
              Export Handoff Packet
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '2px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Preset Selector */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '16px 20px',
          borderBottom: '1px solid #1e1e2e',
          flexShrink: 0,
        }}>
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => handlePresetChange(preset.id)}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${target === preset.id ? '#00d4ff' : '#1e1e2e'}`,
                backgroundColor: target === preset.id ? '#00d4ff0d' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{
                color: target === preset.id ? '#00d4ff' : '#cbd5e1',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '2px',
              }}>
                {preset.label}
              </div>
              <div style={{ color: '#475569', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
                {preset.description}
              </div>
            </button>
          ))}
        </div>

        {/* Preview Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {loading && (
            <div style={{
              color: '#475569', fontSize: '13px',
              textAlign: 'center', padding: '48px 0',
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              Generating preview...
            </div>
          )}
          {error && (
            <div style={{
              color: '#ef4444', fontSize: '13px',
              textAlign: 'center', padding: '48px 0',
            }}>
              {error}
            </div>
          )}
          {!loading && !error && preview && (
            <pre style={{
              color: '#94a3b8',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono, monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
              lineHeight: 1.6,
            }}>
              {preview}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          borderTop: '1px solid #1e1e2e',
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #1e1e2e',
              backgroundColor: 'transparent',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={!preview || loading}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: preview && !loading ? '#00d4ff' : '#1e1e2e',
              color: preview && !loading ? '#0a0a0f' : '#475569',
              cursor: preview && !loading ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Download size={13} />
            Download {PRESETS.find(p => p.id === target)?.filename}
          </button>
        </div>
      </div>
    </div>
  )
}
