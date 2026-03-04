import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import type { AgencySettings } from '@forgeos/shared'

const FIELDS: { key: keyof AgencySettings; label: string; group: string; secret?: boolean; placeholder?: string }[] = [
    { key: 'githubToken', label: 'GitHub Token', group: 'GitHub', secret: true, placeholder: 'ghp_...' },
    { key: 'githubOrg', label: 'Org / Username', group: 'GitHub', placeholder: 'your-github-username' },
    { key: 'goldenBoilerplateRepo', label: 'Boilerplate Repo', group: 'GitHub', placeholder: 'owner/repo-name' },
    { key: 'goldenBoilerplateSha', label: 'Boilerplate SHA', group: 'GitHub', placeholder: 'abc123...' },
    { key: 'doApiToken', label: 'API Token', group: 'DigitalOcean', secret: true, placeholder: 'dop_v1_...' },
    { key: 'doSpacesKey', label: 'Spaces Key', group: 'DigitalOcean', secret: true },
    { key: 'doSpacesSecret', label: 'Spaces Secret', group: 'DigitalOcean', secret: true },
    { key: 'doSpacesRegion', label: 'Spaces Region', group: 'DigitalOcean', placeholder: 'sgp1' },
    { key: 'doSpacesBucket', label: 'Spaces Bucket', group: 'DigitalOcean', placeholder: 'forgeos-memory' },
    { key: 'doKnowledgeBaseUuid', label: 'Knowledge Base UUID', group: 'DigitalOcean' },
]

interface Props {
    agencyId: string
    onClose: () => void
}

export function SettingsModal({ agencyId, onClose }: Props) {
    const queryClient = useQueryClient()
    const [form, setForm] = useState<Partial<AgencySettings>>({})
    const [saving, setSaving] = useState(false)
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

    const { data, isLoading } = useQuery({
        queryKey: ['agencySettings', agencyId],
        queryFn: () => api.getAgencySettings(agencyId),
    })

    useEffect(() => {
        if (data) setForm(data)
    }, [data])

    const handleSave = async () => {
        setSaving(true)
        try {
            await api.updateAgencySettings(agencyId, form)
            queryClient.invalidateQueries({ queryKey: ['agencySettings', agencyId] })
            toast.success('Settings saved')
            onClose()
        } catch (err: any) {
            toast.error('Failed to save settings', { description: err.message })
        } finally {
            setSaving(false)
        }
    }

    const groups = [...new Set(FIELDS.map((f) => f.group))]

    return (
        <>
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={onClose}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-bg-surface border border-border rounded-xl shadow-2xl z-50 p-6 flex flex-col gap-5 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">Agency Settings</h2>
                    <button
                        onClick={onClose}
                        className="text-text-muted hover:text-text-primary transition-colors"
                    >
                        &#10005;
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-accent-primary" size={24} />
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        {groups.map((group) => (
                            <div key={group}>
                                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                                    {group}
                                </h3>
                                <div className="flex flex-col gap-2">
                                    {FIELDS.filter((f) => f.group === group).map((field) => (
                                        <div key={field.key} className="flex flex-col gap-1">
                                            <label className="text-xs font-semibold text-text-muted">
                                                {field.label}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={field.secret && !showSecrets[field.key] ? 'password' : 'text'}
                                                    value={(form[field.key] as string) ?? ''}
                                                    onChange={(e) =>
                                                        setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                                                    }
                                                    placeholder={field.placeholder}
                                                    className="w-full bg-bg-base border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all pr-9"
                                                />
                                                {field.secret && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setShowSecrets((prev) => ({
                                                                ...prev,
                                                                [field.key]: !prev[field.key],
                                                            }))
                                                        }
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                                                    >
                                                        {showSecrets[field.key] ? (
                                                            <EyeOff size={14} />
                                                        ) : (
                                                            <Eye size={14} />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="text-xs text-text-muted bg-bg-elevated p-3 rounded-md border border-border">
                            Credentials are stored per-agency and override environment variables.
                            Masked fields retain their existing values unless you type a new one.
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-accent-primary text-bg-base px-5 py-2.5 rounded-md font-bold text-sm hover:bg-[#00e5ff] disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {saving && <Loader2 size={16} className="animate-spin" />}
                                Save Settings
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
