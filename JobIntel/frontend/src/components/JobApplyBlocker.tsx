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
      {/* Disabled overlay */}
      <div
        className="opacity-50 cursor-not-allowed pointer-events-none"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {children}
      </div>

      {/* Hover Tooltip - Made very visible */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
        <div className="bg-gradient-to-br from-red-600 to-red-700 text-white px-4 py-3 rounded-lg shadow-2xl text-sm max-w-xs border-2 border-red-500">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2 font-bold">
            <Lock className="h-5 w-5" />
            <span>Premium Only</span>
          </div>

          {/* Message */}
          <p className="text-white text-sm mb-2">
            {permission?.reason || "You've used your free monthly apply limit. Upgrade to Premium for unlimited applies."}
          </p>

          {/* Reset Date if available */}
          {permission?.resetDate && (
            <div className="bg-red-800/50 rounded px-2 py-1.5 mb-2 flex items-center gap-2 border border-red-400/50">
              <Clock className="h-4 w-4 text-yellow-300 flex-shrink-0" />
              <div className="text-xs">
                <div className="font-semibold text-yellow-200">Next free action:</div>
                <div className="text-yellow-100">
                  {new Date(permission.resetDate).toLocaleDateString('en-US', { 
                    month: 'short', 
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
            className="w-full bg-white text-red-600 hover:bg-gray-100 font-bold py-2 px-3 rounded transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <Crown className="h-4 w-4" />
            Upgrade to Premium ₹99/year
          </button>
        </div>

        {/* Tooltip arrow pointing down */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
      </div>
    </div>
  );
};

export default JobApplyBlocker;
