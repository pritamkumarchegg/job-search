import React, { useEffect, useState } from 'react';
import {
  Lock,
  Clock,
  Crown,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';

interface JobApplyBlockerProps {
  jobId: string;
  actionType: 'apply' | 'viewDetails';
  children?: React.ReactNode;
  onActionAllowed?: () => void;
  disabled?: boolean;
}

export interface ActionPermission {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  resetDate?: Date;
}

const JobApplyBlocker: React.FC<JobApplyBlockerProps> = ({
  jobId,
  actionType,
  children,
  onActionAllowed,
  disabled = false,
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [permission, setPermission] = useState<ActionPermission | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    const checkPermission = async () => {
      try {
        setLoading(true);
        const base = import.meta.env.VITE_API_URL || '';
        const url = base
          ? `${base.replace(/\/$/, '')}/api/usage/can-action/${jobId}/${actionType}`
          : `/api/usage/can-action/${jobId}/${actionType}`;

        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(url, { headers });
        if (response.ok) {
          const data = await response.json();
          setPermission(data);
        } else {
          console.error('Failed to check permission');
          setPermission({ allowed: false, reason: 'Permission check failed' });
        }
      } catch (err) {
        console.error('Error checking permission:', err);
        setPermission({ allowed: false, reason: 'Error checking permission' });
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [jobId, actionType, isAuthenticated, user]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // If not allowed, don't do anything (tooltip will show on hover)
    if (!permission?.allowed) {
      return;
    }

    // Log the action
    try {
      const base = import.meta.env.VITE_API_URL || '';
      const url = base
        ? `${base.replace(/\/$/, '')}/api/usage/log-action`
        : `/api/usage/log-action`;

      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jobId, actionType }),
      });

      if (response.ok) {
        onActionAllowed?.();
      }
    } catch (err) {
      console.error('Error logging action:', err);
    }
  };

  if (loading) {
    return <div className="inline-block">{children}</div>;
  }

  // If user is not authenticated, render children as-is
  if (!isAuthenticated) {
    return (
      <div onClick={handleClick} className="inline-block cursor-pointer">
        {children}
      </div>
    );
  }

  // If user is premium, render children as-is
  if (permission?.allowed) {
    return (
      <div onClick={handleClick} className="inline-block cursor-pointer">
        {children}
      </div>
    );
  }

  // User is free and exceeded limit - show disabled with hover tooltip
  return (
    <div className="relative inline-block group">
      {/* Disabled overlay - make it look obviously disabled */}
      <div
        className="relative opacity-40 cursor-not-allowed pointer-events-none"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {children}
      </div>

      {/* Premium Lock Badge - shown on top */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="bg-red-600 text-white rounded-full p-2 shadow-lg">
          <Lock className="h-6 w-6" />
        </div>
      </div>

      {/* Hover Tooltip - Made very visible with fixed positioning fallback */}
      <div className="absolute -top-48 left-1/2 transform -translate-x-1/2 z-[9999] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
        <div className="bg-gradient-to-br from-red-600 via-red-600 to-red-700 text-white px-5 py-4 rounded-xl shadow-2xl text-sm w-72 border-2 border-red-400 animate-pulse">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3 font-bold text-base">
            <Lock className="h-6 w-6 flex-shrink-0" />
            <span>Premium Only</span>
          </div>

          {/* Message */}
          <p className="text-white text-sm mb-3 font-semibold">
            {permission?.reason || "You've used your free monthly apply limit. Upgrade to Premium for unlimited applies."}
          </p>

          {/* Reset Date if available */}
          {permission?.resetDate && (
            <div className="bg-red-800/70 rounded-lg px-3 py-2 mb-3 flex items-center gap-2 border-2 border-yellow-300/50">
              <Clock className="h-5 w-5 text-yellow-300 flex-shrink-0" />
              <div className="text-xs">
                <div className="font-bold text-yellow-200">Next free action:</div>
                <div className="text-yellow-100 font-semibold text-sm">
                  {new Date(permission.resetDate).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>
          )}

          {/* CTA Button in Tooltip */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate('/pricing');
            }}
            className="w-full bg-white text-red-600 hover:bg-yellow-100 font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 mb-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Crown className="h-5 w-5" />
            Upgrade Now - ₹99/year
          </button>

          <p className="text-xs text-yellow-100 text-center">
            ✓ Unlimited applies • ✓ Early access • ✓ No limits
          </p>
        </div>

        {/* Tooltip arrow pointing down */}
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-red-600 drop-shadow-lg"></div>
      </div>
    </div>
  );
};

export default JobApplyBlocker;
