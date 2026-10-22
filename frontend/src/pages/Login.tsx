import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Activity, Lock, Mail, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@pulsecloud.io',
      password: 'Admin123!',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(data);
      login(res.data.access_token, res.data.user);
      showToast(`Welcome back, ${res.data.user.full_name || 'Admin'}!`, 'success');
      navigate('/');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Invalid email or password', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (email: string, pass: string) => {
    setValue('email', email);
    setValue('password', pass);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-blue via-brand-cyan to-brand-violet text-white shadow-xl shadow-blue-500/30 mb-4">
            <Activity className="w-7 h-7 animate-pulse" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">PulseCloud</h1>
          <p className="text-xs text-slate-500 mt-1">Cloud API Health & Performance Monitor</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xl p-8 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-1">Sign in to your dashboard</h2>
          <p className="text-xs text-slate-500 mb-6">Enter your authorized enterprise credentials</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  {...register('email')}
                  placeholder="admin@pulsecloud.io"
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  {...register('password')}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>}
            </div>

            <Button variant="primary" type="submit" isLoading={isLoading} className="w-full py-2.5 text-xs mt-2">
              Sign In to PulseCloud
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Instant Demo Credentials (1-Click Fill)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin@pulsecloud.io', 'Admin123!')}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50/50 hover:bg-blue-50/30 transition-all text-xs"
              >
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <UserCheck className="w-3.5 h-3.5 text-brand-blue" />
                  <span>Admin</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">admin@pulsecloud.io</p>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('engineer@pulsecloud.io', 'DevOps123!')}
                className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50/50 hover:bg-blue-50/30 transition-all text-xs"
              >
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <UserCheck className="w-3.5 h-3.5 text-cyan-600" />
                  <span>DevOps</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">engineer@pulsecloud.io</p>
              </button>
            </div>
          </div>
        </div>

        {/* Register Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Don't have an enterprise account?{' '}
          <Link to="/register" className="font-semibold text-brand-blue hover:text-blue-700">
            Register now
          </Link>
        </p>
      </div>
    </div>
  );
};
