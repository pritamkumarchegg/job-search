import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/store/authStore';
import { Zap, Mail, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Upload, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isLoading } = useAuthStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  // Get the redirect destination from location state
  const from = (location.state as any)?.from || '/dashboard';

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a PDF or DOCX file');
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF or DOCX file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB max)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB',
        variant: 'destructive',
      });
      return;
    }

    setResumeFile(selectedFile);
    setError('');
  };

  const handleRemoveResume = () => {
    setResumeFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadResume = async (token: string): Promise<boolean> => {
    if (!resumeFile) return true; // Skip if no resume

    try {
      setUploadingResume(true);
      const formData = new FormData();
      formData.append('file', resumeFile);

      const res = await fetch('/api/resume/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Resume uploaded!',
          description: `Resume parsed and job matching started (${data.parsedResume?.skills?.length || 0} skills found)`,
        });
        return true;
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload resume');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload resume';
      toast({
        title: 'Resume upload failed',
        description: errorMessage,
        variant: 'destructive',
      });
      console.error('Resume upload error:', err);
      return false;
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!passwordRequirements.every(req => req.met)) {
      setError('Password does not meet requirements');
      return;
    }

    if (!acceptTerms) {
      setError('Please accept the terms and conditions');
      return;
    }

    const success = await register(email, password, name);
    
    if (success) {
      // Get token from localStorage after registration
      const token = localStorage.getItem('token');
      
      // Upload resume if provided
      if (resumeFile && token) {
        const resumeSuccess = await uploadResume(token);
        if (!resumeSuccess) {
          // Resume upload failed but account was created, show warning
          toast({
            title: 'Account created, but resume upload failed',
            description: 'You can upload your resume later in your profile',
            variant: 'destructive',
          });
        }
      }

      toast({
        title: 'Account created!',
        description: 'Welcome to JobIntel. Start exploring jobs now.',
      });
      setRedirecting(true);
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 2000);
    } else {
      setError('Registration failed. Please try again.');
    }
  };

  const benefits = [
    'Personalized job matches based on your skills',
    'Instant notifications via WhatsApp, Email & Telegram',
    'Track all your applications in one place',
    'Access to verified employee referrals',
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-hero">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold">
              Job<span className="text-gradient-hero">Intel</span>
            </span>
          </Link>

          <h1 className="text-3xl font-bold mb-2">Create your account</h1>
          <p className="text-muted-foreground mb-8">
            Start your journey to finding the perfect job
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Resume Upload Section */}
            <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Label className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                <Upload className="h-4 w-4" />
                Upload Resume (Optional)
              </Label>
              <p className="text-xs text-blue-800">
                Upload your resume now and we'll automatically find the best jobs for you. You can also do this later in your profile.
              </p>
              
              {resumeFile ? (
                <div className="flex items-center justify-between p-3 bg-white border border-blue-300 rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">{resumeFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveResume}
                    className="text-destructive hover:bg-destructive/10 p-1 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label
                    htmlFor="resume-upload"
                    className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50/50 transition-colors"
                  >
                    <Upload className="h-5 w-5 text-blue-600 mb-2" />
                    <span className="text-sm font-medium text-blue-700">Click to upload</span>
                    <span className="text-xs text-blue-600">PDF or DOCX (max 5MB)</span>
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-1 mt-2">
                  {passwordRequirements.map((req) => (
                    <div
                      key={req.label}
                      className={`flex items-center gap-2 text-xs ${
                        req.met ? 'text-success' : 'text-muted-foreground'
                      }`}
                    >
                      <CheckCircle2 className={`h-3 w-3 ${req.met ? 'opacity-100' : 'opacity-30'}`} />
                      {req.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                I agree to the{' '}
                <Link to="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading || redirecting || uploadingResume}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : uploadingResume ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading resume...
                </span>
              ) : redirecting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Redirecting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 items-center justify-center gradient-hero p-8">
        <div className="max-w-md text-white">
          <h2 className="text-3xl font-bold mb-6">
            Why Join JobIntel?
          </h2>
          <div className="space-y-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-white/90">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-white/10 backdrop-blur-sm rounded-xl">
            <p className="text-white/80 italic mb-4">
              "JobIntel helped me discover opportunities I never would have found on my own. The AI matching is incredibly accurate!"
            </p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-semibold">
                AS
              </div>
              <div>
                <p className="font-medium">Arjun Singh</p>
                <p className="text-sm text-white/70">Software Engineer at Microsoft</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
