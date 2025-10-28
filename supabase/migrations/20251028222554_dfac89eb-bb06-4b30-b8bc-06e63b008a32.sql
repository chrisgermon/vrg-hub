-- Nullify all foreign key references to form_templates
UPDATE tickets SET form_template_id = NULL WHERE form_template_id IS NOT NULL;
UPDATE request_types SET form_template_id = NULL WHERE form_template_id IS NOT NULL;

-- Now delete ALL form_templates completely
DELETE FROM form_templates;