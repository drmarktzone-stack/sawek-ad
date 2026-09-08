export type {
  AllowedQualification,
  BusinessIdentity,
  ContentClass,
  ContentUnit,
  FactEvidence,
  FactQualification,
  ScanTruthResult,
  SourceType,
} from "./types";
export { MERGE_STRENGTH, TRUTH_FIELDS, classToRejection, isAllowedQualification } from "./types";
export {
  isEcommerceChromeText,
  isExplicitAudienceStatement,
  isMerchUpsellText,
  isPainStatement,
  isUiChromeText,
  isUnknownSentinel,
  isUsableLocationValue,
  looksLikePostalAddress,
} from "./patterns";
export { extractContentUnits, classifyUnits, buildBusinessIdentity, businessCorpus } from "./page";
export { governFields, qualifyField, mergeByStrength } from "./govern";
export { runScanTruthPipeline, extraPageMayFillTruth, EXTRA_CONTACT_FIELDS } from "./pipeline";
