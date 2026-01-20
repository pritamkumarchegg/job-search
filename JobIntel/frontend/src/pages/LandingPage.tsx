import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Bell,
  Search,
  Bot,
  Rocket,
  Shield,
  Users,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Mail,
  Send,
  Building2,
  TrendingUp,
  Clock,
  Star,
} from 'lucide-react';
import { mockJobs, mockCompanies } from '@/data/mockData';

const LandingPage = () => {
  const stats = [
    { value: '50K+', label: 'Active Jobs' },
    { value: '10K+', label: 'Companies' },
    { value: '100K+', label: 'Job Seekers' },
    { value: '95%', label: 'Match Rate' },
  ];

  const features = [
    {
      icon: Bot,
      title: 'AI-Powered Matching',
      description: 'Our AI analyzes your profile and matches you with the most relevant opportunities with confidence scores.',
    },
    {
      icon: Zap,
      title: 'Early Job Detection',
      description: 'We monitor company career pages 24/7 and notify you before jobs go viral.',
    },
    {
      icon: Bell,
      title: 'Instant Notifications',
      description: 'Get notified via WhatsApp, Email, or Telegram the moment a matching job is posted.',
    },
    {
      icon: Rocket,
      title: 'Auto-Apply (Premium)',
      description: 'Let our AI apply to jobs on your behalf with personalized cover letters. (Premium feature)',
    },
    {
      icon: Shield,
      title: 'Verified Referrals',
      description: 'Connect with verified employees for genuine referral opportunities.',
    },
    {
      icon: Users,
      title: 'Smart Tracking',
      description: 'Track all your applications in one place with status updates and insights.',
    },
  ];

  const testimonials = [
    {
      name: 'Priya Sharma',
      role: 'Software Engineer at Google',
      image: 'PS',
      content: 'JobIntel helped me land my dream job at Google! The AI matching is incredibly accurate.',
    },
    {
      name: 'Rahul Verma',
      role: 'Product Manager at Meta',
      image: 'RV',
      content: 'The early notifications gave me a huge advantage. I was among the first to apply!',
    },
    {
      name: 'Ananya Patel',
      role: 'Data Scientist at Amazon',
      image: 'AP',
      content: 'The auto-apply feature saved me hours. Best investment for my job search.',
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 gradient-hero opacity-95" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="container relative mx-auto px-4 py-24 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-6 bg-white/20 text-white border-white/30">
              <Zap className="mr-1 h-3 w-3" />
              AI-Powered Job Intelligence
            </Badge>
            
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl animate-fade-in">
              Find Your Dream Job
              <br />
              <span className="text-white/90">Before Anyone Else</span>
            </h1>
            
            <p className="mb-8 text-lg text-white/80 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Get instant notifications for jobs that match your profile. Our AI monitors thousands of company career pages and alerts you the moment relevant opportunities appear.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <Link to="/register">
                <Button size="xl" className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 font-semibold">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/jobs">
                <Button variant="heroOutline" size="xl" className="w-full sm:w-auto">
                  <Search className="mr-2 h-5 w-5" />
                  Browse Jobs
                </Button>
              </Link>
            </div>

            {/* Notification channels */}
            <div className="mt-12 flex items-center justify-center gap-6 text-white/70 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <span className="text-sm">Get notified via:</span>
              <div className="flex gap-4">
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-sm">WhatsApp</span>
                </div>
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Email</span>
                </div>
                <div className="flex items-center gap-1">
                  <Send className="h-4 w-4" />
                  <span className="text-sm">Telegram</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(var(--background))"/>
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="text-center animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-3xl md:text-4xl font-bold text-gradient-hero mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Land Your Dream Job
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From AI-powered matching to instant notifications, we've built every feature job seekers need.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-card rounded-xl p-6 border border-border shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg gradient-hero mb-4">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Jobs Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Badge variant="new"><span>Hot Jobs</span></Badge>
              <h2 className="text-2xl md:text-3xl font-bold">Featured Opportunities</h2>
            </div>
            <Link to="/jobs">
              <Button variant="outline">
                View All Jobs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockJobs.slice(0, 3).map((job, index) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="block animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="bg-card rounded-xl p-6 border border-border shadow-soft job-card-hover h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold line-clamp-1">{job.title}</h3>
                        <p className="text-sm text-muted-foreground">{job.company.name}</p>
                      </div>
                    </div>
                    {job.isHot && <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-destructive/15 text-destructive border-transparent"><span>🔥 Hot</span></div>}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary border-transparent"><span>{job.type}</span></div>
                    {job.isRemote && <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-info/15 text-info border-transparent"><span>Remote</span></div>}
                    <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-foreground border-border"><span>{job.location}</span></div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {job.description}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(job.postedAt).toLocaleDateString()}</span>
                    </div>
                    {job.matchScore && (
                      <div className="flex items-center gap-1 text-accent font-medium">
                        <TrendingUp className="h-4 w-4" />
                        <span>{job.matchScore}% Match</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* All Jobs Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4"><span>All Jobs</span></Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Browse All Available Opportunities
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore our complete database of 400+ job listings with detailed information about companies, roles, and requirements.
            </p>
          </div>

          <div className="text-center">
            <Link to="/all-jobs">
              <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                View All Jobs
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          <div className="mt-12 text-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-card rounded-xl p-6 border border-border">
                <div className="text-4xl font-bold text-primary mb-2">400+</div>
                <p className="text-muted-foreground">Active Job Listings</p>
              </div>
              <div className="bg-card rounded-xl p-6 border border-border">
                <div className="text-4xl font-bold text-accent mb-2">100+</div>
                <p className="text-muted-foreground">Partner Companies</p>
              </div>
              <div className="bg-card rounded-xl p-6 border border-border">
                <div className="text-4xl font-bold text-primary mb-2">Multiple</div>
                <p className="text-muted-foreground">Roles & Locations</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4"><span>Testimonials</span></Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Loved by Job Seekers
            </h2>
            <p className="text-muted-foreground">
              Join thousands of professionals who found their dream jobs through JobIntel.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.name}
                className="bg-card rounded-xl p-6 border border-border shadow-soft animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                    {testimonial.image}
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-2xl gradient-hero p-8 md:p-12 lg:p-16 text-center">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Accelerate Your Job Search?
              </h2>
              <p className="text-white/80 mb-8 max-w-2xl mx-auto">
                Join thousands of job seekers who are getting matched with their dream jobs before anyone else.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="heroOutline" size="lg">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Companies Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <p className="text-center text-muted-foreground mb-8">
            Trusted by candidates hired at top companies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            {mockCompanies.slice(0, 6).map((company) => (
              <div key={company.id} className="text-xl font-bold text-muted-foreground">
                {company.name}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
