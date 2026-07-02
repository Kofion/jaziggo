CREATE TYPE "DocumentType" AS ENUM ('CPF', 'RG');

ALTER TABLE "Deceased" ADD COLUMN "documentType" "DocumentType";
ALTER TABLE "Responsible" ADD COLUMN "documentType" "DocumentType";

CREATE UNIQUE INDEX "Deceased_documentType_document_key" ON "Deceased"("documentType", "document");
CREATE UNIQUE INDEX "Responsible_documentType_document_key" ON "Responsible"("documentType", "document");