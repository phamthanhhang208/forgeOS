interface ConfidenceBadgeProps {
  score: number | undefined | null
  size?: 'sm' | 'md'
}

function getConfidenceStyle(score: number) {
  if (score >= 80) return { ring: '#10b981', bg: '#10b98118', label: 'High' }
  if (score >= 50) return { ring: '#f59e0b', bg: '#f59e0b18', label: 'Mid' }
  return { ring: '#ef4444', bg: '#ef444418', label: 'Low' }
}

export function ConfidenceBadge({ score, size = 'md' }: ConfidenceBadgeProps) {
  if (score === undefined || score === null) return null

  const { ring, bg, label } = getConfidenceStyle(score)
  const sm = size === 'sm'

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: sm ? '2px 6px' : '3px 8px',
        borderRadius: '9999px',
        border: `1px solid ${ring}`,
        backgroundColor: bg,
        fontSize: sm ? '10px' : '11px',
        fontFamily: 'JetBrains Mono, monospace',
        color: ring,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}
    >
      <span>{score}</span>
      <span style={{ opacity: 0.65, fontSize: sm ? '9px' : '10px' }}>{label}</span>
    </div>
  )
}
