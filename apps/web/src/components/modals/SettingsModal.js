import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
const FIELDS = [
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
];
export function SettingsModal({ agencyId, onClose }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [showSecrets, setShowSecrets] = useState({});
    const { data, isLoading } = useQuery({
        queryKey: ['agencySettings', agencyId],
        queryFn: () => api.getAgencySettings(agencyId),
    });
    useEffect(() => {
        if (data)
            setForm(data);
    }, [data]);
    const handleSave = async () => {
        setSaving(true);
        try {
            await api.updateAgencySettings(agencyId, form);
            queryClient.invalidateQueries({ queryKey: ['agencySettings', agencyId] });
            toast.success('Settings saved');
            onClose();
        }
        catch (err) {
            toast.error('Failed to save settings', { description: err.message });
        }
        finally {
            setSaving(false);
        }
    };
    const groups = [...new Set(FIELDS.map((f) => f.group))];
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm z-40", onClick: onClose }), _jsxs("div", { className: "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-bg-surface border border-border rounded-xl shadow-2xl z-50 p-6 flex flex-col gap-5 max-h-[85vh] overflow-y-auto", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h2", { className: "text-lg font-bold", children: "Agency Settings" }), _jsx("button", { onClick: onClose, className: "text-text-muted hover:text-text-primary transition-colors", children: "\u2715" })] }), isLoading ? (_jsx("div", { className: "flex justify-center py-8", children: _jsx(Loader2, { className: "animate-spin text-accent-primary", size: 24 }) })) : (_jsxs("div", { className: "flex flex-col gap-5", children: [groups.map((group) => (_jsxs("div", { children: [_jsx("h3", { className: "text-xs font-bold text-text-muted uppercase tracking-wider mb-2", children: group }), _jsx("div", { className: "flex flex-col gap-2", children: FIELDS.filter((f) => f.group === group).map((field) => (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-xs font-semibold text-text-muted", children: field.label }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: field.secret && !showSecrets[field.key] ? 'password' : 'text', value: form[field.key] ?? '', onChange: (e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value })), placeholder: field.placeholder, className: "w-full bg-bg-base border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all pr-9" }), field.secret && (_jsx("button", { type: "button", onClick: () => setShowSecrets((prev) => ({
                                                                ...prev,
                                                                [field.key]: !prev[field.key],
                                                            })), className: "absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors", children: showSecrets[field.key] ? (_jsx(EyeOff, { size: 14 })) : (_jsx(Eye, { size: 14 })) }))] })] }, field.key))) })] }, group))), _jsx("div", { className: "text-xs text-text-muted bg-bg-elevated p-3 rounded-md border border-border", children: "Credentials are stored per-agency and override environment variables. Masked fields retain their existing values unless you type a new one." }), _jsx("div", { className: "flex justify-end pt-2", children: _jsxs("button", { onClick: handleSave, disabled: saving, className: "bg-accent-primary text-bg-base px-5 py-2.5 rounded-md font-bold text-sm hover:bg-[#00e5ff] disabled:opacity-50 transition-colors flex items-center gap-2", children: [saving && _jsx(Loader2, { size: 16, className: "animate-spin" }), "Save Settings"] }) })] }))] })] }));
}
