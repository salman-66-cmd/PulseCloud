import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Endpoint } from '../../types';

const endpointSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  url: z.string().url('Must be a valid HTTP or HTTPS URL'),
  method: z.enum(['GET', 'POST', 'HEAD', 'PUT', 'DELETE']),
  environment: z.enum(['Production', 'Staging', 'Development', 'Internal']),
  expected_status_codes: z.string().min(1, 'Expected status codes required (e.g. 200, 201)'),
  check_interval_seconds: z.coerce.number().min(10).max(3600),
  timeout_seconds: z.coerce.number().min(1).max(60),
  latency_threshold_ms: z.coerce.number().min(50).max(30000),
  tags: z.string().optional(),
  headers_json: z.string().optional(),
  body_payload: z.string().optional(),
  json_body_assertion: z.string().optional(),
});

type EndpointFormData = z.infer<typeof endpointSchema>;

interface EndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EndpointFormData) => Promise<void>;
  initialData?: Endpoint | null;
  isLoading?: boolean;
}

export const EndpointModal: React.FC<EndpointModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EndpointFormData>({
    resolver: zodResolver(endpointSchema),
    defaultValues: {
      name: '',
      url: 'https://',
      method: 'GET',
      environment: 'Production',
      expected_status_codes: '200',
      check_interval_seconds: 60,
      timeout_seconds: 10,
      latency_threshold_ms: 800,
      tags: '',
      headers_json: '',
      body_payload: '',
      json_body_assertion: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        url: initialData.url,
        method: initialData.method,
        environment: initialData.environment,
        expected_status_codes: initialData.expected_status_codes,
        check_interval_seconds: initialData.check_interval_seconds,
        timeout_seconds: initialData.timeout_seconds,
        latency_threshold_ms: initialData.latency_threshold_ms,
        tags: initialData.tags || '',
        headers_json: initialData.headers_json || '',
        body_payload: initialData.body_payload || '',
        json_body_assertion: initialData.json_body_assertion || '',
      });
    } else {
      reset({
        name: '',
        url: 'https://',
        method: 'GET',
        environment: 'Production',
        expected_status_codes: '200',
        check_interval_seconds: 60,
        timeout_seconds: 10,
        latency_threshold_ms: 800,
        tags: '',
        headers_json: '',
        body_payload: '',
        json_body_assertion: '',
      });
    }
  }, [initialData, reset, isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Monitored Endpoint' : 'Register New API Endpoint'}
      subtitle="Configure target URL, health rules, request timeouts, and degradation thresholds."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name and Environment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Endpoint Name *</label>
            <input
              {...register('name')}
              placeholder="e.g. Production Payment API"
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Environment</label>
            <select
              {...register('environment')}
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="Production">Production</option>
              <option value="Staging">Staging</option>
              <option value="Development">Development</option>
              <option value="Internal">Internal</option>
            </select>
          </div>
        </div>

        {/* URL and Method */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">HTTP Method</label>
            <select
              {...register('method')}
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="HEAD">HEAD</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Endpoint URL *</label>
            <input
              {...register('url')}
              placeholder="https://api.service.com/v1/health"
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            {errors.url && <p className="text-xs text-rose-500 mt-1">{errors.url.message}</p>}
          </div>
        </div>

        {/* Check Interval, Timeout, Latency Threshold */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Interval (seconds)</label>
            <select
              {...register('check_interval_seconds')}
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value={15}>Every 15s (Aggressive)</option>
              <option value={30}>Every 30s</option>
              <option value={60}>Every 1 min (Standard)</option>
              <option value={300}>Every 5 mins</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Timeout (seconds)</label>
            <input
              type="number"
              step="0.5"
              {...register('timeout_seconds')}
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Latency Degraded (ms)</label>
            <input
              type="number"
              {...register('latency_threshold_ms')}
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Expected Status Codes and Tags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Status Codes</label>
            <input
              {...register('expected_status_codes')}
              placeholder="e.g. 200, 201, 204"
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tags (Comma-separated)</label>
            <input
              {...register('tags')}
              placeholder="e.g. core, payments, stripe"
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Optional JSON Body Assertion */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Optional JSON Body Assertion (Key-Value match)
          </label>
          <input
            {...register('json_body_assertion')}
            placeholder='e.g. {"status": "online"}'
            className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            {initialData ? 'Save Changes' : 'Register Endpoint'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
