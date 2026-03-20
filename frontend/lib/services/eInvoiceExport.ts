/**
 * Service d'export de factures électroniques
 * Génère les formats structurés requis pour la facturation électronique (Factur-X, UBL, CII)
 * 
 * Note: Cette implémentation est une base. Pour une production, il faudra utiliser
 * des bibliothèques spécialisées ou des services externes pour générer les formats exacts.
 */

import { Invoice } from '../../types';
import { PDPTransmissionData, preparePDPTransmissionData } from '../utils/invoiceIntegrity';

/**
 * Format de facture électronique supporté
 */
export type EInvoiceFormat = 'Factur-X' | 'UBL' | 'CII';

/**
 * Interface pour les données d'export
 */
export interface EInvoiceExportResult {
  format: EInvoiceFormat;
  content: string; // Contenu XML/JSON selon le format
  mimeType: string;
  fileName: string;
}

/**
 * Génère une facture au format Factur-X (PDF/A-3 avec XML intégré)
 * 
 * Note: Pour une implémentation complète, utiliser une bibliothèque comme factur-x.js
 * ou un service externe. Cette fonction génère la structure XML de base.
 */
export const generateFacturX = async (
  invoice: Invoice,
  companySettings: any
): Promise<EInvoiceExportResult> => {
  const data = preparePDPTransmissionData(invoice, companySettings);
  
  // Structure XML Factur-X simplifiée (à compléter avec la norme complète)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CrossIndustryInvoice xmlns="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                      xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
                      xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${data.invoice.number}</ram:ID>
    <ram:IssueDateTime>
      <ram:DateTimeString format="102">${data.invoice.issuedDate.replace(/-/g, '')}</ram:DateTimeString>
    </ram:IssueDateTime>
    <ram:TypeCode>380</ram:TypeCode>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem>
      ${data.items.map((item, index) => `
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${index + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXml(item.description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${item.unitPrice.toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${item.quantity}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:RateApplicablePercent>${item.taxRate}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${item.totalHT.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
      `).join('')}
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(data.supplier.legalName)}</ram:Name>
        ${data.supplier.siret ? `<ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${data.supplier.siret}</ram:ID>
        </ram:SpecifiedLegalOrganization>` : ''}
        <ram:PostalTradeAddress>
          <ram:LineOne>${escapeXml(data.supplier.address.line1)}</ram:LineOne>
          ${data.supplier.address.line2 ? `<ram:LineTwo>${escapeXml(data.supplier.address.line2)}</ram:LineTwo>` : ''}
          <ram:PostcodeCode>${data.supplier.address.postalCode}</ram:PostcodeCode>
          <ram:CityName>${escapeXml(data.supplier.address.city)}</ram:CityName>
          <ram:CountryID>${data.supplier.address.country}</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(data.customer.name)}</ram:Name>
        ${data.customer.siret ? `<ram:SpecifiedLegalOrganization>
          <ram:ID schemeID="0002">${data.customer.siret}</ram:ID>
        </ram:SpecifiedLegalOrganization>` : ''}
        <ram:PostalTradeAddress>
          <ram:LineOne>${escapeXml(data.customer.address.line1)}</ram:LineOne>
          ${data.customer.address.line2 ? `<ram:LineTwo>${escapeXml(data.customer.address.line2)}</ram:LineTwo>` : ''}
          <ram:PostcodeCode>${data.customer.address.postalCode}</ram:PostcodeCode>
          <ram:CityName>${escapeXml(data.customer.address.city)}</ram:CityName>
          <ram:CountryID>${data.customer.address.country}</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${data.totals.currency}</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementMonetarySummation>
        <ram:LineTotalAmount>${data.totals.subtotalHT.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${data.totals.subtotalHT.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount>${data.totals.totalTVA.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${data.totals.totalTTC.toFixed(2)}</ram:GrandTotalAmount>
      </ram:SpecifiedTradeSettlementMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</CrossIndustryInvoice>`;

  return {
    format: 'Factur-X',
    content: xml,
    mimeType: 'application/xml',
    fileName: `facture-${invoice.invoiceNumber}-factur-x.xml`,
  };
};

/**
 * Génère une facture au format UBL 2.1
 */
export const generateUBL = async (
  invoice: Invoice,
  companySettings: any
): Promise<EInvoiceExportResult> => {
  const data = preparePDPTransmissionData(invoice, companySettings);
  
  // Structure UBL 2.1 simplifiée (à compléter avec la norme complète)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>${data.invoice.number}</cbc:ID>
  <cbc:IssueDate>${data.invoice.issuedDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(data.supplier.legalName)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(data.supplier.address.line1)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(data.supplier.address.city)}</cbc:CityName>
        <cbc:PostalZone>${data.supplier.address.postalCode}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${data.supplier.address.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${data.supplier.siret ? `<cac:PartyLegalEntity>
        <cbc:CompanyID schemeID="0002">${data.supplier.siret}</cbc:CompanyID>
      </cac:PartyLegalEntity>` : ''}
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(data.customer.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(data.customer.address.line1)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(data.customer.address.city)}</cbc:CityName>
        <cbc:PostalZone>${data.customer.address.postalCode}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${data.customer.address.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${data.customer.siret ? `<cac:PartyLegalEntity>
        <cbc:CompanyID schemeID="0002">${data.customer.siret}</cbc:CompanyID>
      </cac:PartyLegalEntity>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>
  ${data.items.map((item, index) => `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${data.totals.currency}">${item.totalHT.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${escapeXml(item.description)}</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${data.totals.currency}">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${data.totals.currency}">${(item.totalTTC - item.totalHT).toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="${data.totals.currency}">${item.totalHT.toFixed(2)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="${data.totals.currency}">${(item.totalTTC - item.totalHT).toFixed(2)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:ID>S</cbc:ID>
          <cbc:Percent>${item.taxRate}</cbc:Percent>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
  </cac:InvoiceLine>
  `).join('')}
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${data.totals.currency}">${data.totals.subtotalHT.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${data.totals.currency}">${data.totals.subtotalHT.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${data.totals.currency}">${data.totals.totalTTC.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${data.totals.currency}">${data.totals.totalTTC.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${data.totals.currency}">${data.totals.totalTVA.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
</Invoice>`;

  return {
    format: 'UBL',
    content: xml,
    mimeType: 'application/xml',
    fileName: `facture-${invoice.invoiceNumber}-ubl.xml`,
  };
};

/**
 * Génère une facture au format CII (Cross Industry Invoice)
 */
export const generateCII = async (
  invoice: Invoice,
  companySettings: any
): Promise<EInvoiceExportResult> => {
  // CII utilise une structure similaire à Factur-X
  // Pour simplifier, on retourne Factur-X qui est basé sur CII
  return generateFacturX(invoice, companySettings);
};

/**
 * Échappe les caractères XML spéciaux
 */
const escapeXml = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Génère une facture électronique dans le format demandé
 */
export const generateEInvoice = async (
  invoice: Invoice,
  companySettings: any,
  format: EInvoiceFormat = 'Factur-X'
): Promise<EInvoiceExportResult> => {
  switch (format) {
    case 'Factur-X':
      return generateFacturX(invoice, companySettings);
    case 'UBL':
      return generateUBL(invoice, companySettings);
    case 'CII':
      return generateCII(invoice, companySettings);
    default:
      throw new Error(`Format non supporté: ${format}`);
  }
};

