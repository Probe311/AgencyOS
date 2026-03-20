/**
 * Endpoint pour traiter les rapports automatisés
 * À appeler via un cron job ou un scheduler
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AutomatedReportEmailService } from '../../frontend/lib/services/automatedReportEmailService';
import { supabase } from '../utils/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Récupérer tous les rapports actifs dont next_run_at est passé
    const now = new Date().toISOString();
    
    const { data: reports, error } = await supabase
      .from('automated_reports')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_at', now);

    if (error) {
      console.error('Error fetching reports:', error);
      return res.status(500).json({ error: 'Error fetching reports' });
    }

    if (!reports || reports.length === 0) {
      return res.status(200).json({ message: 'No reports to process', processed: 0 });
    }

    // Traiter chaque rapport
    const results = await Promise.allSettled(
      reports.map(report => AutomatedReportEmailService.processAutomatedReport(report.id))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return res.status(200).json({
      message: `Processed ${successful} reports, ${failed} failed`,
      processed: successful,
      failed,
      total: reports.length,
    });
  } catch (error: any) {
    console.error('Error processing reports:', error);
    return res.status(500).json({ error: error.message });
  }
}

