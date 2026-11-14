ALTER TABLE ${flyway:defaultSchema}.patients ALTER COLUMN ci DROP NOT NULL;
ALTER TABLE ${flyway:defaultSchema}.personal ALTER COLUMN ci DROP NOT NULL;

UPDATE ${flyway:defaultSchema}.patients SET ci = NULL WHERE TRIM(ci) = '';
UPDATE ${flyway:defaultSchema}.personal SET ci = NULL WHERE TRIM(ci) = '';
