import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

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
  });

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    try {
      const token = getAuthToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      // Save AI minimum score
      const response = await fetch('/api/admin/settings/ai_minimum_score', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          value: settings.aiMinimumScore,
          type: 'number',
          description: 'Minimum match score percentage for AI-matched jobs',
        }),
      });

      if (response.status === 401) {
        setError('Unauthorized: Please log in again');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage admin settings and configuration</p>
      </div>

      {saved && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">Settings saved successfully!</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Application Name</label>
            <Input value={settings.appName} onChange={(e) => handleChange('appName', e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Application URL</label>
            <Input value={settings.appUrl} onChange={(e) => handleChange('appUrl', e.target.value)} />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox checked={settings.maintenanceMode} onCheckedChange={(checked) => handleChange('maintenanceMode', checked)} />
            <label className="text-sm font-medium cursor-pointer">Enable Maintenance Mode</label>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox checked={settings.emailNotifications} onCheckedChange={(checked) => handleChange('emailNotifications', checked)} />
            <label className="text-sm font-medium cursor-pointer">Email Notifications</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox checked={settings.smsNotifications} onCheckedChange={(checked) => handleChange('smsNotifications', checked)} />
            <label className="text-sm font-medium cursor-pointer">SMS Notifications</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox checked={settings.dailyReports} onCheckedChange={(checked) => handleChange('dailyReports', checked)} />
            <label className="text-sm font-medium cursor-pointer">Daily Reports</label>
          </div>
        </CardContent>
      </Card>

      {/* Publishing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Publishing Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox checked={settings.autoPublish} onCheckedChange={(checked) => handleChange('autoPublish', checked)} />
            <label className="text-sm font-medium cursor-pointer">Auto-Publish New Jobs</label>
          </div>
        </CardContent>
      </Card>

      {/* AI Job Matching Settings */}
      <Card>
        <CardHeader>
          <CardTitle>AI Job Matching Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Set the minimum match score threshold. Only jobs matching this score or higher will be shown to users.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Minimum Match Score Threshold (%)
              <span className="ml-2 text-lg font-bold text-blue-600">{settings.aiMinimumScore}%</span>
            </label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min="0"
                max="100"
                step="5"
                value={settings.aiMinimumScore}
                onChange={(e) => handleChange('aiMinimumScore', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-24"
              />
              <div className="flex gap-2">
                {[60, 70, 80, 90].map((score) => (
                  <Button
                    key={score}
                    variant={settings.aiMinimumScore === score ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleChange('aiMinimumScore', score)}
                  >
                    {score}%
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Jobs with a match score of {settings.aiMinimumScore}% or higher will be displayed to users on the best-fit-jobs page.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Settings */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys & Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">Keep your API keys confidential. Never share them publicly.</AlertDescription>
          </Alert>
          <div className="space-y-2">
            <label className="text-sm font-medium">Primary API Key</label>
            <div className="flex gap-2">
              <Input type="password" value="••••••••••••••••" readOnly className="bg-muted" />
              <Button variant="outline">Regenerate</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={loading} className="w-32">
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="outline" className="w-32">Reset to Default</Button>
      </div>
    </div>
  );
}
