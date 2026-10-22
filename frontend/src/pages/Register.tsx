import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Activity, Lock, Mail, User, ShieldCheck } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';

const registerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'user']),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'user',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(data);
      login(res.data.access_token, res.data.user);
      showToast('Account created successfully!', 'success');
      navigate('/');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Registration failed', 'error');
    } finally {
      setIsLoading(false);
    }
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
          <p className="text-xs text-slate-500 mt-1">Create an Enterprise Monitoring Account</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xl p-8 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-1">Get started with PulseCloud</h2>
          <p className="text-xs text-slate-500 mb-6">Register to manage API health, SLA tracking, and alerts</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  {...register('full_name')}
                  placeholder="Alex Mercer"
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {errors.full_name && <p className="text-xs text-rose-500 mt-1">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  {...register('email')}
                  placeholder="alex@company.com"
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Role</label>
              <select
                {...register('role')}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="user">Standard User (Developer / SRE)</option>
                <option value="admin">System Administrator (Full Control)</option>
              </select>
            </div>

            <Button variant="primary" type="submit" isLoading={isLoading} className="w-full py-2.5 text-xs mt-2">
              Create Account
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-blue hover:text-blue-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
