import React, { useState, useEffect } from 'react';
import { FileText, Plus, Send, Eye, CheckCircle2, XCircle, Clock, MoreVertical, Download, Edit, Trash2, CreditCard, RefreshCcw } from 'lucide-react';
import { Invoice } from '../../types';
import { useInvoices } from '../../lib/supabase/hooks/useInvoices';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { InvoiceForm } from './InvoiceForm';

interface InvoicesListProps {
  onGeneratePdf?: () => void;
  leadId?: string;
  projectId?: string;
}

export const InvoicesList: React.FC<InvoicesListProps> = ({ onGeneratePdf, leadId, projectId }) => {
  const { getInvoices, deleteInvoice, sendInvoice } = useInvoices();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, [leadId, projectId]);

  const loadInvoices = async () => {
    setLoading(true);
    const data = await getInvoices({ leadId, projectId });
    setInvoices(data);
    setLoading(false);
  };

  const handleCreate = () => {
    setSelectedInvoice(null);
    setIsFormOpen(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsFormOpen(true);
  };

  const handleDelete = async (invoiceId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
      await deleteInvoice(invoiceId);
      await loadInvoices();
    }
  };

  const handleSend = async (invoice: Invoice) => {
    if (invoice.clientEmail) {
      await sendInvoice(invoice.id, invoice.clientEmail);
      await loadInvoices();
    }
  };

  const getStatusBadge = (status: Invoice['status']) => {
    const statusConfig = {
      draft: { label: 'Brouillon', color: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300', icon: FileText },
      sent: { label: 'Envoyée', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', icon: Send },
      viewed: { label: 'Vue', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400', icon: Eye },
      paid: { label: 'Payée', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', icon: CheckCircle2 },
      overdue: { label: 'En retard', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400', icon: XCircle },
      cancelled: { label: 'Annulée', color: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300', icon: XCircle },
      refunded: { label: 'Remboursée', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', icon: RefreshCcw },
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

  if (invoices.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm p-8 text-center text-slate-400 dark:text-slate-500">
        <FileText size={48} className="mx-auto mb-4 opacity-20" />
        <p className="mb-4">Aucune facture.</p>
        <Button onClick={handleCreate} variant="outline" icon={Plus}>
          Créer la première facture
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-[30px] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 dark:text-white">Factures ({invoices.length})</h3>
          <div className="flex gap-2">
            <Button onClick={onGeneratePdf} size="sm" variant="outline" icon={Download}>
              Export
            </Button>
            <Button onClick={handleCreate} size="sm" icon={Plus}>
              Nouvelle facture
            </Button>
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-500">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-slate-900 dark:text-white">{invoice.invoiceNumber}</h4>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{invoice.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{invoice.clientName} {invoice.clientCompany && `• ${invoice.clientCompany}`}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                    <span>Émise le {new Date(invoice.issuedDate).toLocaleDateString('fr-FR')}</span>
                    {invoice.dueDate && (
                      <span>Échéance: {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</span>
                    )}
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {invoice.total.toLocaleString('fr-FR')} {invoice.currency}
                    </span>
                    {invoice.amountDue > 0 && (
                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                        Reste: {invoice.amountDue.toLocaleString('fr-FR')} {invoice.currency}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {invoice.status === 'draft' && invoice.clientEmail && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Send}
                      onClick={() => handleSend(invoice)}
                    >
                      Envoyer
                    </Button>
                  )}
                  {invoice.amountDue > 0 && invoice.stripePaymentIntentId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={CreditCard}
                      onClick={() => {
                        // TODO: Open Stripe payment modal
                        console.log('Open Stripe payment');
                      }}
                    >
                      Payer
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Edit}
                    onClick={() => handleEdit(invoice)}
                  >
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    onClick={() => handleDelete(invoice.id)}
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

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={selectedInvoice ? 'Modifier la facture' : 'Nouvelle facture'} size="large">
        <InvoiceForm
          invoice={selectedInvoice}
          onSuccess={() => {
            setIsFormOpen(false);
            loadInvoices();
          }}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>
    </>
  );
};

