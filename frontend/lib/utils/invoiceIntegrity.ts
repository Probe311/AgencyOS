/**
 * Gestion de l'intégrité et de l'authenticité des factures électroniques
 * Conforme aux exigences de la facturation électronique française 2026
 */

import { Invoice } from '../../types';

/**
 * Calcule le hash SHA-256 d'une facture pour garantir son intégrité
 * Le hash est calculé sur toutes les données critiques de la facture
 */
export const calculateInvoiceHash = async (invoice: Invoice): Promise<string> => {
  // Créer une représentation JSON normalisée de la facture
  const invoiceData = {
    invoiceNumber: invoice.invoiceNumber,
    issuedDate: invoice.issuedDate,
    clientName: invoice.clientName,
    clientSiret: invoice.clientSiret,
    clientSiren: invoice.clientSiren,
    subtotal: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    currency: invoice.currency,
    items: invoice.items?.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      total: item.total,
    })).sort((a, b) => a.description.localeCompare(b.description)),
  };

  // Convertir en JSON et calculer le hash
  const jsonString = JSON.stringify(invoiceData, Object.keys(invoiceData).sort());
  
  // Utiliser l'API Web Crypto pour calculer SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
};

/**
 * Vérifie l'intégrité d'une facture en comparant son hash actuel avec le hash stocké
 */
export const verifyInvoiceIntegrity = async (
  invoice: Invoice,
  storedHash: string
): Promise<boolean> => {
  const currentHash = await calculateInvoiceHash(invoice);
  return currentHash === storedHash;
};

/**
 * Génère un horodatage certifié (format ISO 8601)
 * Note: Pour un horodatage réellement certifié, il faudrait utiliser un service TSA (Time Stamping Authority)
 * Cette fonction génère un horodatage standard qui devra être certifié par une PDP ou un service TSA
 */
export const generateTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Structure de données pour la transmission à une PDP
 * Contient toutes les données nécessaires selon les exigences de l'administration fiscale
 */
export interface PDPTransmissionData {
  // Identification fournisseur
  supplier: {
    legalName: string;
    siret?: string;
    siren?: string;
    vatNumber?: string;
    address: {
      line1: string;
      line2?: string;
      postalCode: string;
      city: string;
      country: string;
    };
  };
  
  // Identification client
  customer: {
    name: string;
    company?: string;
    siret?: string;
    siren?: string;
    vatNumber?: string;
    address: {
      line1: string;
      line2?: string;
      postalCode: string;
      city: string;
      country: string;
    };
  };
  
  // Informations facture
  invoice: {
    number: string;
    issuedDate: string;
    dueDate?: string;
    orderReference?: string;
    paymentTerms?: string;
  };
  
  // Lignes de facture
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    totalHT: number;
    totalTTC: number;
  }>;
  
  // Totaux
  totals: {
    subtotalHT: number;
    totalTVA: number;
    totalTTC: number;
    currency: string;
  };
}

/**
 * Prépare les données d'une facture pour transmission à une PDP
 */
export const preparePDPTransmissionData = (
  invoice: Invoice,
  companySettings: any
): PDPTransmissionData => {
  return {
    supplier: {
      legalName: companySettings.legalName,
      siret: companySettings.siret,
      siren: companySettings.siren,
      vatNumber: companySettings.vatNumber,
      address: {
        line1: companySettings.addressLine1,
        line2: companySettings.addressLine2,
        postalCode: companySettings.postalCode,
        city: companySettings.city,
        country: companySettings.country || 'France',
      },
    },
    customer: {
      name: invoice.clientName,
      company: invoice.clientCompany,
      siret: invoice.clientSiret,
      siren: invoice.clientSiren,
      vatNumber: invoice.clientVatNumber,
      address: {
        line1: invoice.clientAddressLine1 || invoice.clientAddress || '',
        line2: invoice.clientAddressLine2,
        postalCode: invoice.clientPostalCode || '',
        city: invoice.clientCity || '',
        country: invoice.clientCountry || 'France',
      },
    },
    invoice: {
      number: invoice.invoiceNumber,
      issuedDate: invoice.issuedDate,
      dueDate: invoice.dueDate,
      orderReference: invoice.orderReference,
      paymentTerms: invoice.paymentTerms,
    },
    items: (invoice.items || []).map(item => {
      const taxRate = item.taxRate || invoice.taxRate || 0;
      const totalHT = item.total;
      const totalTTC = totalHT * (1 + taxRate / 100);
      
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate,
        totalHT,
        totalTTC,
      };
    }),
    totals: {
      subtotalHT: invoice.subtotal,
      totalTVA: invoice.taxAmount,
      totalTTC: invoice.total,
      currency: invoice.currency,
    },
  };
};

/**
 * Valide que toutes les données nécessaires sont présentes pour la transmission PDP
 */
export const validatePDPTransmissionData = (
  data: PDPTransmissionData
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Vérifier fournisseur
  if (!data.supplier.legalName) {
    errors.push('Raison sociale du fournisseur manquante');
  }
  if (!data.supplier.address.line1 || !data.supplier.address.postalCode || !data.supplier.address.city) {
    errors.push('Adresse complète du fournisseur manquante');
  }

  // Vérifier client
  if (!data.customer.name) {
    errors.push('Nom du client manquant');
  }
  if (!data.customer.address.line1 || !data.customer.address.postalCode || !data.customer.address.city) {
    errors.push('Adresse complète du client manquante');
  }

  // Vérifier facture
  if (!data.invoice.number || !data.invoice.issuedDate) {
    errors.push('Numéro ou date d\'émission de facture manquant');
  }

  // Vérifier lignes
  if (!data.items || data.items.length === 0) {
    errors.push('Aucune ligne de facture');
  }

  // Vérifier totaux
  if (!data.totals.subtotalHT || !data.totals.totalTTC) {
    errors.push('Totaux manquants');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

