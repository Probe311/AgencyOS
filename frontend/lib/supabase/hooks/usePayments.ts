import { useCallback } from 'react';
import { Payment } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabasePayment } from '../types';
import { mapSupabasePaymentToPayment } from '../mappers';

interface UsePaymentsReturn {
  getPayments: (invoiceId: string) => Promise<Payment[]>;
  createPayment: (payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Payment | null>;
  updatePayment: (paymentId: string, payment: Partial<Payment>) => Promise<void>;
  deletePayment: (paymentId: string) => Promise<void>;
  createStripePayment: (invoiceId: string, amount: number, paymentIntentId: string) => Promise<Payment | null>;
}

export const usePayments = (): UsePaymentsReturn => {
  const getPayments = useCallback(async (invoiceId: string): Promise<Payment[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        return data.map((p: SupabasePayment) => mapSupabasePaymentToPayment(p));
      }
      return [];
    } catch (err) {
      console.error('Error fetching payments:', err);
      return [];
    }
  }, []);

  const createPayment = useCallback(async (
    payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Payment | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      const { data, error } = await supabase
        .from('payments')
        .insert({
          invoice_id: payment.invoiceId,
          amount: payment.amount,
          currency: payment.currency,
          payment_method: payment.paymentMethod,
          status: payment.status,
          stripe_payment_intent_id: payment.stripePaymentIntentId || null,
          stripe_charge_id: payment.stripeChargeId || null,
          reference: payment.reference || null,
          notes: payment.notes || null,
          paid_at: payment.paidAt || null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Update invoice amount_paid and amount_due
        const invoice = await supabase
          .from('invoices')
          .select('total, amount_paid')
          .eq('id', payment.invoiceId)
          .single();

        if (invoice.data) {
          const newAmountPaid = (invoice.data.amount_paid || 0) + payment.amount;
          const newAmountDue = invoice.data.total - newAmountPaid;
          const newStatus = newAmountDue <= 0 ? 'paid' : invoice.data.amount_paid === 0 ? 'sent' : 'viewed';

          await supabase
            .from('invoices')
            .update({
              amount_paid: newAmountPaid,
              amount_due: newAmountDue,
              status: newStatus,
              paid_at: newAmountDue <= 0 ? new Date().toISOString() : null,
            })
            .eq('id', payment.invoiceId);
        }

        return mapSupabasePaymentToPayment(data as SupabasePayment);
      }
      return null;
    } catch (err) {
      console.error('Error creating payment:', err);
      throw err;
    }
  }, []);

  const updatePayment = useCallback(async (paymentId: string, payment: Partial<Payment>) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: payment.status,
          stripe_payment_intent_id: payment.stripePaymentIntentId || null,
          stripe_charge_id: payment.stripeChargeId || null,
          reference: payment.reference || null,
          notes: payment.notes || null,
          paid_at: payment.paidAt || null,
        })
        .eq('id', paymentId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating payment:', err);
      throw err;
    }
  }, []);

  const deletePayment = useCallback(async (paymentId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      // Get payment to update invoice
      const { data: payment } = await supabase
        .from('payments')
        .select('invoice_id, amount')
        .eq('id', paymentId)
        .single();

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      // Update invoice amounts
      if (payment) {
        const invoice = await supabase
          .from('invoices')
          .select('total, amount_paid')
          .eq('id', payment.invoice_id)
          .single();

        if (invoice.data) {
          const newAmountPaid = Math.max(0, (invoice.data.amount_paid || 0) - payment.amount);
          const newAmountDue = invoice.data.total - newAmountPaid;

          await supabase
            .from('invoices')
            .update({
              amount_paid: newAmountPaid,
              amount_due: newAmountDue,
              status: newAmountPaid === 0 ? 'sent' : 'viewed',
            })
            .eq('id', payment.invoice_id);
        }
      }
    } catch (err) {
      console.error('Error deleting payment:', err);
      throw err;
    }
  }, []);

  const createStripePayment = useCallback(async (
    invoiceId: string,
    amount: number,
    paymentIntentId: string
  ): Promise<Payment | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      // Get invoice to get currency
      const { data: invoice } = await supabase
        .from('invoices')
        .select('currency, stripe_payment_intent_id')
        .eq('id', invoiceId)
        .single();

      if (!invoice) throw new Error('Invoice not found');

      // Update invoice with payment intent
      await supabase
        .from('invoices')
        .update({
          stripe_payment_intent_id: paymentIntentId,
        })
        .eq('id', invoiceId);

      // Create payment record
      return await createPayment({
        invoiceId,
        amount,
        currency: invoice.currency || 'EUR',
        paymentMethod: 'stripe',
        status: 'processing',
        stripePaymentIntentId: paymentIntentId,
      });
    } catch (err) {
      console.error('Error creating Stripe payment:', err);
      throw err;
    }
  }, [createPayment]);

  return {
    getPayments,
    createPayment,
    updatePayment,
    deletePayment,
    createStripePayment,
  };
};

