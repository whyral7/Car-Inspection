// Hand-written to match supabase/migrations. Replace with
// `npx supabase gen types typescript --project-id <id>` output once the project is linked.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type CarStatus = "draft" | "inspected" | "published";
export type AiStatus = "pending" | "done" | "failed" | "unclear";
export type FindingType = "dent" | "scratch" | "rust" | "repaint" | "crack" | "tyre_wear" | "other";
export type Severity = "minor" | "moderate" | "major";
export type FindingSource = "ai" | "dealer";
export type ChecklistResult = "ok" | "attention" | "fail" | "na";
export type PaymentStatus = "created" | "paid" | "failed";

type Table<Row, Required extends keyof Row, Updatable extends keyof Row = keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Pick<Row, Updatable>>;
  Relationships: [];
};

export type DealerRow = {
  id: string;
  owner_name: string | null;
  business_name: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  logo_path: string | null;
  credits: number;
  created_at: string;
};

export type CarRow = {
  id: string;
  dealer_id: string;
  reg_number: string;
  make: string | null;
  model: string | null;
  variant: string | null;
  fuel: string | null;
  transmission: string | null;
  year: number | null;
  owners: number | null;
  insurance_valid_upto: string | null;
  rc_raw: Json | null;
  odometer_km: number | null;
  status: CarStatus;
  created_at: string;
};

export type InspectionPhotoRow = {
  id: string;
  car_id: string;
  angle_key: string;
  storage_path: string;
  ai_status: AiStatus;
  ai_findings: Json | null;
  created_at: string;
  /** Bumped by a trigger on every update; the analysis route uses it to spot retakes. */
  updated_at: string;
};

export type FindingRow = {
  id: string;
  car_id: string;
  photo_id: string | null;
  type: FindingType;
  location: string | null;
  severity: Severity;
  note: string | null;
  source: FindingSource;
  accepted: boolean;
  created_at: string;
};

export type ChecklistItemRow = {
  id: string;
  car_id: string;
  item_key: string;
  result: ChecklistResult;
  note: string | null;
};

export type ReportRow = {
  id: string;
  car_id: string;
  slug: string;
  score: number | null;
  hidden_sections: string[];
  pdf_path: string | null;
  published_at: string | null;
};

export type PaymentRow = {
  id: string;
  dealer_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount_paise: number;
  credits: number;
  status: PaymentStatus;
  created_at: string;
};

export type AiUsageOutcome = "ok" | "invalid_json" | "refused" | "api_error";

export type AiUsageRow = {
  id: number;
  dealer_id: string;
  car_id: string | null;
  photo_id: string | null;
  angle_key: string | null;
  model: string;
  attempt: number;
  outcome: AiUsageOutcome;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  cost_usd: number | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      // Dealers may only update their profile columns (column grants in the migration).
      dealers: Table<DealerRow, "id", "owner_name" | "business_name" | "city" | "address" | "logo_path">;
      cars: Table<CarRow, "reg_number">;
      inspection_photos: Table<InspectionPhotoRow, "car_id" | "angle_key" | "storage_path">;
      findings: Table<FindingRow, "car_id" | "type" | "severity" | "source">;
      checklist_items: Table<ChecklistItemRow, "car_id" | "item_key" | "result">;
      reports: Table<ReportRow, "car_id" | "slug">;
      payments: Table<PaymentRow, "dealer_id" | "razorpay_order_id" | "amount_paise" | "credits">;
      // Service role only (no RLS policies for dealers).
      ai_usage: Table<AiUsageRow, "dealer_id" | "model" | "attempt" | "outcome">;
    };
    Views: { [_ in never]: never };
    Functions: {
      save_photo_analysis: {
        Args: {
          p_photo_id: string;
          p_expected_updated_at: string;
          p_ai_status: AiStatus;
          p_ai_findings: Json;
          p_findings: Json;
        };
        Returns: boolean;
      };
      // Service role only (lib/report/publish.ts).
      publish_report: {
        Args: {
          p_dealer_id: string;
          p_car_id: string;
          p_slug: string;
          p_score: number;
          p_hidden_sections: string[];
        };
        Returns: { slug: string; charged: boolean; credits: number };
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
