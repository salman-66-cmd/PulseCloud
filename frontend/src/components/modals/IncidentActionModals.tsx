import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Incident } from '../../types';

interface AcknowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident | null;
  onConfirm: (note: string) => Promise<void>;
  isLoading?: boolean;
}

export const AcknowledgeModal: React.FC<AcknowledgeModalProps> = ({
  isOpen,
  onClose,
  incident,
  onConfirm,
  isLoading = false,
}) => {
  const [note, setNote] = useState('Incident acknowledged and under active investigation.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(note);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Acknowledge Incident" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600">
          Acknowledge incident <span className="font-semibold text-slate-800">#{incident?.id}: {incident?.title}</span>.
        </p>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Investigation Note</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full text-sm p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Acknowledge Incident
          </Button>
        </div>
      </form>
    </Modal>
  );
};

interface ResolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident | null;
  onConfirm: (resolutionNotes: string, rootCause: string) => Promise<void>;
  isLoading?: boolean;
}

export const ResolveModal: React.FC<ResolveModalProps> = ({
  isOpen,
  onClose,
  incident,
  onConfirm,
  isLoading = false,
}) => {
  const [resolutionNotes, setResolutionNotes] = useState('Service restarted and healthy response verified.');
  const [rootCause, setRootCause] = useState('Transient network or upstream dependency failure');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(resolutionNotes, rootCause);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resolve Incident" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600">
          Mark incident <span className="font-semibold text-slate-800">#{incident?.id}</span> as resolved and record post-mortem findings.
        </p>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Root Cause Analysis *</label>
          <input
            required
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value)}
            className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution Summary *</label>
          <textarea
            required
            rows={3}
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            className="w-full text-sm p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Resolve Incident
          </Button>
        </div>
      </form>
    </Modal>
  );
};

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: number | null;
  onConfirm: (message: string) => Promise<void>;
  isLoading?: boolean;
}

export const AddNoteModal: React.FC<AddNoteModalProps> = ({
  isOpen,
  onClose,
  incidentId,
  onConfirm,
  isLoading = false,
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    onConfirm(message);
    setMessage('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Investigation Note" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600">
          Append an update or investigation step to the timeline for incident #{incidentId}.
        </p>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Investigation Note *</label>
          <textarea
            required
            rows={3}
            placeholder="e.g. Scaling up ECS task replicas to handle increased ingress traffic..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full text-sm p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Add Timeline Entry
          </Button>
        </div>
      </form>
    </Modal>
  );
};
