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

      {/* Hover Tooltip - Contained within viewport */}
      <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 z-[9999] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto max-w-screen">
        <div className="bg-gradient-to-br from-red-600 via-red-600 to-red-700 text-white px-6 py-2 rounded-lg shadow-2xl text-sm w-80 border-2 border-red-400 animate-pulse whitespace-nowrap overflow-hidden">
          {/* Header + Message in one line */}
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-bold text-base">Premium Only</span>
              <span className="mx-2">•</span>
              <span className="text-white text-xs truncate">
                {permission?.reason?.substring(0, 40) || "Upgrade for unlimited"}
              </span>
            </div>
          </div>

          {/* Reset Date if available */}
          {permission?.resetDate && (
            <div className="text-xs text-yellow-100 mt-1 ml-8">
              Next: {new Date(permission.resetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate('/pricing');
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white text-red-600 hover:bg-yellow-100 font-bold py-1.5 px-3 rounded transition-all flex items-center gap-1 text-xs whitespace-nowrap"
          >
            <Crown className="h-3.5 w-3.5" />
            Upgrade
          </button>
        </div>

        {/* Arrow */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 border-6 border-transparent border-t-red-600"></div>
      </div>
    </div>
  );
};

export default JobApplyBlocker;
