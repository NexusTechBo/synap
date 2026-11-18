ALTER TABLE ${flyway:defaultSchema}.patients RENAME COLUMN ci TO document;
ALTER TABLE ${flyway:defaultSchema}.personal RENAME COLUMN ci TO document;
