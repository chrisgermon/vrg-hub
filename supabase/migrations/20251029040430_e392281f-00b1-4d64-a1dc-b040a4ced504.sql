-- Deactivate legacy umbrella request types to remove duplicates from New Request page
UPDATE request_types
SET is_active = false, updated_at = now()
WHERE slug IN (
  'accounts-payable',
  'facility-services',
  'finance-request',
  'hardware-request',
  'hr-request',
  'it-service-desk',
  'marketing-request',
  'marketing-service',
  'new-user-account',
  'office-services',
  'technology-training',
  'toner-request',
  'user-offboarding'
)
AND COALESCE(is_active, true) = true;