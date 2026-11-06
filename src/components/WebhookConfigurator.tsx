import React, { useState, useEffect } from 'react';
import { Send, Plus, Trash2, CheckCircle2, AlertTriangle, Globe } from 'lucide-react';
import { WebhookConfigItem } from '../types.ts';
import {
  fetchWebhooksApi,
  createWebhookApi,
  deleteWebhookApi,
  testWebhookApi,
} from '../services/api.ts';

interface WebhookConfiguratorProps {
  onNotify?: (msg: string) => void;
}

export const WebhookConfigurator: React.FC<WebhookConfiguratorProps> = ({ onNotify }) => {
  const [webhooks, setWebhooks] = useState<WebhookConfigItem[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [targetType, setTargetType] = useState<'REST' | 'Slack' | 'Telegram'>('REST');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);

  const loadWebhooks = async () => {
    try {
      const data = await fetchWebhooksApi();
      setWebhooks(data);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadWebhooks();
  }, []);

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await createWebhookApi(name, url, targetType);
      setWebhooks((prev) => [created, ...prev]);
      setName('');
      setUrl('');
      onNotify?.(`Added Webhook '${created.name}' successfully.`);
    } catch (err: any) {
      onNotify?.(`Failed to add Webhook: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteWebhookApi(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      onNotify?.('Webhook configuration deleted.');
    } catch (err: any) {
      onNotify?.(`Failed to delete Webhook: ${err.message}`);
    }
  };

  const handleTest = async (w: WebhookConfigItem) => {
    setTestingId(w.id);
    try {
      const res = await testWebhookApi(w.url);
      onNotify?.(`Test payload dispatched to '${w.name}'. HTTP Status: ${res.http_status}`);
    } catch (err: any) {
      onNotify?.(`Webhook test failed: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-4 text-xs font-mono">
      {/* Add Webhook Form */}
      <form onSubmit={handleAddWebhook} className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-800 space-y-3">
        <div className="font-bold text-zinc-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-blue-400" />
          <span>Register New Webhook Endpoint</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input
            type="text"
            placeholder="Webhook Name (e.g. Safety Team Slack)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-zinc-100 placeholder-zinc-500 focus:border-blue-500"
            required
          />

          <input
            type="url"
            placeholder="Target URL (https://...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-zinc-100 placeholder-zinc-500 focus:border-blue-500 sm:col-span-1"
            required
          />

          <div className="flex gap-2">
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-200 focus:border-blue-500"
            >
              <option value="REST">Custom REST JSON</option>
              <option value="Slack">Slack Webhook</option>
              <option value="Telegram">Telegram Bot</option>
            </select>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition-colors disabled:opacity-50"
            >
              Add Webhook
            </button>
          </div>
        </div>
      </form>

      {/* Webhooks Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-zinc-300">
          <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] border-b border-zinc-800">
            <tr>
              <th className="px-3.5 py-2.5">Name</th>
              <th className="px-3.5 py-2.5">Type</th>
              <th className="px-3.5 py-2.5">Target Webhook URL</th>
              <th className="px-3.5 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-900/60">
            {webhooks.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3.5 py-4 text-center text-zinc-500">
                  No Webhook URLs configured. Emergency alert payloads will be logged to terminal.
                </td>
              </tr>
            ) : (
              webhooks.map((w) => (
                <tr key={w.id} className="hover:bg-zinc-800/50">
                  <td className="px-3.5 py-2.5 font-bold text-zinc-100">{w.name}</td>
                  <td className="px-3.5 py-2.5">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-blue-300 text-[10px]">
                      {w.target_type}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-zinc-400 font-mono text-[11px] truncate max-w-xs">
                    {w.url}
                  </td>
                  <td className="px-3.5 py-2.5 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleTest(w)}
                      disabled={testingId === w.id}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[10px] flex items-center gap-1 transition-colors"
                    >
                      <Send className="w-3 h-3 text-blue-400" />
                      {testingId === w.id ? 'Testing...' : 'Test'}
                    </button>
                    <button
                      onClick={() => handleDelete(w.id)}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete Webhook"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
