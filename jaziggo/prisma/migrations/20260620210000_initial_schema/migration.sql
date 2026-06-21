-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BurialSpaceType" AS ENUM ('SEPULTURA', 'JAZIGO');

-- CreateEnum
CREATE TYPE "BurialSpaceStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "ResponsibleLinkType" AS ENUM ('DECEASED', 'BURIAL_SPACE');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deceased" (
    "id" UUID NOT NULL,
    "internalCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "searchName" TEXT NOT NULL,
    "document" TEXT,
    "birthDate" DATE,
    "deathDate" DATE,
    "burialDate" DATE,
    "datesUnknown" BOOLEAN NOT NULL,
    "historicalDataIncomplete" BOOLEAN NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deceased_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BurialSpace" (
    "id" UUID NOT NULL,
    "type" "BurialSpaceType" NOT NULL,
    "identifier" TEXT NOT NULL,
    "locationKey" TEXT NOT NULL,
    "sector" TEXT,
    "block" TEXT,
    "street" TEXT,
    "row" TEXT,
    "number" TEXT,
    "complement" TEXT,
    "status" "BurialSpaceStatus" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BurialSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Responsible" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "searchName" TEXT NOT NULL,
    "document" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Responsible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponsibleLink" (
    "id" UUID NOT NULL,
    "responsibleId" UUID NOT NULL,
    "linkType" "ResponsibleLinkType" NOT NULL,
    "deceasedId" UUID,
    "burialSpaceId" UUID,
    "status" "LinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponsibleLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BurialLink" (
    "id" UUID NOT NULL,
    "deceasedId" UUID NOT NULL,
    "burialSpaceId" UUID NOT NULL,
    "responsibleId" UUID,
    "burialDate" DATE,
    "status" "LinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BurialLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_role_idx" ON "User"("status", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Deceased_internalCode_key" ON "Deceased"("internalCode");

-- CreateIndex
CREATE INDEX "Deceased_searchName_idx" ON "Deceased"("searchName");

-- CreateIndex
CREATE INDEX "Deceased_document_idx" ON "Deceased"("document");

-- CreateIndex
CREATE INDEX "Deceased_deathDate_idx" ON "Deceased"("deathDate");

-- CreateIndex
CREATE INDEX "Deceased_burialDate_idx" ON "Deceased"("burialDate");

-- CreateIndex
CREATE INDEX "BurialSpace_status_type_idx" ON "BurialSpace"("status", "type");

-- CreateIndex
CREATE INDEX "BurialSpace_identifier_idx" ON "BurialSpace"("identifier");

-- CreateIndex
CREATE INDEX "BurialSpace_sector_idx" ON "BurialSpace"("sector");

-- CreateIndex
CREATE INDEX "BurialSpace_locationKey_idx" ON "BurialSpace"("locationKey");

-- CreateIndex
CREATE UNIQUE INDEX "BurialSpace_type_identifier_locationKey_key" ON "BurialSpace"("type", "identifier", "locationKey");

-- CreateIndex
CREATE INDEX "Responsible_searchName_idx" ON "Responsible"("searchName");

-- CreateIndex
CREATE INDEX "Responsible_document_idx" ON "Responsible"("document");

-- CreateIndex
CREATE INDEX "Responsible_phone_idx" ON "Responsible"("phone");

-- CreateIndex
CREATE INDEX "ResponsibleLink_responsibleId_idx" ON "ResponsibleLink"("responsibleId");

-- CreateIndex
CREATE INDEX "ResponsibleLink_deceasedId_idx" ON "ResponsibleLink"("deceasedId");

-- CreateIndex
CREATE INDEX "ResponsibleLink_burialSpaceId_idx" ON "ResponsibleLink"("burialSpaceId");

-- CreateIndex
CREATE INDEX "ResponsibleLink_status_linkType_idx" ON "ResponsibleLink"("status", "linkType");

-- CreateIndex
CREATE INDEX "BurialLink_burialSpaceId_status_idx" ON "BurialLink"("burialSpaceId", "status");

-- CreateIndex
CREATE INDEX "BurialLink_deceasedId_status_idx" ON "BurialLink"("deceasedId", "status");

-- CreateIndex
CREATE INDEX "BurialLink_responsibleId_idx" ON "BurialLink"("responsibleId");

-- CreateIndex
CREATE INDEX "BurialLink_burialDate_idx" ON "BurialLink"("burialDate");

-- AddForeignKey
ALTER TABLE "ResponsibleLink" ADD CONSTRAINT "ResponsibleLink_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "Responsible"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponsibleLink" ADD CONSTRAINT "ResponsibleLink_deceasedId_fkey" FOREIGN KEY ("deceasedId") REFERENCES "Deceased"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponsibleLink" ADD CONSTRAINT "ResponsibleLink_burialSpaceId_fkey" FOREIGN KEY ("burialSpaceId") REFERENCES "BurialSpace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BurialLink" ADD CONSTRAINT "BurialLink_deceasedId_fkey" FOREIGN KEY ("deceasedId") REFERENCES "Deceased"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BurialLink" ADD CONSTRAINT "BurialLink_burialSpaceId_fkey" FOREIGN KEY ("burialSpaceId") REFERENCES "BurialSpace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BurialLink" ADD CONSTRAINT "BurialLink_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "Responsible"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DomainCheck
ALTER TABLE "BurialSpace" ADD CONSTRAINT "BurialSpace_capacity_by_type_check" CHECK (
    ("type" = 'SEPULTURA' AND "capacity" = 1)
    OR ("type" = 'JAZIGO' AND "capacity" >= 1)
);

-- DomainCheck
ALTER TABLE "BurialSpace" ADD CONSTRAINT "BurialSpace_location_required_check" CHECK (
    NULLIF(BTRIM("sector"), '') IS NOT NULL
    OR NULLIF(BTRIM("block"), '') IS NOT NULL
    OR NULLIF(BTRIM("street"), '') IS NOT NULL
    OR NULLIF(BTRIM("row"), '') IS NOT NULL
    OR NULLIF(BTRIM("number"), '') IS NOT NULL
    OR NULLIF(BTRIM("complement"), '') IS NOT NULL
);

-- DomainCheck
ALTER TABLE "Deceased" ADD CONSTRAINT "Deceased_known_dates_check" CHECK (
    ("datesUnknown" = TRUE AND "deathDate" IS NULL AND "burialDate" IS NULL)
    OR ("datesUnknown" = FALSE AND ("deathDate" IS NOT NULL OR "burialDate" IS NOT NULL))
);

-- DomainCheck
ALTER TABLE "Deceased" ADD CONSTRAINT "Deceased_date_order_check" CHECK (
    ("birthDate" IS NULL OR "deathDate" IS NULL OR "birthDate" <= "deathDate")
    AND ("birthDate" IS NULL OR "burialDate" IS NULL OR "birthDate" <= "burialDate")
    AND ("deathDate" IS NULL OR "burialDate" IS NULL OR "deathDate" <= "burialDate")
);

-- DomainCheck
ALTER TABLE "BurialLink" ADD CONSTRAINT "BurialLink_ending_state_check" CHECK (
    ("status" = 'ACTIVE' AND "endedAt" IS NULL AND "endReason" IS NULL)
    OR (
        "status" = 'ENDED'
        AND "endedAt" IS NOT NULL
        AND NULLIF(BTRIM("endReason"), '') IS NOT NULL
    )
);

-- DomainCheck
ALTER TABLE "ResponsibleLink" ADD CONSTRAINT "ResponsibleLink_ending_state_check" CHECK (
    ("status" = 'ACTIVE' AND "endedAt" IS NULL AND "endReason" IS NULL)
    OR (
        "status" = 'ENDED'
        AND "endedAt" IS NOT NULL
        AND NULLIF(BTRIM("endReason"), '') IS NOT NULL
    )
);

-- DomainCheck
ALTER TABLE "ResponsibleLink" ADD CONSTRAINT "ResponsibleLink_exclusive_target_check" CHECK (
    (
        "linkType" = 'DECEASED'
        AND "deceasedId" IS NOT NULL
        AND "burialSpaceId" IS NULL
    )
    OR (
        "linkType" = 'BURIAL_SPACE'
        AND "burialSpaceId" IS NOT NULL
        AND "deceasedId" IS NULL
    )
);

-- DomainCheck
ALTER TABLE "Responsible" ADD CONSTRAINT "Responsible_identifier_or_contact_check" CHECK (
    NULLIF(BTRIM("document"), '') IS NOT NULL
    OR NULLIF(BTRIM("phone"), '') IS NOT NULL
    OR NULLIF(BTRIM("email"), '') IS NOT NULL
    OR NULLIF(BTRIM("address"), '') IS NOT NULL
);

-- Cross-row capacity and BurialSpace occupancy consistency require serialized
-- service transactions; PostgreSQL CHECK constraints cannot safely count rows.
CREATE UNIQUE INDEX "BurialLink_one_active_per_deceased_key"
ON "BurialLink"("deceasedId")
WHERE "status" = 'ACTIVE';
