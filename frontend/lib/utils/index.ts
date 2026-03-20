/**
 * Point d'entrée centralisé pour tous les utilitaires
 * Facilite les imports et évite les dépendances circulaires
 */

// Logger
export { logger, logDebug, logInfo, logWarn, logError, LogLevel } from './logger';

// Validation des leads
export {
  validateEmailSyntax,
  validatePhoneFormat,
  calculateDataCompleteness,
  calculateSourceReliability,
  detectMissingFields,
  detectSuspiciousFields,
  calculateLeadQualityScore,
  saveLeadQualityScore,
  type LeadQualityScore,
  type ValidationResult,
} from './leadValidation';

// Scoring des leads
export {
  loadScoringRules,
  loadDefaultScoringRule,
  calculateCustomLeadScore,
  prioritizeLeads,
  saveScoringRule,
  updateScoringRule,
  type ScoringRule,
  type ScoringRulesConfig,
  type CustomScoringRule,
  type ScoringWeights,
} from './leadScoring';

// Certification des leads
export {
  checkLeadCertification,
  shouldCertifyLead,
  certifyLeadIfEligible,
  certifyLeadIfHighCompleteness,
  getCertificationMessage,
  isLeadCertifiedForEnrichment,
  type CertificationCriteria,
} from './leadCertification';

// Export
export {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  type ExportData,
} from './export';

// Export de leads (spécialisé)
export {
  exportToCSV as exportLeadsToCSV,
  exportToJSON,
  exportToExcel as exportLeadsToExcel,
  exportLeads,
  type ExportOptions,
} from './exportLeads';

// Validation de champs (utilitaires communs)
export {
  isFieldFilled,
  calculateWeightedScore,
  detectMissingFields as detectMissingFieldsUtil,
} from './fieldValidation';

// Note: Les utilitaires généraux sont dans ../utils.ts (pas dans ce dossier)

