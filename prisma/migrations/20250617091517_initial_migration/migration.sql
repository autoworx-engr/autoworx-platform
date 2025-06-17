-- CreateEnum
CREATE TYPE "CommunicationType" AS ENUM ('SMS', 'EMAIL', 'BOTH');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "MarketingTarget" AS ENUM ('ALL_CLIENTS', 'WITH_ESTIMATE', 'WITH_INVOICE', 'WITHOUT_AN_ESTIMATE', 'INVOICE');

-- CreateEnum
CREATE TYPE "TargetCondition" AS ENUM ('ALL_CLIENTS_THIS_MONTH', 'ALL_CLIENTS_THIS_YEAR', 'ALL_CLIENTS_FROM_1_MONTH', 'ALL_CLIENTS_FROM_2_MONTHS', 'ALL_CLIENTS_FROM_3_MONTHS', 'ALL_CLIENTS_FROM_6_MONTHS', 'ALL_CLIENTS_FROM_LAST_YEAR');

-- CreateEnum
CREATE TYPE "ConditionType" AS ENUM ('APPOINTMENT_SCHEDULED', 'ESTIMATE_CREATED', 'TASK_CREATED', 'MESSAGE_SENT_CLIENT', 'MESSAGE_RECEIVED_CLIENT', 'TIME_DELAY');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmailTemplateType" AS ENUM ('Confirmation', 'Reminder');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "MailgunVerificationStatus" AS ENUM ('pending', 'verified', 'failed');

-- CreateEnum
CREATE TYPE "EMAIL_BY" AS ENUM ('Client', 'Company');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('Low', 'Medium', 'High');

-- CreateEnum
CREATE TYPE "InventoryProductHistoryType" AS ENUM ('Purchase', 'Sale');

-- CreateEnum
CREATE TYPE "InventoryProductType" AS ENUM ('Supply', 'Product');

-- CreateEnum
CREATE TYPE "InvoiceItemMaterialType" AS ENUM ('Material', 'Product');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('Invoice', 'Estimate');

-- CreateEnum
CREATE TYPE "MessageSection" AS ENUM ('internal', 'collaboration');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TASK_ASSIGNED', 'TASK_FINISHED', 'APPOINTMENT_CREATED', 'APPOINTMENT_REMINDER', 'APPOINTMENT_UPDATED', 'TASK_REMINDER', 'LEADS_GENERATED', 'LEADS_CLOSED', 'FOLLOW_UP', 'LEADS_ASSIGNED', 'STAGE', 'ESTIMATE_CREATED', 'INVOICE_CREATED', 'INVOICE_CONVERTED', 'INVOICE_AUTHORIZED', 'PAYMENT_RECEIVED', 'PAYMENT_DUE', 'DEPOSIT', 'WORK_ORDER_CREATED', 'WORK_ORDER_COMPLETED', 'DUE_DATE_PROXIMITY', 'INVENTORY_COMPLETELY_OUT', 'INVENTORY_NEWLY_ADDED', 'INVENTORY_LOW', 'LEAVE_REQUEST', 'PERFORMANCE_CHANGES', 'LATE_ARRIVALS', 'EARLY_LEAVE', 'JOB_COMPLETED', 'JOB_ASSIGNED', 'INTERNAL_MESSAGE_ALERT', 'CLIENT_MESSAGE_ALERT', 'CLIENT_CALL_ALERT', 'CLIENT_EMAIL_ALERT', 'COLLABORATION_MESSAGE_ALERT');

-- CreateEnum
CREATE TYPE "NotificationSection" AS ENUM ('CALENDAR_AND_TASK', 'LEAD_GENERATED_AND_SALES_PIPELINE', 'ESTIMATE_AND_INVOICE', 'PAYMENT', 'OPERATION_PIPELINE', 'INVENTORY', 'WORK_FORCE', 'COMMUNICATIONS');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CARD', 'CHECK', 'CASH', 'OTHER', 'DEPOSIT');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('MASTERCARD', 'VISA', 'AMEX', 'OTHER');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('Active', 'Expired');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('Percentage', 'Fixed');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('google', 'apple', 'email');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'employee');

-- CreateEnum
CREATE TYPE "EmployeeType" AS ENUM ('Admin', 'Manager', 'Sales', 'Technician', 'Other');

-- CreateEnum
CREATE TYPE "ClientSMSSentBy" AS ENUM ('Client', 'Company');

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "date" TIMESTAMP(3),
    "start_time" TEXT,
    "end_time" TEXT,
    "company_id" INTEGER NOT NULL,
    "customer_id" INTEGER,
    "vehicle_id" INTEGER,
    "draft_estimate" TEXT,
    "notes" TEXT,
    "confirmation_email_template_id" INTEGER,
    "confirmation_email_template_status" BOOLEAN NOT NULL DEFAULT false,
    "reminder_email_template_id" INTEGER,
    "reminder_email_template_status" BOOLEAN NOT NULL DEFAULT false,
    "times" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "googleEventId" TEXT,
    "timezone" TEXT,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentUser" (
    "id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "eventId" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineAutomationRule" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "conditionType" "ConditionType" NOT NULL,
    "targetColumnId" INTEGER,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "timeDelay" INTEGER,
    "companyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineAutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" SERIAL NOT NULL,
    "pipelineRuleId" INTEGER NOT NULL,
    "columnId" INTEGER NOT NULL,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeDelayExecution" (
    "id" SERIAL NOT NULL,
    "pipelineRuleId" INTEGER,
    "communicationRuleId" INTEGER,
    "leadId" INTEGER NOT NULL,
    "serviceMaintenanceRuleId" INTEGER,
    "executeAt" TIMESTAMP(3) NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "columnId" INTEGER,

    CONSTRAINT "TimeDelayExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationAutomationRule" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "timeDelay" INTEGER NOT NULL,
    "targetColumnId" INTEGER,
    "communicationType" "CommunicationType" NOT NULL,
    "isSendWeekDays" BOOLEAN NOT NULL DEFAULT false,
    "templateType" "TemplateType" NOT NULL,
    "subject" TEXT,
    "emailBody" TEXT,
    "smsBody" TEXT,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationAutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationStage" (
    "id" SERIAL NOT NULL,
    "communicationRuleId" INTEGER NOT NULL,
    "columnId" INTEGER NOT NULL,

    CONSTRAINT "CommunicationStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingAutomationRule" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "target" JSONB NOT NULL,
    "targetCondition" "TargetCondition" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "isAppointmentCreated" BOOLEAN NOT NULL DEFAULT false,
    "vehicleMinYear" TEXT,
    "vehicleMaxYear" TEXT,
    "vehicleBrand" TEXT,
    "vehicleModel" TEXT,
    "communicationType" "CommunicationType" NOT NULL,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "smsBody" TEXT,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingAutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceMaintenanceAutomationRule" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "conditionColumnId" INTEGER,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "timeDelay" INTEGER,
    "targetColumnId" INTEGER,
    "templateType" "TemplateType" NOT NULL DEFAULT 'SMS',
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "smsBody" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceMaintenanceAutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceMaintenanceStage" (
    "id" SERIAL NOT NULL,
    "serviceMaintenanceRuleId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "columnId" INTEGER,

    CONSTRAINT "ServiceMaintenanceStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceAutomationRule" (
    "id" SERIAL NOT NULL,

    CONSTRAINT "InvoiceAutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationAttachment" (
    "id" SERIAL NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "communicationId" INTEGER,
    "marketingId" INTEGER,
    "serviceMaintenanceId" INTEGER,
    "invoiceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "photo" TEXT NOT NULL DEFAULT '/images/default.png',
    "from_request" BOOLEAN DEFAULT false,
    "from_requested_company_id" INTEGER,
    "source_id" INTEGER,
    "converted" BOOLEAN DEFAULT false,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_company" TEXT,
    "tag_id" INTEGER,
    "notes" TEXT,
    "leadId" INTEGER,
    "firstContactTime" TIMESTAMP(3),
    "lastMailgunEmailReadId" INTEGER,
    "isStarred" BOOLEAN DEFAULT false,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCoupon" (
    "id" SERIAL NOT NULL,
    "coupon_id" INTEGER NOT NULL,
    "client_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientConversationTrack" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "email_is_read" BOOLEAN NOT NULL DEFAULT true,
    "sms_is_read" BOOLEAN NOT NULL DEFAULT true,
    "email_is_unread_count" INTEGER NOT NULL DEFAULT 0,
    "sms_unread_count" INTEGER NOT NULL DEFAULT 0,
    "email_last_message" TEXT NOT NULL DEFAULT 'no message',
    "sms_last_message" TEXT NOT NULL DEFAULT 'no message',
    "send_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientConversationTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "business_id" TEXT,
    "business_type" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "image" TEXT,
    "business_visibility" BOOLEAN DEFAULT true,
    "phone_visibility" BOOLEAN DEFAULT true,
    "address_visibility" BOOLEAN DEFAULT true,
    "tax" DECIMAL(65,30) DEFAULT 0,
    "serviceFee" DECIMAL(65,30) DEFAULT 0,
    "currency" TEXT DEFAULT 'USD',
    "terms" VARCHAR(800),
    "policy" VARCHAR(800),
    "google_email" TEXT,
    "google_refresh_token" TEXT,
    "google_calendar_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyLatitude" DOUBLE PRECISION,
    "companyLongitude" DOUBLE PRECISION,
    "zapierToken" VARCHAR(240),
    "twilioCredentialsId" INTEGER,
    "mailgunCredentialId" INTEGER,
    "stripeAccountId" TEXT,
    "timezone" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyJoin" (
    "id" SERIAL NOT NULL,
    "companyOneId" INTEGER NOT NULL,
    "companyTwoId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyJoin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSettings" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "weekStart" TEXT NOT NULL,
    "dayStart" TEXT NOT NULL,
    "dayEnd" TEXT NOT NULL,
    "weekend1" TEXT NOT NULL DEFAULT 'Saturday',
    "weekend2" TEXT NOT NULL DEFAULT 'Sunday',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT,
    "type" "EmailTemplateType" NOT NULL,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" SERIAL NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_email" TEXT,
    "client_phone" TEXT,
    "vehicle_info" TEXT NOT NULL,
    "vehicleId" INTEGER,
    "services" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "comments" TEXT,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "column_changed_at" TIMESTAMP(3),
    "column_id" INTEGER,
    "assigned_sales_id" INTEGER,
    "assigned_date" TIMESTAMP(3),
    "isLead" BOOLEAN NOT NULL DEFAULT true,
    "isQualified" BOOLEAN NOT NULL DEFAULT true,
    "isEstimateCreated" BOOLEAN DEFAULT false,
    "serviceId" INTEGER,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadTags" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadTags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadLink" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "generatedLink" TEXT NOT NULL,
    "QRCode" TEXT,
    "companyId" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companyEmailTemplate" (
    "id" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companyEmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwilioCredentials" (
    "id" SERIAL NOT NULL,
    "account_sid" TEXT NOT NULL,
    "auth_token" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "api_key_sid" TEXT NOT NULL,
    "api_key_secret" TEXT NOT NULL,
    "twiml_app_sid" TEXT,
    "phone_number_sid" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwilioCredentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailgunCredential" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "mailAddress" TEXT,
    "domain" TEXT NOT NULL,
    "apiKey" TEXT,
    "smtpPassword" TEXT,
    "dnsRecords" JSONB,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "MailgunVerificationStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailgunCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailgunEmail" (
    "id" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "emailBy" "EMAIL_BY" NOT NULL,
    "messageId" TEXT,
    "companyId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailgunEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailgunEmailAttachment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mailgunEmailId" INTEGER NOT NULL,

    CONSTRAINT "MailgunEmailAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Status" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "textColor" TEXT NOT NULL,
    "bgColor" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" INTEGER NOT NULL,

    CONSTRAINT "Status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Column" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "textColor" TEXT,
    "bgColor" TEXT,
    "company_id" INTEGER NOT NULL,

    CONSTRAINT "Column_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryProduct" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category_id" INTEGER,
    "quantity" DECIMAL(10,2) DEFAULT 1,
    "price" DECIMAL(65,30) DEFAULT 0,
    "unit" TEXT DEFAULT 'pc',
    "lot" TEXT,
    "vendor_id" INTEGER,
    "user_id" INTEGER,
    "type" "InventoryProductType" NOT NULL,
    "receipt" TEXT,
    "low_inventory_alert" INTEGER,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryProductTag" (
    "inventory_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "InventoryProductTag_pkey" PRIMARY KEY ("inventory_id","tag_id")
);

-- CreateTable
CREATE TABLE "InventoryProductHistory" (
    "id" SERIAL NOT NULL,
    "price" DECIMAL(65,30) DEFAULT 0,
    "quantity" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "type" "InventoryProductHistoryType" NOT NULL,
    "inventory_id" INTEGER NOT NULL,
    "invoice_id" TEXT,
    "vendor_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_lost" BOOLEAN DEFAULT false,
    "company_id" INTEGER NOT NULL,

    CONSTRAINT "InventoryProductHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "companyName" TEXT NOT NULL,
    "notes" TEXT,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventoryWirehouseProduct" (
    "id" SERIAL NOT NULL,
    "productName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "inventoryWirehouseProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" SERIAL NOT NULL,
    "invoice_id" TEXT,
    "service_id" INTEGER,
    "labor_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "service_desc" TEXT,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "canned" BOOLEAN DEFAULT false,
    "from_request" BOOLEAN DEFAULT false,
    "from_requested_company_id" INTEGER,
    "category_id" INTEGER,
    "company_id" INTEGER NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "vendor_id" INTEGER,
    "category_id" INTEGER,
    "notes" TEXT,
    "quantity" DECIMAL(10,2),
    "cost" DECIMAL(65,30),
    "sell" DECIMAL(65,30),
    "discount" DECIMAL(65,30),
    "company_id" INTEGER NOT NULL,
    "invoice_id" TEXT,
    "invoice_item_id" INTEGER,
    "product_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Labor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" INTEGER,
    "notes" TEXT,
    "hours" DECIMAL(13,3),
    "charge" DECIMAL(65,30),
    "discount" DECIMAL(65,30),
    "company_id" INTEGER NOT NULL,
    "canned_labor" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Labor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "textColor" TEXT NOT NULL,
    "bgColor" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" INTEGER NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemTag" (
    "itemId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "ItemTag_pkey" PRIMARY KEY ("itemId","tagId")
);

-- CreateTable
CREATE TABLE "MaterialTag" (
    "material_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "MaterialTag_pkey" PRIMARY KEY ("material_id","tag_id")
);

-- CreateTable
CREATE TABLE "LaborTag" (
    "labor_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "LaborTag_pkey" PRIMARY KEY ("labor_id","tag_id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "converted_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "type" "InvoiceType" NOT NULL DEFAULT 'Invoice',
    "customer_id" INTEGER,
    "vehicle_id" INTEGER,
    "subtotal" DECIMAL(8,2) DEFAULT 0,
    "discount" DECIMAL(8,2) DEFAULT 0,
    "tax" DECIMAL(8,2) DEFAULT 0,
    "serviceFee" DECIMAL(8,2) DEFAULT 0,
    "grand_total" DECIMAL(8,2) DEFAULT 0,
    "deposit" DECIMAL(8,2) DEFAULT 0,
    "due" DECIMAL(8,2) DEFAULT 0,
    "status_id" INTEGER,
    "internalNotes" TEXT,
    "dueDate" TEXT,
    "terms" TEXT,
    "policy" TEXT,
    "customerNotes" TEXT,
    "customerComments" TEXT,
    "company_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "assigned_to" INTEGER,
    "from_request" BOOLEAN DEFAULT false,
    "from_requested_company_id" INTEGER,
    "request_estimate_id" INTEGER,
    "column_id" INTEGER,
    "profit" INTEGER DEFAULT 0,
    "authorizedName" TEXT,
    "stripePaymentLink" TEXT,
    "is_work_order" BOOLEAN DEFAULT false,
    "work_order_created_at" TIMESTAMP(3),
    "serviceIndex" JSONB,
    "total_payment" DECIMAL(8,2) DEFAULT 0,
    "damage_notes" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceTags" (
    "id" SERIAL NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceTags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePhoto" (
    "id" SERIAL NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "photo" VARCHAR(1024) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoicePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestEstimate" (
    "id" SERIAL NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "sender_company_id" INTEGER NOT NULL,
    "receiver_id" INTEGER NOT NULL,
    "receiver_company_id" INTEGER NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technician" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "assigned_date" TIMESTAMP(3),
    "date_closed" TIMESTAMP(3),
    "due" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(65,30) DEFAULT 0,
    "priority" "Priority" DEFAULT 'Low',
    "status" TEXT,
    "new_note" TEXT,
    "service_id" INTEGER NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "invoice_item_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceRedo" (
    "id" SERIAL NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "service_id" INTEGER NOT NULL,
    "technician_id" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceRedo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceInspection" (
    "id" SERIAL NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "driver" BOOLEAN NOT NULL DEFAULT false,
    "passenger" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "to" INTEGER,
    "message" TEXT NOT NULL,
    "from" INTEGER NOT NULL,
    "group_id" INTEGER,
    "section" "MessageSection",
    "request_estimate_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatTrack" (
    "id" SERIAL NOT NULL,
    "lastMessage" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "section" "MessageSection",
    "sender_id" INTEGER,
    "receiver_id" INTEGER,
    "message_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" TEXT NOT NULL,
    "messageId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Group',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSettingsV2" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "section" "NotificationSection" NOT NULL,
    "notification_type" "NotificationType" NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT false,
    "push_enabled" BOOLEAN NOT NULL DEFAULT false,
    "text_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSettingsV2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "type" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_unread" BOOLEAN NOT NULL DEFAULT true,
    "avatarUrl" TEXT,
    "redirectUrl" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3),
    "notes" TEXT,
    "amount" DECIMAL(65,30),
    "refunded_amount" DECIMAL(65,30) DEFAULT 0,
    "refund_method" "PaymentType",
    "refund_reason" TEXT,
    "type" "PaymentType" NOT NULL,
    "invoice_id" TEXT,
    "company_id" INTEGER NOT NULL,
    "refund_created_at" TIMESTAMP(3),
    "refund_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardPayment" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "creditCard" TEXT,
    "cardType" "CardType" NOT NULL,

    CONSTRAINT "CardPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckPayment" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "checkNumber" TEXT,

    CONSTRAINT "CheckPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashPayment" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "receivedCash" TEXT,

    CONSTRAINT "CashPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtherPayment" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "paymentMethodId" INTEGER,

    CONSTRAINT "OtherPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepositPayment" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "depositMethod" TEXT,
    "depositNotes" TEXT,

    CONSTRAINT "DepositPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripePayment" (
    "id" SERIAL NOT NULL,
    "stripe_payment_intent_id" TEXT NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "status" "CouponStatus" NOT NULL,
    "redemptions" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3),
    "start_time" TEXT,
    "end_time" TEXT,
    "priority" "Priority" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "invoice_id" TEXT,
    "client_id" INTEGER,
    "googleEventId" TEXT,
    "lead_id" INTEGER,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskUser" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "eventId" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFeedback" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "whatHappened" TEXT NOT NULL,
    "whatExpected" TEXT NOT NULL,
    "snapshotImage" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFeedbackAttachment" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "user_feedback_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFeedbackAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "email_verified_at" TIMESTAMP(3),
    "image" TEXT NOT NULL DEFAULT '/images/default.png',
    "password" TEXT NOT NULL,
    "provider" "Provider" NOT NULL DEFAULT 'email',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "company_name" TEXT,
    "commission" DECIMAL(10,3) DEFAULT 0,
    "role" "Role" NOT NULL DEFAULT 'admin',
    "employeeType" "EmployeeType" NOT NULL DEFAULT 'Admin',
    "join_date" TIMESTAMP(3),
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthToken" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_in" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionForManager" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "communication_hub_internal" BOOLEAN NOT NULL DEFAULT true,
    "communication_hub_clients" BOOLEAN NOT NULL DEFAULT true,
    "communication_hub_collaboration" BOOLEAN NOT NULL DEFAULT true,
    "estimates_invoices" BOOLEAN NOT NULL DEFAULT true,
    "calendar_task" BOOLEAN NOT NULL DEFAULT true,
    "payments" BOOLEAN NOT NULL DEFAULT true,
    "workforce_management" BOOLEAN NOT NULL DEFAULT true,
    "reporting" BOOLEAN NOT NULL DEFAULT true,
    "inventoryAll" BOOLEAN NOT NULL DEFAULT true,
    "integrations" BOOLEAN NOT NULL DEFAULT false,
    "sales_pipeline" BOOLEAN NOT NULL DEFAULT true,
    "shop_pipeline" BOOLEAN NOT NULL DEFAULT true,
    "business_settings" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PermissionForManager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionForSales" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "communication_hub_internal" BOOLEAN NOT NULL DEFAULT true,
    "communication_hub_clients" BOOLEAN NOT NULL DEFAULT true,
    "communication_hub_collaboration" BOOLEAN NOT NULL DEFAULT true,
    "estimates_invoices" BOOLEAN NOT NULL DEFAULT true,
    "calendar_task" BOOLEAN NOT NULL DEFAULT true,
    "payments" BOOLEAN NOT NULL DEFAULT false,
    "sales_pipeline" BOOLEAN NOT NULL DEFAULT true,
    "workforce_management" BOOLEAN NOT NULL DEFAULT true,
    "reportingViewOnly" BOOLEAN NOT NULL DEFAULT true,
    "inventoryAllViewOnly" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PermissionForSales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionForTechnician" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "communication_hub_internal" BOOLEAN NOT NULL DEFAULT true,
    "calendar_task" BOOLEAN NOT NULL DEFAULT true,
    "shop_pipeline" BOOLEAN NOT NULL DEFAULT true,
    "workforce_management" BOOLEAN NOT NULL DEFAULT true,
    "reportingViewOnly" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PermissionForTechnician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionForOther" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "communication_hub_internal" BOOLEAN NOT NULL DEFAULT false,
    "communication_hub_clients" BOOLEAN NOT NULL DEFAULT false,
    "communication_hub_collaboration" BOOLEAN NOT NULL DEFAULT false,
    "estimates_invoices" BOOLEAN NOT NULL DEFAULT false,
    "calendar_task" BOOLEAN NOT NULL DEFAULT false,
    "payments" BOOLEAN NOT NULL DEFAULT false,
    "workforce_management" BOOLEAN NOT NULL DEFAULT false,
    "reporting" BOOLEAN NOT NULL DEFAULT false,
    "inventoryAll" BOOLEAN NOT NULL DEFAULT false,
    "integrations" BOOLEAN NOT NULL DEFAULT false,
    "sales_pipeline" BOOLEAN NOT NULL DEFAULT false,
    "shop_pipeline" BOOLEAN NOT NULL DEFAULT false,
    "business_settings" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PermissionForOther_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "communication_hub_internal" BOOLEAN NOT NULL DEFAULT false,
    "communication_hub_clients" BOOLEAN NOT NULL DEFAULT false,
    "communication_hub_collaboration" BOOLEAN NOT NULL DEFAULT false,
    "estimates_invoices" BOOLEAN NOT NULL DEFAULT false,
    "calendar_task" BOOLEAN NOT NULL DEFAULT false,
    "payments" BOOLEAN NOT NULL DEFAULT false,
    "workforce_management" BOOLEAN NOT NULL DEFAULT false,
    "reporting" BOOLEAN NOT NULL DEFAULT false,
    "inventory" BOOLEAN NOT NULL DEFAULT false,
    "integrations" BOOLEAN NOT NULL DEFAULT false,
    "sales_pipeline" BOOLEAN NOT NULL DEFAULT false,
    "shop_pipeline" BOOLEAN NOT NULL DEFAULT false,
    "business_settings" BOOLEAN NOT NULL DEFAULT false,
    "workforce_management_view_only" BOOLEAN NOT NULL DEFAULT false,
    "reporting_view_only" BOOLEAN NOT NULL DEFAULT false,
    "inventory_all_view_only" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClockInOut" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "clock_in" TIMESTAMP(3) NOT NULL,
    "clock_out" TIMESTAMP(3),
    "timezone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClockInOut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClockBreak" (
    "id" SERIAL NOT NULL,
    "clock_in_out_id" INTEGER NOT NULL,
    "break_start" TIMESTAMP(3) NOT NULL,
    "break_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClockBreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSMS" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "sentBy" "ClientSMSSentBy" NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "user_id" INTEGER,
    "company_id" INTEGER NOT NULL,
    "client_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientSMS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCall" (
    "id" SERIAL NOT NULL,
    "callSid" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "status" TEXT,
    "direction" TEXT,
    "duration" INTEGER,
    "recordingUrl" TEXT,
    "recordingSid" TEXT,
    "callStartTime" TIMESTAMP(3),
    "callEndTime" TIMESTAMP(3),
    "sentBy" "ClientSMSSentBy" NOT NULL,
    "user_id" INTEGER,
    "company_id" INTEGER NOT NULL,
    "client_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSmsAttachments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_sms_id" INTEGER NOT NULL,

    CONSTRAINT "ClientSmsAttachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" SERIAL NOT NULL,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "submodel" TEXT,
    "type" TEXT,
    "transmission" TEXT,
    "engineSize" TEXT,
    "license" TEXT,
    "vin" TEXT,
    "notes" TEXT,
    "from_request" BOOLEAN DEFAULT false,
    "from_requested_company_id" INTEGER,
    "color_id" INTEGER,
    "customer_id" INTEGER,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleColor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleColor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleParts" (
    "id" SERIAL NOT NULL,
    "partsName" TEXT NOT NULL,
    "technician_id" INTEGER,
    "invoice_id" TEXT NOT NULL,
    "service_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleParts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserGroups" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_UserGroups_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "fk_tasks_user" ON "Appointment"("user_id");

-- CreateIndex
CREATE INDEX "fk_tasks_company" ON "Appointment"("company_id");

-- CreateIndex
CREATE INDEX "fk_tasks_client" ON "Appointment"("customer_id");

-- CreateIndex
CREATE INDEX "AppointmentUser_appointment_id_idx" ON "AppointmentUser"("appointment_id");

-- CreateIndex
CREATE INDEX "PipelineAutomationRule_companyId_idx" ON "PipelineAutomationRule"("companyId");

-- CreateIndex
CREATE INDEX "PipelineStage_pipelineRuleId_idx" ON "PipelineStage"("pipelineRuleId");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_pipelineRuleId_columnId_key" ON "PipelineStage"("pipelineRuleId", "columnId");

-- CreateIndex
CREATE INDEX "TimeDelayExecution_executeAt_status_idx" ON "TimeDelayExecution"("executeAt", "status");

-- CreateIndex
CREATE INDEX "TimeDelayExecution_pipelineRuleId_idx" ON "TimeDelayExecution"("pipelineRuleId");

-- CreateIndex
CREATE INDEX "TimeDelayExecution_communicationRuleId_idx" ON "TimeDelayExecution"("communicationRuleId");

-- CreateIndex
CREATE INDEX "TimeDelayExecution_leadId_idx" ON "TimeDelayExecution"("leadId");

-- CreateIndex
CREATE INDEX "CommunicationStage_communicationRuleId_idx" ON "CommunicationStage"("communicationRuleId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationStage_communicationRuleId_columnId_key" ON "CommunicationStage"("communicationRuleId", "columnId");

-- CreateIndex
CREATE INDEX "ServiceMaintenanceStage_serviceMaintenanceRuleId_idx" ON "ServiceMaintenanceStage"("serviceMaintenanceRuleId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceMaintenanceStage_serviceMaintenanceRuleId_serviceId_key" ON "ServiceMaintenanceStage"("serviceMaintenanceRuleId", "serviceId");

-- CreateIndex
CREATE INDEX "fk_customers_company" ON "Client"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "ClientConversationTrack_client_id_key" ON "ClientConversationTrack"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "Company_zapierToken_key" ON "Company"("zapierToken");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSettings_company_id_key" ON "CalendarSettings"("company_id");

-- CreateIndex
CREATE INDEX "CalendarSettings_company_id_idx" ON "CalendarSettings"("company_id");

-- CreateIndex
CREATE INDEX "Holiday_company_id_idx" ON "Holiday"("company_id");

-- CreateIndex
CREATE INDEX "Holiday_month_idx" ON "Holiday"("month");

-- CreateIndex
CREATE INDEX "Holiday_year_idx" ON "Holiday"("year");

-- CreateIndex
CREATE INDEX "EmailTemplate_company_id_idx" ON "EmailTemplate"("company_id");

-- CreateIndex
CREATE INDEX "Lead_serviceId_idx" ON "Lead"("serviceId");

-- CreateIndex
CREATE INDEX "Lead_vehicleId_idx" ON "Lead"("vehicleId");

-- CreateIndex
CREATE INDEX "Lead_column_id_idx" ON "Lead"("column_id");

-- CreateIndex
CREATE INDEX "Lead_company_id_idx" ON "Lead"("company_id");

-- CreateIndex
CREATE INDEX "Lead_assigned_sales_id_idx" ON "Lead"("assigned_sales_id");

-- CreateIndex
CREATE INDEX "Lead_client_email_idx" ON "Lead"("client_email");

-- CreateIndex
CREATE INDEX "Lead_column_changed_at_idx" ON "Lead"("column_changed_at");

-- CreateIndex
CREATE INDEX "Lead_isEstimateCreated_idx" ON "Lead"("isEstimateCreated");

-- CreateIndex
CREATE INDEX "fk_lead_tags_lead" ON "LeadTags"("lead_id");

-- CreateIndex
CREATE INDEX "fk_lead_tags_tag" ON "LeadTags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "TwilioCredentials_company_id_key" ON "TwilioCredentials"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "MailgunCredential_companyId_domain_key" ON "MailgunCredential"("companyId", "domain");

-- CreateIndex
CREATE INDEX "Column_company_id_idx" ON "Column"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventoryWirehouseProduct_productName_key" ON "inventoryWirehouseProduct"("productName");

-- CreateIndex
CREATE INDEX "inventoryWirehouseProduct_productName_idx" ON "inventoryWirehouseProduct"("productName");

-- CreateIndex
CREATE INDEX "inventoryWirehouseProduct_category_idx" ON "inventoryWirehouseProduct"("category");

-- CreateIndex
CREATE INDEX "inventoryWirehouseProduct_unit_idx" ON "inventoryWirehouseProduct"("unit");

-- CreateIndex
CREATE INDEX "inventoryWirehouseProduct_category_productName_idx" ON "inventoryWirehouseProduct"("category", "productName");

-- CreateIndex
CREATE INDEX "fk_services_company" ON "Service"("company_id");

-- CreateIndex
CREATE INDEX "fk_materials_company" ON "Material"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_request_estimate_id_key" ON "Invoice"("request_estimate_id");

-- CreateIndex
CREATE INDEX "fk_invoices_company" ON "Invoice"("company_id");

-- CreateIndex
CREATE INDEX "fk_invoice_tags_invoice" ON "InvoiceTags"("invoice_id");

-- CreateIndex
CREATE INDEX "fk_invoice_tags_tag" ON "InvoiceTags"("tag_id");

-- CreateIndex
CREATE INDEX "fk_invoice_photos_invoice" ON "InvoicePhoto"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "RequestEstimate_vehicle_id_key" ON "RequestEstimate"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "RequestEstimate_service_id_key" ON "RequestEstimate"("service_id");

-- CreateIndex
CREATE INDEX "fk_invoice_inspections_invoice" ON "InvoiceInspection"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "Message_request_estimate_id_key" ON "Message"("request_estimate_id");

-- CreateIndex
CREATE INDEX "fk_messages_to" ON "Message"("to");

-- CreateIndex
CREATE INDEX "fk_messages_from" ON "Message"("from");

-- CreateIndex
CREATE INDEX "fk_messages_group" ON "Message"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "ChatTrack_message_id_key" ON "ChatTrack"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSettingsV2_user_id_notification_type_key" ON "NotificationSettingsV2"("user_id", "notification_type");

-- CreateIndex
CREATE INDEX "Payment_company_id_idx" ON "Payment"("company_id");

-- CreateIndex
CREATE INDEX "Payment_invoice_id_idx" ON "Payment"("invoice_id");

-- CreateIndex
CREATE INDEX "Payment_date_idx" ON "Payment"("date");

-- CreateIndex
CREATE INDEX "Payment_amount_idx" ON "Payment"("amount");

-- CreateIndex
CREATE UNIQUE INDEX "CardPayment_paymentId_key" ON "CardPayment"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckPayment_paymentId_key" ON "CheckPayment"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "CashPayment_paymentId_key" ON "CashPayment"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "OtherPayment_paymentId_key" ON "OtherPayment"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "DepositPayment_paymentId_key" ON "DepositPayment"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "StripePayment_stripe_payment_intent_id_key" ON "StripePayment"("stripe_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "StripePayment_payment_id_key" ON "StripePayment"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "StripePayment_invoice_id_key" ON "StripePayment"("invoice_id");

-- CreateIndex
CREATE INDEX "Task_user_id_idx" ON "Task"("user_id");

-- CreateIndex
CREATE INDEX "Task_company_id_idx" ON "Task"("company_id");

-- CreateIndex
CREATE INDEX "TaskUser_task_id_idx" ON "TaskUser"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "fk_users_company" ON "User"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_user_id_key" ON "PasswordResetToken"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthToken_user_id_key" ON "OAuthToken"("user_id");

-- CreateIndex
CREATE INDEX "fk_oauth_tokens_user" ON "OAuthToken"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_user_id_company_id_key" ON "Permission"("user_id", "company_id");

-- CreateIndex
CREATE INDEX "fk_clock_in_out_user" ON "ClockInOut"("user_id");

-- CreateIndex
CREATE INDEX "fk_clock_in_out_company" ON "ClockInOut"("company_id");

-- CreateIndex
CREATE INDEX "fk_clock_break_clock_in_out" ON "ClockBreak"("clock_in_out_id");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCall_callSid_key" ON "ClientCall"("callSid");

-- CreateIndex
CREATE INDEX "fk_vehicles_company" ON "Vehicle"("company_id");

-- CreateIndex
CREATE INDEX "_UserGroups_B_index" ON "_UserGroups"("B");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentUser" ADD CONSTRAINT "AppointmentUser_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentUser" ADD CONSTRAINT "AppointmentUser_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineAutomationRule" ADD CONSTRAINT "PipelineAutomationRule_targetColumnId_fkey" FOREIGN KEY ("targetColumnId") REFERENCES "Column"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineAutomationRule" ADD CONSTRAINT "PipelineAutomationRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineRuleId_fkey" FOREIGN KEY ("pipelineRuleId") REFERENCES "PipelineAutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "Column"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeDelayExecution" ADD CONSTRAINT "TimeDelayExecution_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeDelayExecution" ADD CONSTRAINT "TimeDelayExecution_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "Column"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeDelayExecution" ADD CONSTRAINT "TimeDelayExecution_pipelineRuleId_fkey" FOREIGN KEY ("pipelineRuleId") REFERENCES "PipelineAutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeDelayExecution" ADD CONSTRAINT "TimeDelayExecution_communicationRuleId_fkey" FOREIGN KEY ("communicationRuleId") REFERENCES "CommunicationAutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeDelayExecution" ADD CONSTRAINT "TimeDelayExecution_serviceMaintenanceRuleId_fkey" FOREIGN KEY ("serviceMaintenanceRuleId") REFERENCES "ServiceMaintenanceAutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomationRule" ADD CONSTRAINT "CommunicationAutomationRule_targetColumnId_fkey" FOREIGN KEY ("targetColumnId") REFERENCES "Column"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationStage" ADD CONSTRAINT "CommunicationStage_communicationRuleId_fkey" FOREIGN KEY ("communicationRuleId") REFERENCES "CommunicationAutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationStage" ADD CONSTRAINT "CommunicationStage_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "Column"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMaintenanceAutomationRule" ADD CONSTRAINT "ServiceMaintenanceAutomationRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMaintenanceAutomationRule" ADD CONSTRAINT "ServiceMaintenanceAutomationRule_targetColumnId_fkey" FOREIGN KEY ("targetColumnId") REFERENCES "Column"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMaintenanceAutomationRule" ADD CONSTRAINT "ServiceMaintenanceAutomationRule_conditionColumnId_fkey" FOREIGN KEY ("conditionColumnId") REFERENCES "Column"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMaintenanceStage" ADD CONSTRAINT "ServiceMaintenanceStage_serviceMaintenanceRuleId_fkey" FOREIGN KEY ("serviceMaintenanceRuleId") REFERENCES "ServiceMaintenanceAutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMaintenanceStage" ADD CONSTRAINT "ServiceMaintenanceStage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAttachment" ADD CONSTRAINT "AutomationAttachment_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "CommunicationAutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAttachment" ADD CONSTRAINT "AutomationAttachment_marketingId_fkey" FOREIGN KEY ("marketingId") REFERENCES "MarketingAutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAttachment" ADD CONSTRAINT "AutomationAttachment_serviceMaintenanceId_fkey" FOREIGN KEY ("serviceMaintenanceId") REFERENCES "ServiceMaintenanceAutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAttachment" ADD CONSTRAINT "AutomationAttachment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "InvoiceAutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCoupon" ADD CONSTRAINT "ClientCoupon_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCoupon" ADD CONSTRAINT "ClientCoupon_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientConversationTrack" ADD CONSTRAINT "ClientConversationTrack_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_twilioCredentialsId_fkey" FOREIGN KEY ("twilioCredentialsId") REFERENCES "TwilioCredentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_mailgunCredentialId_fkey" FOREIGN KEY ("mailgunCredentialId") REFERENCES "MailgunCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyJoin" ADD CONSTRAINT "CompanyJoin_companyOneId_fkey" FOREIGN KEY ("companyOneId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyJoin" ADD CONSTRAINT "CompanyJoin_companyTwoId_fkey" FOREIGN KEY ("companyTwoId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSettings" ADD CONSTRAINT "CalendarSettings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_column_id_fkey" FOREIGN KEY ("column_id") REFERENCES "Column"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assigned_sales_id_fkey" FOREIGN KEY ("assigned_sales_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTags" ADD CONSTRAINT "LeadTags_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTags" ADD CONSTRAINT "LeadTags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadLink" ADD CONSTRAINT "LeadLink_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companyEmailTemplate" ADD CONSTRAINT "companyEmailTemplate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailgunEmail" ADD CONSTRAINT "MailgunEmail_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailgunEmail" ADD CONSTRAINT "MailgunEmail_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailgunEmailAttachment" ADD CONSTRAINT "MailgunEmailAttachment_mailgunEmailId_fkey" FOREIGN KEY ("mailgunEmailId") REFERENCES "MailgunEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Status" ADD CONSTRAINT "Status_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Column" ADD CONSTRAINT "Column_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryProduct" ADD CONSTRAINT "InventoryProduct_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryProduct" ADD CONSTRAINT "InventoryProduct_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryProduct" ADD CONSTRAINT "InventoryProduct_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryProduct" ADD CONSTRAINT "InventoryProduct_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryProductTag" ADD CONSTRAINT "InventoryProductTag_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "InventoryProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryProductTag" ADD CONSTRAINT "InventoryProductTag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryProductHistory" ADD CONSTRAINT "InventoryProductHistory_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "InventoryProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryProductHistory" ADD CONSTRAINT "InventoryProductHistory_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryProductHistory" ADD CONSTRAINT "InventoryProductHistory_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryProductHistory" ADD CONSTRAINT "InventoryProductHistory_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_labor_id_fkey" FOREIGN KEY ("labor_id") REFERENCES "Labor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_invoice_item_id_fkey" FOREIGN KEY ("invoice_item_id") REFERENCES "InvoiceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "InventoryProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Labor" ADD CONSTRAINT "Labor_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Labor" ADD CONSTRAINT "Labor_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTag" ADD CONSTRAINT "ItemTag_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InvoiceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTag" ADD CONSTRAINT "ItemTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTag" ADD CONSTRAINT "MaterialTag_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTag" ADD CONSTRAINT "MaterialTag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborTag" ADD CONSTRAINT "LaborTag_labor_id_fkey" FOREIGN KEY ("labor_id") REFERENCES "Labor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborTag" ADD CONSTRAINT "LaborTag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "Status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_request_estimate_id_fkey" FOREIGN KEY ("request_estimate_id") REFERENCES "RequestEstimate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_column_id_fkey" FOREIGN KEY ("column_id") REFERENCES "Column"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceTags" ADD CONSTRAINT "InvoiceTags_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceTags" ADD CONSTRAINT "InvoiceTags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePhoto" ADD CONSTRAINT "InvoicePhoto_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestEstimate" ADD CONSTRAINT "RequestEstimate_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestEstimate" ADD CONSTRAINT "RequestEstimate_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestEstimate" ADD CONSTRAINT "RequestEstimate_sender_company_id_fkey" FOREIGN KEY ("sender_company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestEstimate" ADD CONSTRAINT "RequestEstimate_receiver_company_id_fkey" FOREIGN KEY ("receiver_company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestEstimate" ADD CONSTRAINT "RequestEstimate_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestEstimate" ADD CONSTRAINT "RequestEstimate_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_invoice_item_id_fkey" FOREIGN KEY ("invoice_item_id") REFERENCES "InvoiceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceRedo" ADD CONSTRAINT "InvoiceRedo_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceRedo" ADD CONSTRAINT "InvoiceRedo_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceRedo" ADD CONSTRAINT "InvoiceRedo_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "Technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceInspection" ADD CONSTRAINT "InvoiceInspection_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_request_estimate_id_fkey" FOREIGN KEY ("request_estimate_id") REFERENCES "RequestEstimate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatTrack" ADD CONSTRAINT "ChatTrack_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSettingsV2" ADD CONSTRAINT "NotificationSettingsV2_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSettingsV2" ADD CONSTRAINT "NotificationSettingsV2_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardPayment" ADD CONSTRAINT "CardPayment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckPayment" ADD CONSTRAINT "CheckPayment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashPayment" ADD CONSTRAINT "CashPayment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtherPayment" ADD CONSTRAINT "OtherPayment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtherPayment" ADD CONSTRAINT "OtherPayment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepositPayment" ADD CONSTRAINT "DepositPayment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripePayment" ADD CONSTRAINT "StripePayment_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripePayment" ADD CONSTRAINT "StripePayment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripePayment" ADD CONSTRAINT "StripePayment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskUser" ADD CONSTRAINT "TaskUser_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskUser" ADD CONSTRAINT "TaskUser_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeedbackAttachment" ADD CONSTRAINT "UserFeedbackAttachment_user_feedback_id_fkey" FOREIGN KEY ("user_feedback_id") REFERENCES "UserFeedback"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthToken" ADD CONSTRAINT "OAuthToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionForManager" ADD CONSTRAINT "PermissionForManager_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionForSales" ADD CONSTRAINT "PermissionForSales_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionForTechnician" ADD CONSTRAINT "PermissionForTechnician_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionForOther" ADD CONSTRAINT "PermissionForOther_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClockInOut" ADD CONSTRAINT "ClockInOut_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClockInOut" ADD CONSTRAINT "ClockInOut_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClockBreak" ADD CONSTRAINT "ClockBreak_clock_in_out_id_fkey" FOREIGN KEY ("clock_in_out_id") REFERENCES "ClockInOut"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSMS" ADD CONSTRAINT "ClientSMS_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSMS" ADD CONSTRAINT "ClientSMS_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSMS" ADD CONSTRAINT "ClientSMS_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCall" ADD CONSTRAINT "ClientCall_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCall" ADD CONSTRAINT "ClientCall_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCall" ADD CONSTRAINT "ClientCall_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSmsAttachments" ADD CONSTRAINT "ClientSmsAttachments_client_sms_id_fkey" FOREIGN KEY ("client_sms_id") REFERENCES "ClientSMS"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "VehicleColor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleColor" ADD CONSTRAINT "VehicleColor_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleParts" ADD CONSTRAINT "VehicleParts_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleParts" ADD CONSTRAINT "VehicleParts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleParts" ADD CONSTRAINT "VehicleParts_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserGroups" ADD CONSTRAINT "_UserGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserGroups" ADD CONSTRAINT "_UserGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
