import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

type Field = { _id?: string; key: string; label: string; type?: string; required?: boolean };

export default function AdminProfileFields() {
  const [fields, setFields] = useState<Field[]>([]);
  const [form, setForm] = useState<Field>({ key: '', label: '', type: 'text', required: false });
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((s) => s.token);

  const api = (path: string, opts: RequestInit = {}) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`/api/admin${path}`, { headers, ...opts });
  };

  async function load() {
    setLoading(true);
    try {
      const res = await api('/profile-fields');
      if (res.ok) setFields(await res.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.key.trim() || !form.label.trim()) return alert('Key and label required');
    const res = await api('/profile-fields', { method: 'POST', body: JSON.stringify(form) });
    if (res.ok) { setForm({ key: '', label: '', type: 'text', required: false }); load(); } else alert('Create failed: ' + (await res.text()));
  }

  async function remove(id?: string) {
    if (!id) return; if (!confirm('Delete this field?')) return;
    const res = await api(`/profile-fields/${id}`, { method: 'DELETE' });
    if (res.ok) load(); else alert('Delete failed');
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Profile Fields</h2>
        <p className="text-sm text-muted-foreground">Manage which profile fields users must fill.</p>
      </div>

      <form onSubmit={create} className="grid gap-2 sm:grid-cols-4 items-end">
        <div>
          <label className="block text-sm">Key (identifier)</label>
          <input className="w-full p-2 border" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm">Label</label>
          <input className="w-full p-2 border" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm">Type</label>
          <select className="w-full p-2 border" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="text">Text</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="select">Select</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">Required</label>
          <input type="checkbox" checked={!!form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} />
        </div>
        <div className="sm:col-span-4">
          <button className="px-4 py-2 bg-primary text-white rounded">Create Field</button>
        </div>
      </form>

      <div>
        <h3 className="text-lg font-medium">Existing Fields</h3>
        {loading ? <p>Loading…</p> : (
          <ul className="space-y-2 mt-2">
            {fields.map((f) => (
              <li key={f._id} className="p-3 border rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">{f.label} <span className="text-xs text-muted-foreground">({f.key})</span></div>
                  <div className="text-sm text-muted-foreground">Type: {f.type} {f.required ? '· Required' : ''}</div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 border rounded" onClick={() => remove(f._id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
