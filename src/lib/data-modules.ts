export type FieldKind = "text" | "textarea" | "number" | "date" | "datetime-local" | "uuid" | "select" | "password" | "email";

export type DataField = {
  name: string;
  label: string;
  kind?: FieldKind;
  required?: boolean;
  maxLength?: number;
  options?: readonly string[];
};

export type DataModule = {
  table: string;
  resource: string;
  title: string;
  description: string;
  columns: { key: string; label: string }[];
  fields: DataField[];
  orderBy?: string;
  searchColumn?: string;
  readOnly?: boolean;
  allowDelete?: boolean;
};

const status = (...options: string[]): readonly string[] => options;

export const dataModules: Record<string, DataModule> = {
  bookings: {
    table: "bookings", resource: "bookings", title: "Bookings",
    description: "Create and manage customer reservations, package assignments, and booking balances.",
    columns: [{ key: "id", label: "Booking UUID" }, { key: "reference", label: "Reference" }, { key: "customer_id", label: "Customer UUID" }, { key: "package_id", label: "Package UUID" }, { key: "departure_date", label: "Departure" }, { key: "total_payable_minor", label: "Total (minor units)" }, { key: "status", label: "Status" }],
    fields: [
      { name: "reference", label: "Booking reference", required: true, maxLength: 40 },
      { name: "customer_id", label: "Customer UUID", kind: "uuid", required: true },
      { name: "package_id", label: "Package UUID", kind: "uuid" },
      { name: "departure_date", label: "Departure date", kind: "date" },
      { name: "return_date", label: "Return date", kind: "date" },
      { name: "base_price_minor", label: "Base price (minor units)", kind: "number", required: true },
      { name: "discount_minor", label: "Discount (minor units)", kind: "number" },
      { name: "additional_charges_minor", label: "Additional charges (minor units)", kind: "number" },
      { name: "total_payable_minor", label: "Total payable (minor units)", kind: "number", required: true },
      { name: "currency", label: "Currency", required: true, maxLength: 3 },
      { name: "status", label: "Status", kind: "select", required: true, options: status("DRAFT", "PENDING", "CONFIRMED", "CANCELLED", "COMPLETED") },
    ],
    orderBy: "created_at",
    searchColumn: "reference",
  },
  passengers: {
    table: "passengers", resource: "passengers", title: "Passengers",
    description: "Maintain passenger identity and passport-expiry details. Passport numbers are never shown in the list.",
    columns: [{ key: "id", label: "Passenger UUID" }, { key: "passport_name", label: "Passenger" }, { key: "nationality", label: "Nationality" }, { key: "date_of_birth", label: "Date of birth" }, { key: "passport_expiry_date", label: "Passport expiry" }],
    fields: [
      { name: "passport_name", label: "Name as on passport", required: true, maxLength: 150 },
      { name: "passport_number", label: "Passport number", kind: "password", required: true, maxLength: 50 },
      { name: "date_of_birth", label: "Date of birth", kind: "date", required: true },
      { name: "nationality", label: "Nationality", required: true, maxLength: 80 },
      { name: "passport_issue_date", label: "Passport issue date", kind: "date" },
      { name: "passport_expiry_date", label: "Passport expiry date", kind: "date" },
    ],
    orderBy: "created_at",
    searchColumn: "passport_name",
  },
  visas: {
    table: "visa_applications", resource: "visas", title: "Visa management",
    description: "Track each passenger's visa application, requirements, submission, and expiry.",
    columns: [{ key: "reference", label: "Reference" }, { key: "passenger_id", label: "Passenger UUID" }, { key: "booking_id", label: "Booking UUID" }, { key: "submitted_at", label: "Submitted" }, { key: "expiry_date", label: "Expiry" }, { key: "status", label: "Status" }],
    fields: [
      { name: "reference", label: "Application reference", required: true, maxLength: 40 },
      { name: "passenger_id", label: "Passenger UUID", kind: "uuid", required: true },
      { name: "booking_id", label: "Booking UUID", kind: "uuid", required: true },
      { name: "required_documents", label: "Required documents", kind: "textarea", maxLength: 3000 },
      { name: "submitted_at", label: "Submitted date", kind: "date" },
      { name: "status", label: "Status", kind: "select", required: true, options: status("NOT_STARTED", "DOCUMENTS_REQUIRED", "SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED", "EXPIRED") },
      { name: "expiry_date", label: "Expiry date", kind: "date" },
      { name: "internal_notes", label: "Internal notes", kind: "textarea", maxLength: 3000 },
    ],
    orderBy: "created_at",
    searchColumn: "reference",
  },
  flights: {
    table: "flights", resource: "flights", title: "Flight management",
    description: "Maintain flight schedules and ticket status for bookings and passengers.",
    columns: [{ key: "airline", label: "Airline" }, { key: "flight_number", label: "Flight" }, { key: "departure_airport", label: "From" }, { key: "arrival_airport", label: "To" }, { key: "departure_at", label: "Departure" }, { key: "ticket_status", label: "Ticket status" }],
    fields: [
      { name: "airline", label: "Airline", required: true, maxLength: 100 },
      { name: "flight_number", label: "Flight number", required: true, maxLength: 20 },
      { name: "departure_airport", label: "Departure airport", required: true, maxLength: 10 },
      { name: "arrival_airport", label: "Arrival airport", required: true, maxLength: 10 },
      { name: "departure_at", label: "Departure", kind: "datetime-local", required: true },
      { name: "arrival_at", label: "Arrival", kind: "datetime-local", required: true },
      { name: "booking_id", label: "Booking UUID", kind: "uuid" },
      { name: "passenger_id", label: "Passenger UUID", kind: "uuid" },
      { name: "pnr", label: "PNR", maxLength: 20 },
      { name: "ticket_number", label: "Ticket number", maxLength: 40 },
      { name: "ticket_status", label: "Ticket status", kind: "select", required: true, options: status("NOT_TICKETED", "RESERVED", "TICKETED", "CANCELLED") },
    ],
    orderBy: "departure_at",
    searchColumn: "airline",
  },
  hotels: {
    table: "hotel_reservations", resource: "hotels", title: "Hotel management",
    description: "Coordinate hotel reservations, supplier references, room quantity, and pricing.",
    columns: [{ key: "hotel_name", label: "Hotel" }, { key: "city", label: "City" }, { key: "booking_id", label: "Booking UUID" }, { key: "supplier_id", label: "Supplier UUID" }, { key: "check_in", label: "Check-in" }, { key: "check_out", label: "Check-out" }, { key: "status", label: "Status" }],
    fields: [
      { name: "booking_id", label: "Booking UUID", kind: "uuid", required: true },
      { name: "supplier_id", label: "Supplier UUID", kind: "uuid" },
      { name: "hotel_name", label: "Hotel name", required: true, maxLength: 150 },
      { name: "city", label: "City", required: true, maxLength: 80 },
      { name: "room_type", label: "Room type", required: true, maxLength: 80 },
      { name: "check_in", label: "Check-in", kind: "date", required: true },
      { name: "check_out", label: "Check-out", kind: "date", required: true },
      { name: "room_quantity", label: "Rooms", kind: "number", required: true },
      { name: "confirmation", label: "Confirmation", maxLength: 80 },
      { name: "cost_minor", label: "Cost (minor units)", kind: "number", required: true },
      { name: "selling_minor", label: "Selling price (minor units)", kind: "number", required: true },
      { name: "currency", label: "Currency", required: true, maxLength: 3 },
      { name: "status", label: "Status", kind: "select", required: true, options: status("REQUESTED", "CONFIRMED", "CANCELLED", "COMPLETED") },
    ],
    orderBy: "check_in",
    searchColumn: "hotel_name",
  },
  transport: {
    table: "transport_arrangements", resource: "transport", title: "Transport",
    description: "Plan ground transport, provider assignments, pickup locations, and schedules.",
    columns: [{ key: "vehicle", label: "Vehicle" }, { key: "pickup", label: "Pickup" }, { key: "destination", label: "Destination" }, { key: "booking_id", label: "Booking UUID" }, { key: "supplier_id", label: "Supplier UUID" }, { key: "travel_at", label: "Travel time" }, { key: "status", label: "Status" }],
    fields: [
      { name: "booking_id", label: "Booking UUID", kind: "uuid", required: true },
      { name: "supplier_id", label: "Supplier UUID", kind: "uuid" },
      { name: "vehicle", label: "Vehicle", required: true, maxLength: 100 },
      { name: "pickup", label: "Pickup", required: true, maxLength: 200 },
      { name: "destination", label: "Destination", required: true, maxLength: 200 },
      { name: "travel_at", label: "Travel time", kind: "datetime-local", required: true },
      { name: "passenger_count", label: "Passenger count", kind: "number", required: true },
      { name: "cost_minor", label: "Cost (minor units)", kind: "number", required: true },
      { name: "selling_minor", label: "Selling price (minor units)", kind: "number", required: true },
      { name: "currency", label: "Currency", required: true, maxLength: 3 },
      { name: "status", label: "Status", kind: "select", required: true, options: status("REQUESTED", "CONFIRMED", "CANCELLED", "COMPLETED") },
    ],
    orderBy: "travel_at",
    searchColumn: "vehicle",
  },
  suppliers: {
    table: "suppliers", resource: "suppliers", title: "Suppliers",
    description: "Maintain supplier contacts and the travel services they provide.",
    columns: [{ key: "id", label: "Supplier UUID" }, { key: "name", label: "Supplier" }, { key: "services", label: "Services" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "created_at", label: "Added" }],
    fields: [
      { name: "name", label: "Supplier name", required: true, maxLength: 150 },
      { name: "email", label: "Email", kind: "email", maxLength: 254 },
      { name: "phone", label: "Phone", maxLength: 30 },
      { name: "address", label: "Address", kind: "textarea", maxLength: 500 },
      { name: "services", label: "Services", kind: "textarea", required: true, maxLength: 2000 },
      { name: "notes", label: "Notes", kind: "textarea", maxLength: 2000 },
    ],
    orderBy: "created_at",
    searchColumn: "name",
  },
  payments: {
    table: "payments", resource: "payments", title: "Payments & accounts",
    description: "Record customer receipts. Online payments must be verified by a trusted payment-provider integration.",
    columns: [{ key: "booking_id", label: "Booking UUID" }, { key: "amount_minor", label: "Amount (minor units)" }, { key: "method", label: "Method" }, { key: "status", label: "Status" }, { key: "reference", label: "Reference" }, { key: "created_at", label: "Created" }],
    fields: [
      { name: "booking_id", label: "Booking UUID", kind: "uuid", required: true },
      { name: "amount_minor", label: "Amount (minor units)", kind: "number", required: true },
      { name: "currency", label: "Currency", required: true, maxLength: 3 },
      { name: "method", label: "Method", kind: "select", required: true, options: status("CASH", "BANK_TRANSFER", "CARD", "ONLINE", "OTHER") },
      { name: "status", label: "Status", kind: "select", required: true, options: status("PENDING", "VERIFIED", "FAILED", "REFUNDED") },
      { name: "reference", label: "Transaction reference", maxLength: 100 },
      { name: "verified_at", label: "Verified date", kind: "datetime-local" },
    ],
    orderBy: "created_at",
    searchColumn: "reference",
    allowDelete: false,
  },
  refunds: {
    table: "refunds", resource: "refunds", title: "Refunds",
    description: "Track refund requests, decisions, payment references, and completed refund dates.",
    columns: [{ key: "booking_id", label: "Booking UUID" }, { key: "payment_id", label: "Payment UUID" }, { key: "amount_minor", label: "Amount (minor units)" }, { key: "reason", label: "Reason" }, { key: "status", label: "Status" }, { key: "paid_at", label: "Paid" }],
    fields: [
      { name: "booking_id", label: "Booking UUID", kind: "uuid", required: true },
      { name: "payment_id", label: "Payment UUID", kind: "uuid" },
      { name: "amount_minor", label: "Amount (minor units)", kind: "number", required: true },
      { name: "currency", label: "Currency", required: true, maxLength: 3 },
      { name: "reason", label: "Reason", kind: "textarea", required: true, maxLength: 1000 },
      { name: "status", label: "Status", kind: "select", required: true, options: status("REQUESTED", "APPROVED", "PAID", "REJECTED") },
      { name: "paid_at", label: "Paid date", kind: "datetime-local" },
    ],
    orderBy: "created_at",
    searchColumn: "reason",
    allowDelete: false,
  },
  "supplier-payments": {
    table: "supplier_payments", resource: "supplier_payments", title: "Supplier payments",
    description: "Record supplier settlements and their verification status.",
    columns: [{ key: "supplier_id", label: "Supplier UUID" }, { key: "amount_minor", label: "Amount (minor units)" }, { key: "method", label: "Method" }, { key: "status", label: "Status" }, { key: "reference", label: "Reference" }, { key: "verified_at", label: "Verified" }],
    fields: [
      { name: "supplier_id", label: "Supplier UUID", kind: "uuid", required: true },
      { name: "amount_minor", label: "Amount (minor units)", kind: "number", required: true },
      { name: "currency", label: "Currency", required: true, maxLength: 3 },
      { name: "method", label: "Method", kind: "select", required: true, options: status("CASH", "BANK_TRANSFER", "CARD", "ONLINE", "OTHER") },
      { name: "reference", label: "Transaction reference", maxLength: 100 },
      { name: "status", label: "Status", kind: "select", required: true, options: status("PENDING", "VERIFIED", "FAILED", "REFUNDED") },
      { name: "verified_at", label: "Verification date", kind: "datetime-local" },
    ],
    orderBy: "created_at",
    searchColumn: "reference",
    allowDelete: false,
  },
  expenses: {
    table: "expenses", resource: "expenses", title: "Expenses",
    description: "Save agency expenses with categories, suppliers, dates, and supporting notes.",
    columns: [{ key: "spent_at", label: "Date" }, { key: "category", label: "Category" }, { key: "description", label: "Description" }, { key: "supplier_id", label: "Supplier UUID" }, { key: "amount_minor", label: "Amount (minor units)" }, { key: "currency", label: "Currency" }],
    fields: [
      { name: "category", label: "Category", required: true, maxLength: 80 },
      { name: "amount_minor", label: "Amount (minor units)", kind: "number", required: true },
      { name: "currency", label: "Currency", required: true, maxLength: 3 },
      { name: "spent_at", label: "Date", kind: "date", required: true },
      { name: "supplier_id", label: "Supplier UUID", kind: "uuid" },
      { name: "description", label: "Description", kind: "textarea", required: true, maxLength: 1000 },
    ],
    orderBy: "spent_at",
    searchColumn: "category",
    allowDelete: false,
  },
  invoices: {
    table: "invoices", resource: "invoices", title: "Invoices & receipts",
    description: "Issue and track customer invoices against saved bookings.",
    columns: [{ key: "number", label: "Invoice" }, { key: "booking_id", label: "Booking UUID" }, { key: "amount_minor", label: "Amount (minor units)" }, { key: "issued_at", label: "Issued" }, { key: "due_at", label: "Due" }, { key: "status", label: "Status" }],
    fields: [
      { name: "number", label: "Invoice number", required: true, maxLength: 40 },
      { name: "booking_id", label: "Booking UUID", kind: "uuid", required: true },
      { name: "amount_minor", label: "Amount (minor units)", kind: "number", required: true },
      { name: "currency", label: "Currency", required: true, maxLength: 3 },
      { name: "issued_at", label: "Issue date", kind: "date", required: true },
      { name: "due_at", label: "Due date", kind: "date" },
      { name: "status", label: "Status", kind: "select", required: true, options: status("DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "VOID") },
    ],
    orderBy: "issued_at",
    searchColumn: "number",
    allowDelete: false,
  },
  notifications: {
    table: "notifications", resource: "notifications", title: "Notifications",
    description: "Review and manage staff reminders and follow-up tasks.",
    columns: [{ key: "title", label: "Notification" }, { key: "type", label: "Type" }, { key: "message", label: "Message" }, { key: "due_at", label: "Due" }, { key: "read_at", label: "Read" }, { key: "created_at", label: "Created" }],
    fields: [
      { name: "recipient_id", label: "Recipient profile UUID", kind: "uuid" },
      { name: "type", label: "Type", kind: "select", required: true, options: status("MISSING_DOCUMENT", "UPCOMING_DEPARTURE", "PASSPORT_EXPIRY", "PENDING_VISA", "OUTSTANDING_BALANCE", "SYSTEM") },
      { name: "title", label: "Title", required: true, maxLength: 160 },
      { name: "message", label: "Message", kind: "textarea", required: true, maxLength: 2000 },
      { name: "entity_type", label: "Related record type", maxLength: 80 },
      { name: "entity_id", label: "Related record UUID", kind: "uuid" },
      { name: "due_at", label: "Due date", kind: "datetime-local" },
      { name: "read_at", label: "Read date", kind: "datetime-local" },
    ],
    orderBy: "created_at",
    searchColumn: "title",
  },
  settings: {
    table: "agency_settings", resource: "settings", title: "Settings",
    description: "Update agency contact information, currency, numbering, and notification preferences.",
    columns: [{ key: "agency_name", label: "Agency" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "default_currency", label: "Currency" }, { key: "booking_number_prefix", label: "Booking prefix" }, { key: "invoice_number_prefix", label: "Invoice prefix" }],
    fields: [
      { name: "agency_name", label: "Agency name", required: true, maxLength: 160 },
      { name: "email", label: "Email", kind: "email", maxLength: 254 },
      { name: "phone", label: "Phone", maxLength: 30 },
      { name: "address", label: "Address", kind: "textarea", maxLength: 500 },
      { name: "default_currency", label: "Default currency", required: true, maxLength: 3 },
      { name: "booking_number_prefix", label: "Booking number prefix", required: true, maxLength: 12 },
      { name: "invoice_number_prefix", label: "Invoice number prefix", required: true, maxLength: 12 },
    ],
    orderBy: "updated_at",
    searchColumn: "agency_name",
  },
};
