import { useState, useCallback } from 'react';
import { Quote, QuoteItem } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseQuote, SupabaseQuoteItem } from '../types';
import { mapSupabaseQuoteToQuote, mapSupabaseQuoteItemToQuoteItem } from '../mappers';

interface UseQuotesReturn {
  getQuotes: (filters?: { leadId?: string; projectId?: string; status?: string }) => Promise<Quote[]>;
  getQuote: (quoteId: string) => Promise<Quote | null>;
  createQuote: (quote: Partial<Quote>, items: Omit<QuoteItem, 'id' | 'quoteId' | 'createdAt'>[]) => Promise<Quote | null>;
  updateQuote: (quoteId: string, quote: Partial<Quote>, items?: Omit<QuoteItem, 'id' | 'quoteId' | 'createdAt'>[]) => Promise<void>;
  deleteQuote: (quoteId: string) => Promise<void>;
  sendQuote: (quoteId: string, email: string) => Promise<void>;
  markQuoteAsViewed: (quoteId: string) => Promise<void>;
  acceptQuote: (quoteId: string) => Promise<void>;
  rejectQuote: (quoteId: string) => Promise<void>;
  generateQuoteNumber: () => Promise<string>;
}

const generateQuoteNumber = async (): Promise<string> => {
  if (!isSupabaseConfigured || !supabase) {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000);
    return `DEV-${year}-${random.toString().padStart(3, '0')}`;
  }

  try {
    const year = new Date().getFullYear();
    const { data, error } = await supabase
      .from('quotes')
      .select('quote_number')
      .like('quote_number', `DEV-${year}-%`)
      .order('quote_number', { ascending: false })
      .limit(1);

    if (error && error.code !== 'PGRST116') throw error;

    if (data && data.length > 0) {
      const lastNumber = data[0].quote_number;
      const match = lastNumber.match(/DEV-\d{4}-(\d+)/);
      if (match) {
        const nextNum = parseInt(match[1]) + 1;
        return `DEV-${year}-${nextNum.toString().padStart(3, '0')}`;
      }
    }

    return `DEV-${year}-001`;
  } catch (err) {
    console.error('Error generating quote number:', err);
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000);
    return `DEV-${year}-${random.toString().padStart(3, '0')}`;
  }
};

export const useQuotes = (): UseQuotesReturn => {
  const getQuotes = useCallback(async (filters?: { leadId?: string; projectId?: string; status?: string }): Promise<Quote[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      let query = supabase
        .from('quotes')
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
        const quotes = await Promise.all(
          data.map(async (q: SupabaseQuote) => {
            const { data: items } = await supabase
              .from('quote_items')
              .select('*')
              .eq('quote_id', q.id)
              .order('position', { ascending: true });

            return mapSupabaseQuoteToQuote(q, items as SupabaseQuoteItem[] || []);
          })
        );
        return quotes;
      }
      return [];
    } catch (err) {
      console.error('Error fetching quotes:', err);
      return [];
    }
  }, []);

  const getQuote = useCallback(async (quoteId: string): Promise<Quote | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (error) throw error;

      if (data) {
        const { data: items } = await supabase
          .from('quote_items')
          .select('*')
          .eq('quote_id', data.id)
          .order('position', { ascending: true });

        return mapSupabaseQuoteToQuote(data as SupabaseQuote, items as SupabaseQuoteItem[] || []);
      }
      return null;
    } catch (err) {
      console.error('Error fetching quote:', err);
      return null;
    }
  }, []);

  const createQuote = useCallback(async (
    quote: Partial<Quote>,
    items: Omit<QuoteItem, 'id' | 'quoteId' | 'createdAt'>[]
  ): Promise<Quote | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      const quoteNumber = await generateQuoteNumber();

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const taxAmount = subtotal * (quote.taxRate || 0) / 100;
      const total = subtotal + taxAmount;

      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          quote_number: quoteNumber,
          lead_id: quote.leadId || null,
          project_id: quote.projectId || null,
          client_name: quote.clientName || '',
          client_email: quote.clientEmail || null,
          client_address: quote.clientAddress || null,
          client_address_line1: (quote as any).clientAddressLine1 || null,
          client_address_line2: (quote as any).clientAddressLine2 || null,
          client_postal_code: (quote as any).clientPostalCode || null,
          client_city: (quote as any).clientCity || null,
          client_country: (quote as any).clientCountry || null,
          client_company: quote.clientCompany || null,
          client_siret: (quote as any).clientSiret || null,
          client_siren: (quote as any).clientSiren || null,
          client_vat_number: (quote as any).clientVatNumber || null,
          title: quote.title || '',
          description: quote.description || null,
          subtotal,
          tax_rate: quote.taxRate || 0,
          tax_amount: taxAmount,
          total,
          currency: quote.currency || 'EUR',
          status: quote.status || 'draft',
          valid_until: quote.validUntil || null,
          order_reference: (quote as any).orderReference || null,
          payment_terms: (quote as any).paymentTerms || null,
          notes: quote.notes || null,
          terms: quote.terms || null,
          created_by: userId,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      if (quoteData && items.length > 0) {
        const quoteItems = items.map((item, index) => ({
          quote_id: quoteData.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_rate: item.taxRate || null,
          total: item.quantity * item.unitPrice,
          position: index,
        }));

        const { error: itemsError } = await supabase
          .from('quote_items')
          .insert(quoteItems);

        if (itemsError) throw itemsError;
      }

      return await getQuote(quoteData.id);
    } catch (err) {
      console.error('Error creating quote:', err);
      throw err;
    }
  }, [getQuote]);

  const updateQuote = useCallback(async (
    quoteId: string,
    quote: Partial<Quote>,
    items?: Omit<QuoteItem, 'id' | 'quoteId' | 'createdAt'>[]
  ) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      let subtotal = quote.subtotal;
      let taxAmount = quote.taxAmount;
      let total = quote.total;

      if (items && items.length > 0) {
        // Delete existing items
        await supabase
          .from('quote_items')
          .delete()
          .eq('quote_id', quoteId);

        // Insert new items
        const quoteItems = items.map((item, index) => ({
          quote_id: quoteId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_rate: item.taxRate || null,
          total: item.quantity * item.unitPrice,
          position: index,
        }));

        await supabase
          .from('quote_items')
          .insert(quoteItems);

        subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        taxAmount = subtotal * (quote.taxRate || 0) / 100;
        total = subtotal + taxAmount;
      }

      const { error } = await supabase
        .from('quotes')
        .update({
          lead_id: quote.leadId || null,
          project_id: quote.projectId || null,
          client_name: quote.clientName,
          client_email: quote.clientEmail || null,
          client_address: quote.clientAddress || null,
          client_address_line1: (quote as any).clientAddressLine1 || null,
          client_address_line2: (quote as any).clientAddressLine2 || null,
          client_postal_code: (quote as any).clientPostalCode || null,
          client_city: (quote as any).clientCity || null,
          client_country: (quote as any).clientCountry || null,
          client_company: quote.clientCompany || null,
          client_siret: (quote as any).clientSiret || null,
          client_siren: (quote as any).clientSiren || null,
          client_vat_number: (quote as any).clientVatNumber || null,
          title: quote.title,
          description: quote.description || null,
          subtotal,
          tax_rate: quote.taxRate,
          tax_amount: taxAmount,
          total,
          currency: quote.currency,
          status: quote.status,
          valid_until: quote.validUntil || null,
          order_reference: (quote as any).orderReference || null,
          payment_terms: (quote as any).paymentTerms || null,
          notes: quote.notes || null,
          terms: quote.terms || null,
        })
        .eq('id', quoteId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating quote:', err);
      throw err;
    }
  }, []);

  const deleteQuote = useCallback(async (quoteId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting quote:', err);
      throw err;
    }
  }, []);

  const sendQuote = useCallback(async (quoteId: string, email: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('quotes')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', quoteId);

      if (error) throw error;

      // TODO: Implement email sending via Supabase Edge Function or external service
      console.log('Quote sent to:', email);
    } catch (err) {
      console.error('Error sending quote:', err);
      throw err;
    }
  }, []);

  const markQuoteAsViewed = useCallback(async (quoteId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data } = await supabase
        .from('quotes')
        .select('viewed_at')
        .eq('id', quoteId)
        .single();

      if (!data?.viewed_at) {
        const { error } = await supabase
          .from('quotes')
          .update({
            status: 'viewed',
            viewed_at: new Date().toISOString(),
          })
          .eq('id', quoteId);

        if (error) throw error;
      }
    } catch (err) {
      console.error('Error marking quote as viewed:', err);
      throw err;
    }
  }, []);

  const acceptQuote = useCallback(async (quoteId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('quotes')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', quoteId);

      if (error) throw error;
    } catch (err) {
      console.error('Error accepting quote:', err);
      throw err;
    }
  }, []);

  const rejectQuote = useCallback(async (quoteId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('quotes')
        .update({
          status: 'rejected',
        })
        .eq('id', quoteId);

      if (error) throw error;
    } catch (err) {
      console.error('Error rejecting quote:', err);
      throw err;
    }
  }, []);

  return {
    getQuotes,
    getQuote,
    createQuote,
    updateQuote,
    deleteQuote,
    sendQuote,
    markQuoteAsViewed,
    acceptQuote,
    rejectQuote,
    generateQuoteNumber,
  };
};

