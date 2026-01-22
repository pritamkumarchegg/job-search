import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bell, Lock, Eye, Download, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    jobAlerts: true,
    applicationUpdates: true,
    weeklyDigest: true,
  });

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/users/preferences', {
        method: 'PUT',
        headers,
        body: JSON.stringify(notifications),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Notification settings updated',
        });
      }
    } catch (err) {
;
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out',
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your account preferences and settings.
        </p>
      </div>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Control when and how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notif">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates via email
              </p>
            </div>
            <Switch
              id="email-notif"
              checked={notifications.emailNotifications}
              onCheckedChange={(val) => handleNotificationChange('emailNotifications', val)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="job-alerts">Job Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about new job matches
              </p>
            </div>
            <Switch
              id="job-alerts"
              checked={notifications.jobAlerts}
              onCheckedChange={(val) => handleNotificationChange('jobAlerts', val)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="app-updates">Application Updates</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about your application status
              </p>
            </div>
            <Switch
              id="app-updates"
              checked={notifications.applicationUpdates}
              onCheckedChange={(val) => handleNotificationChange('applicationUpdates', val)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="weekly">Weekly Digest</Label>
              <p className="text-sm text-muted-foreground">
                Receive weekly job search summary
              </p>
            </div>
            <Switch
              id="weekly"
              checked={notifications.weeklyDigest}
              onCheckedChange={(val) => handleNotificationChange('weeklyDigest', val)}
            />
          </div>

          <Button onClick={handleSaveNotifications} disabled={loading} className="w-full">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? 'Saving...' : 'Save Preferences'}
          </Button>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Privacy & Security
          </CardTitle>
          <CardDescription>
            Manage your account security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full justify-start">
            <Eye className="h-4 w-4 mr-2" />
            Change Password
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Download className="h-4 w-4 mr-2" />
            Download Your Data
          </Button>
          <p className="text-xs text-muted-foreground">
            For security reasons, you'll be directed to a secure page to change your password.
          </p>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Account</CardTitle>
          <CardDescription>
            Manage your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive"
          >
            Delete Account
          </Button>
          <p className="text-xs text-muted-foreground">
            Deleting your account is permanent and cannot be undone.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}