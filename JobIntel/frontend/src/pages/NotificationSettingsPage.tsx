import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, Bell, Smartphone, MessageCircle, Mail } from 'lucide-react';

const ProfileSettingsPage = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testChannel, setTestChannel] = useState<'email' | 'whatsapp' | 'telegram'>('email');

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    whatsappNumber: user?.whatsappNumber || '',
    telegramId: user?.telegramId || '',
    telegramUsername: user?.telegramUsername || '',
  });

  const [preferences, setPreferences] = useState({
    email: true,
    whatsapp: false,
    telegram: false,
    newMatches: true,
    matchUpdates: true,
    skillRecommendations: true,
    applicationReminders: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPreferences();
    }
  }, [user, isAuthenticated]);

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/notifications/preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences || preferences);
        setProfileData(prev => ({
          ...prev,
          phoneNumber: user?.phoneNumber || '',
          whatsappNumber: user?.whatsappNumber || '',
          telegramId: user?.telegramId || '',
          telegramUsername: user?.telegramUsername || '',
        }));
      }
    } catch (error) {
;
    }
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handlePreferenceChange = (field: string, value: boolean | string) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phoneNumber: profileData.phoneNumber,
          whatsappNumber: profileData.whatsappNumber,
          telegramId: profileData.telegramId,
          telegramUsername: profileData.telegramUsername,
          notificationPrefs: preferences,
        }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update profile',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channel: testChannel }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: `Test ${testChannel} notification sent!`,
        });
        setTestDialogOpen(false);
      } else {
        toast({
          title: 'Error',
          description: `Failed to send test ${testChannel} notification`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test notification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Notification Settings</h1>

        <Tabs defaultValue="contact" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="contact">Contact Info</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          {/* Contact Information Tab */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Update your contact details for notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      type="text"
                      placeholder="Your name"
                      value={profileData.name}
                      onChange={e => handleProfileChange('name', e.target.value)}
                      disabled
                    />
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={profileData.email} disabled />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Phone Number
                    </Label>
                    <Input
                      type="tel"
                      placeholder="+91 99999 99999"
                      value={profileData.phoneNumber}
                      onChange={e => handleProfileChange('phoneNumber', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp Number
                    </Label>
                    <Input
                      type="tel"
                      placeholder="+91 99999 99999"
                      value={profileData.whatsappNumber}
                      onChange={e => handleProfileChange('whatsappNumber', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Telegram ID</Label>
                    <Input
                      type="text"
                      placeholder="Your Telegram ID"
                      value={profileData.telegramId}
                      onChange={e => handleProfileChange('telegramId', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Telegram Username</Label>
                    <Input
                      type="text"
                      placeholder="@your_username"
                      value={profileData.telegramUsername}
                      onChange={e => handleProfileChange('telegramUsername', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Channels Tab */}
          <TabsContent value="channels">
            <Card>
              <CardHeader>
                <CardTitle>Notification Channels</CardTitle>
                <CardDescription>Enable/disable notification channels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {/* Email */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-semibold">Email Notifications</p>
                        <p className="text-sm text-gray-600">Receive updates via email</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.email}
                      onCheckedChange={value => handlePreferenceChange('email', value)}
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-semibold">WhatsApp Messages</p>
                        <p className="text-sm text-gray-600">Get notifications on WhatsApp</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.whatsapp}
                      onCheckedChange={value => handlePreferenceChange('whatsapp', value)}
                    />
                  </div>

                  {/* Telegram */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-cyan-500" />
                      <div>
                        <p className="font-semibold">Telegram Messages</p>
                        <p className="text-sm text-gray-600">Receive alerts on Telegram</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.telegram}
                      onCheckedChange={value => handlePreferenceChange('telegram', value)}
                    />
                  </div>
                </div>

                <Button variant="outline" className="w-full" onClick={() => setTestDialogOpen(true)}>
                  Send Test Notification
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what notifications you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { key: 'newMatches', label: 'New Job Matches', icon: '🎯' },
                    { key: 'matchUpdates', label: 'Match Updates', icon: '📊' },
                    { key: 'skillRecommendations', label: 'Skill Recommendations', icon: '📈' },
                    { key: 'applicationReminders', label: 'Application Reminders', icon: '⏰' },
                  ].map(pref => (
                    <div key={pref.key} className="flex items-center justify-between p-3 border rounded">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <span>{pref.icon}</span>
                        <span className="font-medium">{pref.label}</span>
                      </label>
                      <Switch
                        checked={(preferences as any)[pref.key]}
                        onCheckedChange={value => handlePreferenceChange(pref.key, value)}
                      />
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Quiet Hours</h3>
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={preferences.quietHoursEnabled}
                      onCheckedChange={value => handlePreferenceChange('quietHoursEnabled', value)}
                    />
                    <span className="text-sm">Enable quiet hours</span>
                  </div>

                  {preferences.quietHoursEnabled && (
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={preferences.quietHoursStart}
                          onChange={e => handlePreferenceChange('quietHoursStart', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={preferences.quietHoursEnd}
                          onChange={e => handlePreferenceChange('quietHoursEnd', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="mt-6 flex gap-3">
          <Button
            size="lg"
            onClick={handleSaveProfile}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Test Notification Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Notification</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Select Channel</Label>
              <div className="space-y-2 mt-2">
                {(['email', 'whatsapp', 'telegram'] as const).map(channel => (
                  <div key={channel} className="flex items-center gap-2">
                    <input
                      type="radio"
                      id={channel}
                      name="channel"
                      value={channel}
                      checked={testChannel === channel}
                      onChange={e => setTestChannel(e.target.value as any)}
                    />
                    <Label htmlFor={channel} className="cursor-pointer capitalize">
                      {channel}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTestNotification} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileSettingsPage;
