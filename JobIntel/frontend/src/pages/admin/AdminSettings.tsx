import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

// Helper to get auth token from localStorage
function getAuthToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  }
  return null;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    appName: 'JobIntel',
    appUrl: 'https://jobintel.com',
    maintenanceMode: false,
    emailNotifications: true,
    smsNotifications: false,
    dailyReports: true,
    autoPublish: false,
    aiMinimumScore: 70,
    // New premium lock settings
    premiumLockEnabled: true,
    premiumLockDays: 15,
    // Manual premium access
    manualPremiumEmail: '',
    manualPremiumUsers: [] as string[],
  });

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = getAuthToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/admin/settings', {
        method: 'GET',
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({
          ...prev,
          aiMinimumScore: data.ai_minimum_score ?? 70,
          premiumLockEnabled: data.premium_lock_enabled ?? true,
          premiumLockDays: data.premium_lock_days ?? 15,
          manualPremiumUsers: data.manual_premium_users ?? [],
        }));
      } else if (response.status === 401) {
        setError('Unauthorized: Please log in again');
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
    setError('');
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const token = getAuthToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      // Save AI minimum score
      await fetch('/api/admin/settings/ai_minimum_score', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          value: settings.aiMinimumScore,
          type: 'number',
          description: 'Minimum match score percentage for AI-matched jobs',
        }),
      });

      // Save premium lock settings
      await fetch('/api/admin/settings/premium_lock_enabled', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          value: settings.premiumLockEnabled,
          type: 'boolean',
          description: 'Enable/disable premium lock for free users',
        }),
      });

      await fetch('/api/admin/settings/premium_lock_days', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          value: settings.premiumLockDays,
          type: 'number',
          description: 'Number of days for rolling window premium lock',
        }),
      });

      // Save manual premium users
      await fetch('/api/admin/settings/manual_premium_users', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          value: settings.manualPremiumUsers,
          type: 'json',
          description: 'Emails of users with manual premium access',
        }),
      });

      setSaved(true);
      setSuccessMessage('All settings saved successfully!');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  // Add user to manual premium list
  const handleAddManualPremium = async () => {
    if (!settings.manualPremiumEmail.trim()) {
      setError('Please enter a valid email');
      return;
    }
    if (settings.manualPremiumUsers.includes(settings.manualPremiumEmail.toLowerCase())) {
      setError('User already in manual premium list');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const token = getAuthToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/admin/grant-premium', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: settings.manualPremiumEmail }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to grant premium access');
      }

      // Add to list
      const updated = [...settings.manualPremiumUsers, settings.manualPremiumEmail.toLowerCase()];
      setSettings(prev => ({
        ...prev,
        manualPremiumUsers: updated,
        manualPremiumEmail: '',
      }));
      setSuccessMessage(`${settings.manualPremiumEmail} granted premium access!`);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to grant premium access');
    } finally {
      setLoading(false);
    }
  };

  // Remove user from manual premium list
  const handleRemoveManualPremium = async (email: string) => {
    setLoading(true);
    setError('');
    try {
      const token = getAuthToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/admin/revoke-premium', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to revoke premium access');
      }

      setSettings(prev => ({
        ...prev,
        manualPremiumUsers: prev.manualPremiumUsers.filter(e => e !== email),
      }));
      setSuccessMessage(`${email} premium access revoked!`);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to revoke premium access');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-sm md:text-base text-muted-foreground">Manage admin settings and configuration</p>
      </div>

      {saved && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm">{successMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* General Settings */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted">
          <CardTitle className="text-lg md:text-xl">General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Application Name</label>
            <Input value={settings.appName} onChange={(e) => {
              setSettings(prev => ({ ...prev, appName: e.target.value }));
              setError('');
            }} className="text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Application URL</label>
            <Input value={settings.appUrl} onChange={(e) => {
              setSettings(prev => ({ ...prev, appUrl: e.target.value }));
              setError('');
            }} className="text-sm" />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox checked={settings.maintenanceMode} onCheckedChange={(checked) => {
              setSettings(prev => ({ ...prev, maintenanceMode: checked as boolean }));
              setError('');
            }} />
            <label className="text-sm font-medium cursor-pointer">Enable Maintenance Mode</label>
          </div>
        </CardContent>
      </Card>

      {/* AI Job Matching Settings */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted">
          <CardTitle className="text-lg md:text-xl">AI Job Matching Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <AlertDescription className="text-blue-800 text-xs md:text-sm">
              Set the minimum match score threshold. Only jobs matching this score or higher will be shown to users.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Minimum Match Score Threshold (%)
              <span className="ml-2 text-base md:text-lg font-bold text-blue-600">{settings.aiMinimumScore}%</span>
            </label>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              <Input
                type="number"
                min="0"
                max="100"
                step="5"
                value={settings.aiMinimumScore}
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                  setSettings(prev => ({ ...prev, aiMinimumScore: val }));
                  setError('');
                }}
                className="w-full md:w-24 text-sm"
              />
              <div className="flex gap-2 flex-wrap">
                {[60, 70, 80, 90].map((score) => (
                  <Button
                    key={score}
                    variant={settings.aiMinimumScore === score ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSettings(prev => ({ ...prev, aiMinimumScore: score }));
                      setError('');
                    }}
                    className="text-xs md:text-sm"
                  >
                    {score}%
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-2">
              Jobs with a match score of {settings.aiMinimumScore}% or higher will be displayed to users.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Premium Lock Settings */}
      <Card className="overflow-hidden border-2 border-purple-200">
        <CardHeader className="bg-purple-50">
          <CardTitle className="text-lg md:text-xl text-purple-900">Premium Lock Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <Alert className="border-purple-200 bg-purple-50">
            <AlertCircle className="h-4 w-4 text-purple-600 flex-shrink-0" />
            <AlertDescription className="text-purple-800 text-xs md:text-sm">
              Control how the premium lock works for free users. When enabled, free users can apply once per rolling window.
            </AlertDescription>
          </Alert>

          {/* Enable/Disable Toggle */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 bg-muted rounded-lg">
            <div>
              <label className="text-sm font-semibold cursor-pointer">Enable Premium Lock</label>
              <p className="text-xs text-muted-foreground mt-1">
                {settings.premiumLockEnabled ? 'Free users are limited to 1 action' : 'Free users can apply unlimited times'}
              </p>
            </div>
            <Checkbox 
              checked={settings.premiumLockEnabled}
              onCheckedChange={(checked) => {
                setSettings(prev => ({ ...prev, premiumLockEnabled: checked as boolean }));
                setError('');
              }}
              className="w-6 h-6"
            />
          </div>

          {/* Configure Rolling Window Days */}
          {settings.premiumLockEnabled && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Rolling Window Period (Days)
                <span className="ml-2 text-base md:text-lg font-bold text-purple-600">{settings.premiumLockDays}d</span>
              </label>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                <Input
                  type="number"
                  min="1"
                  max="365"
                  step="1"
                  value={settings.premiumLockDays}
                  onChange={(e) => {
                    const val = Math.min(365, Math.max(1, parseInt(e.target.value) || 1));
                    setSettings(prev => ({ ...prev, premiumLockDays: val }));
                    setError('');
                  }}
                  className="w-full md:w-32 text-sm"
                />
                <div className="flex gap-2 flex-wrap">
                  {[2, 5, 15, 30].map((days) => (
                    <Button
                      key={days}
                      variant={settings.premiumLockDays === days ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSettings(prev => ({ ...prev, premiumLockDays: days }));
                        setError('');
                      }}
                      className="text-xs md:text-sm"
                    >
                      {days}d
                    </Button>
                  ))}
                </div>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-2">
                Free users can apply once every {settings.premiumLockDays} days in a rolling window.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Premium Access */}
      <Card className="overflow-hidden border-2 border-green-200">
        <CardHeader className="bg-green-50">
          <CardTitle className="text-lg md:text-xl text-green-900">Manual Premium Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <Alert className="border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            <AlertDescription className="text-green-800 text-xs md:text-sm">
              Grant permanent premium access to specific users without payment. They can apply unlimited times.
            </AlertDescription>
          </Alert>

          {/* Add User Form */}
          <div className="space-y-3 p-3 bg-muted rounded-lg">
            <label className="text-sm font-medium">Add User to Premium (by Email)</label>
            <div className="flex flex-col md:flex-row gap-2">
              <Input
                type="email"
                placeholder="user@example.com"
                value={settings.manualPremiumEmail}
                onChange={(e) => {
                  setSettings(prev => ({ ...prev, manualPremiumEmail: e.target.value }));
                  setError('');
                }}
                className="flex-1 text-sm"
              />
              <Button
                onClick={handleAddManualPremium}
                className="w-full md:w-auto text-sm"
                disabled={!settings.manualPremiumEmail.trim()}
              >
                Add User
              </Button>
            </div>
          </div>

          {/* List of Manual Premium Users */}
          {settings.manualPremiumUsers.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Users with Manual Premium Access ({settings.manualPremiumUsers.length})</label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {settings.manualPremiumUsers.map((email, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <span className="text-sm font-medium text-green-900">{email}</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveManualPremium(email)}
                      className="w-full md:w-auto"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted">
          <CardTitle className="text-lg md:text-xl">Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="flex items-center space-x-2">
            <Checkbox checked={settings.emailNotifications} onCheckedChange={(checked) => {
              setSettings(prev => ({ ...prev, emailNotifications: checked as boolean }));
              setError('');
            }} />
            <label className="text-sm font-medium cursor-pointer">Email Notifications</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox checked={settings.smsNotifications} onCheckedChange={(checked) => {
              setSettings(prev => ({ ...prev, smsNotifications: checked as boolean }));
              setError('');
            }} />
            <label className="text-sm font-medium cursor-pointer">SMS Notifications</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox checked={settings.dailyReports} onCheckedChange={(checked) => {
              setSettings(prev => ({ ...prev, dailyReports: checked as boolean }));
              setError('');
            }} />
            <label className="text-sm font-medium cursor-pointer">Daily Reports</label>
          </div>
        </CardContent>
      </Card>

      {/* Publishing Settings */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted">
          <CardTitle className="text-lg md:text-xl">Publishing Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="flex items-center space-x-2">
            <Checkbox checked={settings.autoPublish} onCheckedChange={(checked) => {
              setSettings(prev => ({ ...prev, autoPublish: checked as boolean }));
              setError('');
            }} />
            <label className="text-sm font-medium cursor-pointer">Auto-Publish New Jobs</label>
          </div>
        </CardContent>
      </Card>

      {/* API Settings */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted">
          <CardTitle className="text-lg md:text-xl">API Keys & Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <AlertDescription className="text-amber-800 text-xs md:text-sm">Keep your API keys confidential. Never share them publicly.</AlertDescription>
          </Alert>
          <div className="space-y-2">
            <label className="text-sm font-medium">Primary API Key</label>
            <div className="flex flex-col md:flex-row gap-2">
              <Input type="password" value="••••••••••••••••" readOnly className="bg-muted text-sm" />
              <Button variant="outline" className="w-full md:w-auto text-sm">Regenerate</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col md:flex-row gap-2 sticky bottom-0 bg-background p-4 rounded-lg border">
        <Button onClick={handleSave} disabled={loading} className="flex-1 md:flex-none md:w-32 text-sm">
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="outline" className="flex-1 md:flex-none md:w-32 text-sm">Reset to Default</Button>
      </div>
    </div>
  );
}
