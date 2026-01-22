import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

type Skill = { _id?: string; name: string };

export default function AdminSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [name, setName] = useState('');
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
      const res = await api('/skills');
      if (res.ok) setSkills(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await api('/skills', { method: 'POST', body: JSON.stringify({ name }) });
    if (res.ok) { setName(''); load(); } else alert('Create failed: ' + (await res.text()));
  }

  async function remove(id?: string) {
    if (!id) return; if (!confirm('Delete skill?')) return;
    const res = await api(`/skills/${id}`, { method: 'DELETE' });
    if (res.ok) load(); else alert('Delete failed');
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Skill Catalog</h2>
        <p className="text-sm text-muted-foreground">Manage global skill list; changes propagate to users.</p>
      </div>

      <form onSubmit={create} className="grid gap-2 sm:grid-cols-3 items-end">
        <div>
          <label className="block text-sm">Skill Name</label>
          <input className="w-full p-2 border" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <button className="px-4 py-2 bg-primary text-white rounded">Add Skill</button>
        </div>
      </form>

      <div>
        <h3 className="text-lg font-medium">Existing Skills</h3>
        {loading ? <p>Loading…</p> : (
          <ul className="space-y-2 mt-2">
            {skills.map((s) => (
              <li key={s._id} className="p-3 border rounded flex justify-between items-center">
                <div className="font-medium">{s.name}</div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 border rounded" onClick={() => remove(s._id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
