-- Check Infobip configuration in database
-- Run this query to see what configuration is stored

SELECT
  ic.id,
  ic.company_id,
  ic.phone_number,
  ic.application_id,
  ic.calls_configuration_id,
  c.name as company_name
FROM infobip_config ic
JOIN company c ON c.id = ic.company_id
WHERE ic.phone_number = '+12039008770';

-- If nothing shows up, try without phone number filter:
-- SELECT * FROM infobip_config;
