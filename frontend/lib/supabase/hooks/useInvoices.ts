import { useState, useCallback } from 'react';
import { Invoice, InvoiceItem } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { logError, logInfo } from '../../utils/logger';
import { SupabaseInvoice, SupabaseInvoiceItem } from '../types';
import { mapSupabaseInvoiceToInvoice } from '../mappers';

interface UseInvoicesReturn {
  getInvoices: (filters?: { leadId?: string; projectId?: string; status?: string }) => Promise<Invoice[]>;
  getInvoice: (invoiceId: string) => Promise<Invoice | null>;
  createInvoice: (invoice: Partial<Invoice>, items: Omit<InvoiceItem, 'id' | 'invoiceId' | 'createdAt'>[]) => Promise<Invoice | null>;
  createInvoiceFromQuote: (quoteId: string) => Promise<Invoice | null>;
  updateInvoice: (invoiceId: string, invoice: Partial<Invoice>, items?: Omit<InvoiceItem, 'id' | 'invoiceId' | 'createdAt'>[]) => Promise<void>;
  deleteInvoice: (invoiceId: string) => Promise<void>;
  sendInvoice: (invoiceId: string, email: string) => Promise<void>;
  markInvoiceAsViewed: (invoiceId: string) => Promise<void>;
  generateInvoiceNumber: () => Promise<string>;
}

const generateInvoiceNumber = async (): Promise<string> => {
  if (!isSupabaseConfigured || !supabase) {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000);
    return `FAC-${year}-${random.toString().padStart(3, '0')}`;
  }

  try {
    const year = new Date().getFullYear();
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `FAC-${year}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1);

    if (error && error.code !== 'PGRST116') throw error;

    if (data && data.length > 0) {
      const lastNumber = data[0].invoice_number;
      const match = lastNumber.match(/FAC-\d{4}-(\d+)/);
      if (match) {
        const nextNum = parseInt(match[1]) + 1;
        return `FAC-${year}-${nextNum.toString().padStart(3, '0')}`;
      }
    }

    return `FAC-${year}-001`;
  } catch (err) {
    logError('Error generating invoice number:', err);
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000);
    return `FAC-${year}-${random.toString().padStart(3, '0')}`;
  }
};

export const useInvoices = (): UseInvoicesReturn => {
  const getInvoices = useCallback(async (filters?: { leadId?: string; projectId?: string; status?: string }): Promise<Invoice[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.leadId) {
        query = query.eq('lead_id', filters.leadId);
      }
      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const invoices = await Promise.all(
          data.map(async (inv: SupabaseInvoice) => {
            const { data: items } = await supabase
              .from('invoice_items')
              .select('*')
              .eq('invoice_id', inv.id)
              .order('position', { ascending: true });

            const { data: payments } = await supabase
              .from('payments')
              .select('*')
              .eq('invoice_id', inv.id)
              .order('created_at', { ascending: false });

            return mapSupabaseInvoiceToInvoice(inv, items as SupabaseInvoiceItem[] || [], payments || []);
          })
        );
        return invoices;
      }
      return [];
    } catch (err) {
      logError('Error fetching invoices:', err);
      return [];
    }
  }, []);

  const getInvoice = useCallback(async (invoiceId: string): Promise<Invoice | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error) throw error;

      if (data) {
        const { data: items } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', data.id)
          .order('position', { ascending: true });

        const { data: payments } = await supabase
          .from('payments')
          .select('*')
          .eq('invoice_id', data.id)
          .order('created_at', { ascending: false });

        return mapSupabaseInvoiceToInvoice(data as SupabaseInvoice, items as SupabaseInvoiceItem[] || [], payments || []);
      }
      return null;
    } catch (err) {
      logError('Error fetching invoice:', err);
      return null;
    }
  }, []);

  const createInvoice = useCallback(async (
    invoice: Partial<Invoice>,
    items: Omit<InvoiceItem, 'id' | 'invoiceId' | 'createdAt'>[]
  ): Promise<Invoice | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      const invoiceNumber = await generateInvoiceNumber();

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const taxAmount = subtotal * (invoice.taxRate || 0) / 100;
      const total = subtotal + taxAmount;

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          quote_id: invoice.quoteId || null,
          lead_id: invoice.leadId || null,
          project_id: invoice.projectId || null,
          client_name: invoice.clientName || '',
          client_email: invoice.clientEmail || null,
          client_address: invoice.clientAddress || null,
          client_address_line1: (invoice as any).clientAddressLine1 || null,
          client_address_line2: (invoice as any).clientAddressLine2 || null,
          client_postal_code: (invoice as any).clientPostalCode || null,
          client_city: (invoice as any).clientCity || null,
          client_country: (invoice as any).clientCountry || null,
          client_company: invoice.clientCompany || null,
          client_siret: (invoice as any).clientSiret || null,
          client_siren: (invoice as any).clientSiren || null,
          client_vat_number: (invoice as any).clientVatNumber || null,
          title: invoice.title || '',
          description: invoice.description || null,
          subtotal,
          tax_rate: invoice.taxRate || 0,
          tax_amount: taxAmount,
          total,
          amount_paid: 0,
          amount_due: total,
          currency: invoice.currency || 'EUR',
          status: invoice.status || 'draft',
          due_date: invoice.dueDate || null,
          issued_date: invoice.issuedDate || new Date().toISOString().split('T')[0],
          order_reference: (invoice as any).orderReference || null,
          payment_terms: (invoice as any).paymentTerms || null,
          legal_mentions: (invoice as any).legalMentions || null,
          late_payment_penalties: (invoice as any).latePaymentPenalties || null,
          notes: invoice.notes || null,
          e_invoice_hash: null, // Sera calculé lors de la génération
          e_invoice_timestamp: null, // Sera généré lors de la transmission
          e_invoice_format: null, // Format utilisé lors de l'export
          e_invoice_file_url: null, // URL du fichier généré
          terms: invoice.terms || null,
          created_by: userId,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      if (invoiceData && items.length > 0) {
        const invoiceItems = items.map((item, index) => ({
          invoice_id: invoiceData.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_rate: item.taxRate || null,
          total: item.quantity * item.unitPrice,
          position: index,
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);

        if (itemsError) throw itemsError;
      }

      return await getInvoice(invoiceData.id);
    } catch (err) {
      logError('Error creating invoice:', err);
      throw err;
    }
  }, [getInvoice]);

  const createInvoiceFromQuote = useCallback(async (quoteId: string): Promise<Invoice | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      // Fetch quote with items
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*, quote_items(*)')
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;

      if (!quote) return null;

      const items = (quote.quote_items || []).map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
      }));

      const invoice: Partial<Invoice> = {
        quoteId: quote.id,
        leadId: quote.lead_id || undefined,
        projectId: quote.project_id || undefined,
        clientName: quote.client_name,
        clientEmail: quote.client_email || undefined,
        clientAddress: quote.client_address || undefined,
        clientAddressLine1: quote.client_address_line1 || undefined,
        clientAddressLine2: quote.client_address_line2 || undefined,
        clientPostalCode: quote.client_postal_code || undefined,
        clientCity: quote.client_city || undefined,
        clientCountry: quote.client_country || undefined,
        clientCompany: quote.client_company || undefined,
        clientSiret: quote.client_siret || undefined,
        clientSiren: quote.client_siren || undefined,
        clientVatNumber: quote.client_vat_number || undefined,
        title: quote.title,
        description: quote.description || undefined,
        taxRate: quote.tax_rate,
        currency: quote.currency,
        paymentTerms: quote.payment_terms || undefined,
        terms: quote.terms || undefined,
      };

      return await createInvoice(invoice, items);
    } catch (err) {
      logError('Error creating invoice from quote:', err);
      throw err;
    }
  }, [createInvoice]);

  const updateInvoice = useCallback(async (
    invoiceId: string,
    invoice: Partial<Invoice>,
    items?: Omit<InvoiceItem, 'id' | 'invoiceId' | 'createdAt'>[]
  ) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      let subtotal = invoice.subtotal;
      let taxAmount = invoice.taxAmount;
      let total = invoice.total;
      let amountDue = invoice.amountDue;

      if (items && items.length > 0) {
        // Delete existing items
        await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoiceId);

        // Insert new items
        const invoiceItems = items.map((item, index) => ({
          invoice_id: invoiceId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_rate: item.taxRate || null,
          total: item.quantity * item.unitPrice,
          position: index,
        }));

        await supabase
          .from('invoice_items')
          .insert(invoiceItems);

        subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        taxAmount = subtotal * (invoice.taxRate || 0) / 100;
        total = subtotal + taxAmount;
        amountDue = total - (invoice.amountPaid || 0);
      }

      const { error } = await supabase
        .from('invoices')
        .update({
          quote_id: invoice.quoteId || null,
          lead_id: invoice.leadId || null,
          project_id: invoice.projectId || null,
          client_name: invoice.clientName,
          client_email: invoice.clientEmail || null,
          client_address: invoice.clientAddress || null,
          client_address_line1: (invoice as any).clientAddressLine1 || null,
          client_address_line2: (invoice as any).clientAddressLine2 || null,
          client_postal_code: (invoice as any).clientPostalCode || null,
          client_city: (invoice as any).clientCity || null,
          client_country: (invoice as any).clientCountry || null,
          client_company: invoice.clientCompany || null,
          client_siret: (invoice as any).clientSiret || null,
          client_siren: (invoice as any).clientSiren || null,
          client_vat_number: (invoice as any).clientVatNumber || null,
          title: invoice.title,
          description: invoice.description || null,
          subtotal,
          tax_rate: invoice.taxRate,
          tax_amount: taxAmount,
          total,
          amount_due: amountDue,
          currency: invoice.currency,
          status: invoice.status,
          due_date: invoice.dueDate || null,
          issued_date: invoice.issuedDate,
          order_reference: (invoice as any).orderReference || null,
          payment_terms: (invoice as any).paymentTerms || null,
          legal_mentions: (invoice as any).legalMentions || null,
          late_payment_penalties: (invoice as any).latePaymentPenalties || null,
          notes: invoice.notes || null,
          e_invoice_hash: (invoice as any).eInvoiceHash || null,
          e_invoice_timestamp: (invoice as any).eInvoiceTimestamp || null,
          e_invoice_format: (invoice as any).eInvoiceFormat || null,
          e_invoice_file_url: (invoice as any).eInvoiceFileUrl || null,
          terms: invoice.terms || null,
        })
        .eq('id', invoiceId);

      if (error) throw error;
    } catch (err) {
      logError('Error updating invoice:', err);
      throw err;
    }
  }, []);

  const deleteInvoice = useCallback(async (invoiceId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;
    } catch (err) {
      logError('Error deleting invoice:', err);
      throw err;
    }
  }, []);

  const sendInvoice = useCallback(async (invoiceId: string, email: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) throw error;

      // TODO: Implement email sending via Supabase Edge Function or external service
      logInfo('Invoice sent to:', email);
    } catch (err) {
      logError('Error sending invoice:', err);
      throw err;
    }
  }, []);

  const markInvoiceAsViewed = useCallback(async (invoiceId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data } = await supabase
        .from('invoices')
        .select('viewed_at')
        .eq('id', invoiceId)
        .single();

      if (!data?.viewed_at) {
        const { error } = await supabase
          .from('invoices')
          .update({
            status: 'viewed',
            viewed_at: new Date().toISOString(),
          })
          .eq('id', invoiceId);

        if (error) throw error;
      }
    } catch (err) {
      logError('Error marking invoice as viewed:', err);
      throw err;
    }
  }, []);

  return {
    getInvoices,
    getInvoice,
    createInvoice,
    createInvoiceFromQuote,
    updateInvoice,
    deleteInvoice,
    sendInvoice,
    markInvoiceAsViewed,
    generateInvoiceNumber,
  };
};

