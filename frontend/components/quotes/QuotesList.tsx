import React, { useState, useEffect } from 'react';
import { FileText, Plus, Send, Eye, CheckCircle2, XCircle, Clock, MoreVertical, Download, Edit, Trash2 } from 'lucide-react';
import { Quote } from '../../types';
import { useQuotes } from '../../lib/supabase/hooks/useQuotes';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { QuoteForm } from './QuoteForm';

interface QuotesListProps {
  onCreate?: () => void;
  leadId?: string;
  projectId?: string;
}

export const QuotesList: React.FC<QuotesListProps> = ({ onCreate, leadId, projectId }) => {
  const { getQuotes, deleteQuote, sendQuote } = useQuotes();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuotes();
  }, [leadId, projectId]);

  const loadQuotes = async () => {
    setLoading(true);
    const data = await getQuotes({ leadId, projectId });
    setQuotes(data);
    setLoading(false);
  };

  const handleCreate = () => {
    setSelectedQuote(null);
    setIsFormOpen(true);
    onCreate?.();
  };

  const handleEdit = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsFormOpen(true);
  };

  const handleDelete = async (quoteId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) {
      await deleteQuote(quoteId);
      await loadQuotes();
    }
  };

  const handleSend = async (quote: Quote) => {
    if (quote.clientEmail) {
      await sendQuote(quote.id, quote.clientEmail);
      await loadQuotes();
    }
  };

  const getStatusBadge = (status: Quote['status']) => {
    const statusConfig = {
      draft: { label: 'Brouillon', color: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300', icon: FileText },
      sent: { label: 'Envoyé', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', icon: Send },
      viewed: { label: 'Vu', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400', icon: Eye },
      accepted: { label: 'Accepté', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', icon: CheckCircle2 },
      rejected: { label: 'Refusé', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400', icon: XCircle },
      expired: { label: 'Expiré', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', icon: Clock },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon size={12} className="mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm p-8 text-center text-slate-900 dark:text-white">
        <div className="animate-pulse">Chargement...</div>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm p-8 text-center text-slate-400 dark:text-slate-500">
        <FileText size={48} className="mx-auto mb-4 opacity-20" />
        <p className="mb-4">Aucun devis généré.</p>
        <Button onClick={handleCreate} variant="outline" icon={Plus}>
          Créer le premier devis
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 dark:text-white">Devis ({quotes.length})</h3>
          <Button onClick={handleCreate} size="sm" icon={Plus}>
            Nouveau devis
          </Button>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {quotes.map((quote) => (
            <div key={quote.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-500">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-slate-900 dark:text-white">{quote.quoteNumber}</h4>
                    {getStatusBadge(quote.status)}
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{quote.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{quote.clientName} {quote.clientCompany && `• ${quote.clientCompany}`}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                    <span>Créé le {new Date(quote.createdAt).toLocaleDateString('fr-FR')}</span>
                    {quote.validUntil && (
                      <span>Valide jusqu'au {new Date(quote.validUntil).toLocaleDateString('fr-FR')}</span>
                    )}
                    <span className="font-bold text-slate-700 dark:text-slate-300">{quote.total.toLocaleString('fr-FR')} {quote.currency}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {quote.status === 'draft' && quote.clientEmail && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Send}
                      onClick={() => handleSend(quote)}
                    >
                      Envoyer
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Edit}
                    onClick={() => handleEdit(quote)}
                  >
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    onClick={() => handleDelete(quote.id)}
                    className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={selectedQuote ? 'Modifier le devis' : 'Nouveau devis'} size="large">
        <QuoteForm
          quote={selectedQuote}
          onSuccess={() => {
            setIsFormOpen(false);
            loadQuotes();
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>
    </>
  );
};

