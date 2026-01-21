import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { ResumeUpload } from '@/components/ResumeUpload';
import { Loader2, User, Mail, Phone, Briefcase, MessageCircle, Send } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    phoneNumber: user?.phoneNumber || '',
    whatsappNumber: user?.whatsappNumber || '',
    telegramId: user?.telegramId || '',
    telegramUsername: user?.telegramUsername || '',
    bio: user?.bio || '',
    skills: (user?.skills || []).join(', '),
    location: user?.location || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          phoneNumber: formData.phoneNumber,
          whatsappNumber: formData.whatsappNumber,
          telegramId: formData.telegramId,
          telegramUsername: formData.telegramUsername,
          bio: formData.bio,
          skills: formData.skills.split(',').map(s => s.trim()),
          location: formData.location,
        }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your profile information and preferences.
        </p>
      </div>

      {/* Resume Upload */}
      <ResumeUpload />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your full name"
              />
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                placeholder="Your email"
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
            </div>

            <div>
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div>
              <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Primary Phone Number
              </Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="+91 99999 99999"
              />
            </div>

            <div>
              <Label htmlFor="whatsappNumber" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                WhatsApp Number
              </Label>
              <Input
                id="whatsappNumber"
                name="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={handleChange}
                placeholder="+91 99999 99999"
              />
              <p className="text-xs text-muted-foreground mt-1">We'll send job notifications here</p>
            </div>

            <div>
              <Label htmlFor="telegramId" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Telegram ID
              </Label>
              <Input
                id="telegramId"
                name="telegramId"
                value={formData.telegramId}
                onChange={handleChange}
                placeholder="Your numeric Telegram ID"
              />
              <p className="text-xs text-muted-foreground mt-1">Get your ID from @userinfobot on Telegram</p>
            </div>

            <div>
              <Label htmlFor="telegramUsername" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Telegram Username
              </Label>
              <Input
                id="telegramUsername"
                name="telegramUsername"
                value={formData.telegramUsername}
                onChange={handleChange}
                placeholder="@your_username"
              />
              <p className="text-xs text-muted-foreground mt-1">Optional: Your Telegram @username</p>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="City, Country"
              />
            </div>

            <div>
              <Label htmlFor="skills" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Skills
              </Label>
              <Textarea
                id="skills"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                placeholder="Separate skills with commas (e.g., JavaScript, React, Node.js)"
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated list of your skills
              </p>
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself"
                className="resize-none h-24"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}