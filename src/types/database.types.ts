export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      applications: {
        Row: {
          created_at: string
          id: string
          internal_notes: string | null
          job_id: string
          profile_id: string
          status: Database["public"]["Enums"]["application_status"]
          status_log: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          internal_notes?: string | null
          job_id: string
          profile_id: string
          status?: Database["public"]["Enums"]["application_status"]
          status_log?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          internal_notes?: string | null
          job_id?: string
          profile_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          status_log?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          assessment_id: string
          completed_at: string
          id: string
          profile_id: string
          responses: Json
          score: number | null
        }
        Insert: {
          assessment_id: string
          completed_at?: string
          id?: string
          profile_id: string
          responses?: Json
          score?: number | null
        }
        Update: {
          assessment_id?: string
          completed_at?: string
          id?: string
          profile_id?: string
          responses?: Json
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          question_count: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          question_count?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          question_count?: number
        }
        Relationships: []
      }
      candidate_scores: {
        Row: {
          communication_score: number | null
          id: string
          impact_score: number | null
          leadership_score: number | null
          mindset_score: number | null
          overall_score: number | null
          profile_id: string
          role_clarity_score: number | null
          strengths_score: number | null
          updated_at: string
          values_score: number | null
        }
        Insert: {
          communication_score?: number | null
          id?: string
          impact_score?: number | null
          leadership_score?: number | null
          mindset_score?: number | null
          overall_score?: number | null
          profile_id: string
          role_clarity_score?: number | null
          strengths_score?: number | null
          updated_at?: string
          values_score?: number | null
        }
        Update: {
          communication_score?: number | null
          id?: string
          impact_score?: number | null
          leadership_score?: number | null
          mindset_score?: number | null
          overall_score?: number | null
          profile_id?: string
          role_clarity_score?: number | null
          strengths_score?: number | null
          updated_at?: string
          values_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_scores_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_products: {
        Row: {
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          is_active: boolean
          name: string
          price_cents: number | null
          stripe_price_id: string | null
          type: Database["public"]["Enums"]["coaching_product_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_cents?: number | null
          stripe_price_id?: string | null
          type: Database["public"]["Enums"]["coaching_product_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number | null
          stripe_price_id?: string | null
          type?: Database["public"]["Enums"]["coaching_product_type"]
          updated_at?: string
        }
        Relationships: []
      }
      coaching_sessions: {
        Row: {
          cal_event_id: string | null
          created_at: string
          duration_min: number | null
          enrollment_id: string
          id: string
          notes: string | null
          profile_id: string
          scheduled_for: string
          status: Database["public"]["Enums"]["coaching_session_status"]
          updated_at: string
        }
        Insert: {
          cal_event_id?: string | null
          created_at?: string
          duration_min?: number | null
          enrollment_id: string
          id?: string
          notes?: string | null
          profile_id: string
          scheduled_for: string
          status?: Database["public"]["Enums"]["coaching_session_status"]
          updated_at?: string
        }
        Update: {
          cal_event_id?: string | null
          created_at?: string
          duration_min?: number | null
          enrollment_id?: string
          id?: string
          notes?: string | null
          profile_id?: string
          scheduled_for?: string
          status?: Database["public"]["Enums"]["coaching_session_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_sessions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount_cents: number
          created_at: string
          employer_id: string
          id: string
          invoiced_at: string | null
          notes: string | null
          paid_at: string | null
          placement_id: string
          rate: number | null
          status: Database["public"]["Enums"]["commission_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          employer_id: string
          id?: string
          invoiced_at?: string | null
          notes?: string | null
          paid_at?: string | null
          placement_id: string
          rate?: number | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          employer_id?: string
          id?: string
          invoiced_at?: string | null
          notes?: string | null
          paid_at?: string | null
          placement_id?: string
          rate?: number | null
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "placements"
            referencedColumns: ["id"]
          },
        ]
      }
      employers: {
        Row: {
          commission_rate: number | null
          company_name: string
          contact_email: string
          contact_name: string
          created_at: string
          id: string
          notes: string | null
          relationship_type: Database["public"]["Enums"]["relationship_type"]
        }
        Insert: {
          commission_rate?: number | null
          company_name: string
          contact_email: string
          contact_name: string
          created_at?: string
          id?: string
          notes?: string | null
          relationship_type: Database["public"]["Enums"]["relationship_type"]
        }
        Update: {
          commission_rate?: number | null
          company_name?: string
          contact_email?: string
          contact_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          relationship_type?: Database["public"]["Enums"]["relationship_type"]
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          completed_at: string | null
          granted_at: string
          id: string
          payment_id: string | null
          product_id: string
          profile_id: string
          progress: number
          status: Database["public"]["Enums"]["enrollment_status"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          granted_at?: string
          id?: string
          payment_id?: string | null
          product_id: string
          profile_id: string
          progress?: number
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          granted_at?: string
          id?: string
          payment_id?: string | null
          product_id?: string
          profile_id?: string
          progress?: number
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "coaching_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_scores: {
        Row: {
          communication_weight: number
          id: string
          impact_weight: number
          job_id: string
          leadership_weight: number
          mindset_weight: number
          role_clarity_weight: number
          strengths_weight: number
          updated_at: string
          values_weight: number
        }
        Insert: {
          communication_weight?: number
          id?: string
          impact_weight?: number
          job_id: string
          leadership_weight?: number
          mindset_weight?: number
          role_clarity_weight?: number
          strengths_weight?: number
          updated_at?: string
          values_weight?: number
        }
        Update: {
          communication_weight?: number
          id?: string
          impact_weight?: number
          job_id?: string
          leadership_weight?: number
          mindset_weight?: number
          role_clarity_weight?: number
          strengths_weight?: number
          updated_at?: string
          values_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_scores_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company_name: string
          description: string | null
          expires_at: string | null
          id: string
          job_tier: Database["public"]["Enums"]["job_tier"]
          location: string | null
          posted_at: string
          remote_policy: Database["public"]["Enums"]["remote_policy"]
          requirements: Json | null
          salary_max: number | null
          salary_min: number | null
          status: Database["public"]["Enums"]["job_status"]
          submitted_by: string
          title: string
        }
        Insert: {
          company_name: string
          description?: string | null
          expires_at?: string | null
          id?: string
          job_tier?: Database["public"]["Enums"]["job_tier"]
          location?: string | null
          posted_at?: string
          remote_policy?: Database["public"]["Enums"]["remote_policy"]
          requirements?: Json | null
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status"]
          submitted_by: string
          title: string
        }
        Update: {
          company_name?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          job_tier?: Database["public"]["Enums"]["job_tier"]
          location?: string | null
          posted_at?: string
          remote_policy?: Database["public"]["Enums"]["remote_policy"]
          requirements?: Json | null
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status"]
          submitted_by?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_profiles: {
        Row: {
          headline: string | null
          id: string
          linkedin_url: string
          profile_id: string
          profile_score: number | null
          raw_json: Json | null
          status: Database["public"]["Enums"]["linkedin_sync_status"]
          summary: string | null
          sync_error: string | null
          sync_started_at: string | null
          synced_at: string | null
        }
        Insert: {
          headline?: string | null
          id?: string
          linkedin_url: string
          profile_id: string
          profile_score?: number | null
          raw_json?: Json | null
          status?: Database["public"]["Enums"]["linkedin_sync_status"]
          summary?: string | null
          sync_error?: string | null
          sync_started_at?: string | null
          synced_at?: string | null
        }
        Update: {
          headline?: string | null
          id?: string
          linkedin_url?: string
          profile_id?: string
          profile_score?: number | null
          raw_json?: Json | null
          status?: Database["public"]["Enums"]["linkedin_sync_status"]
          summary?: string | null
          sync_error?: string | null
          sync_started_at?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          candidate_interested: boolean | null
          created_at: string
          employer_interested: boolean | null
          id: string
          job_id: string
          match_reasons: Json | null
          match_score: number
          profile_id: string
        }
        Insert: {
          candidate_interested?: boolean | null
          created_at?: string
          employer_interested?: boolean | null
          id?: string
          job_id: string
          match_reasons?: Json | null
          match_score: number
          profile_id: string
        }
        Update: {
          candidate_interested?: boolean | null
          created_at?: string
          employer_interested?: boolean | null
          id?: string
          job_id?: string
          match_reasons?: Json | null
          match_score?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          product_type: Database["public"]["Enums"]["product_type"]
          profile_id: string
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          product_type: Database["public"]["Enums"]["product_type"]
          profile_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          profile_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      placements: {
        Row: {
          application_id: string
          created_at: string
          employer_id: string
          fee_amount: number | null
          id: string
          job_id: string
          notes: string | null
          placed_at: string
          profile_id: string
          salary: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["placement_status"]
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          employer_id: string
          fee_amount?: number | null
          id?: string
          job_id: string
          notes?: string | null
          placed_at?: string
          profile_id: string
          salary?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["placement_status"]
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          employer_id?: string
          fee_amount?: number | null
          id?: string
          job_id?: string
          notes?: string | null
          placed_at?: string
          profile_id?: string
          salary?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["placement_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "placements_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          billing_cadence: Database["public"]["Enums"]["billing_cadence"] | null
          created_at: string
          email: string
          full_name: string | null
          google_provider_id: string | null
          id: string
          linkedin_provider_id: string | null
          linkedin_url: string | null
          onboarding_completed_at: string | null
          phone: string | null
          plan: Database["public"]["Enums"]["plan"]
          stripe_customer_id: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          billing_cadence?:
            | Database["public"]["Enums"]["billing_cadence"]
            | null
          created_at?: string
          email: string
          full_name?: string | null
          google_provider_id?: string | null
          id: string
          linkedin_provider_id?: string | null
          linkedin_url?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan"]
          stripe_customer_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          billing_cadence?:
            | Database["public"]["Enums"]["billing_cadence"]
            | null
          created_at?: string
          email?: string
          full_name?: string | null
          google_provider_id?: string | null
          id?: string
          linkedin_provider_id?: string | null
          linkedin_url?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan"]
          stripe_customer_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          placement_id: string | null
          referred_email: string
          referred_profile_id: string | null
          referrer_id: string
          status: Database["public"]["Enums"]["referral_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          placement_id?: string | null
          referred_email: string
          referred_profile_id?: string | null
          referrer_id: string
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          placement_id?: string | null
          referred_email?: string
          referred_profile_id?: string | null
          referrer_id?: string
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "placements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_profile_id_fkey"
            columns: ["referred_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          ats_score: number | null
          file_name: string | null
          id: string
          parse_error: string | null
          parse_started_at: string | null
          parsed_at: string | null
          parsed_json: Json | null
          parsed_text: string | null
          profile_id: string
          raw_file_url: string
          status: Database["public"]["Enums"]["resume_status"]
          uploaded_at: string
        }
        Insert: {
          ats_score?: number | null
          file_name?: string | null
          id?: string
          parse_error?: string | null
          parse_started_at?: string | null
          parsed_at?: string | null
          parsed_json?: Json | null
          parsed_text?: string | null
          profile_id: string
          raw_file_url: string
          status?: Database["public"]["Enums"]["resume_status"]
          uploaded_at?: string
        }
        Update: {
          ats_score?: number | null
          file_name?: string | null
          id?: string
          parse_error?: string | null
          parse_started_at?: string | null
          parsed_at?: string | null
          parsed_json?: Json | null
          parsed_text?: string | null
          profile_id?: string
          raw_file_url?: string
          status?: Database["public"]["Enums"]["resume_status"]
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_paid_subscriber: { Args: never; Returns: boolean }
    }
    Enums: {
      application_status:
        | "interested"
        | "submitted"
        | "screening"
        | "interviewing"
        | "offer"
        | "placed"
        | "rejected"
        | "withdrawn"
      billing_cadence: "one_time" | "monthly" | "annual"
      coaching_product_type: "module" | "session_pack" | "one_to_one"
      coaching_session_status:
        | "scheduled"
        | "completed"
        | "no_show"
        | "canceled"
      commission_status: "pending" | "invoiced" | "paid" | "written_off"
      enrollment_status: "active" | "completed" | "expired" | "refunded"
      job_status: "active" | "filled" | "expired"
      job_tier: "tier_1" | "tier_2" | "tier_3"
      linkedin_sync_status: "idle" | "processing" | "complete" | "failed"
      payment_status: "succeeded" | "pending" | "failed"
      placement_status:
        | "pending"
        | "confirmed"
        | "guarantee_period"
        | "finalized"
        | "refunded"
      plan: "free" | "plan_1" | "plan_2" | "plan_3"
      product_type:
        | "webinar"
        | "resume_review"
        | "linkedin_review"
        | "interview_prep"
        | "subscription"
      referral_status: "invited" | "signed_up" | "placed"
      relationship_type: "direct_client" | "agency_partner"
      remote_policy: "remote" | "hybrid" | "onsite"
      resume_status: "uploading" | "processing" | "complete" | "failed"
      subscription_status: "active" | "canceled" | "expired" | "trial"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      application_status: [
        "interested",
        "submitted",
        "screening",
        "interviewing",
        "offer",
        "placed",
        "rejected",
        "withdrawn",
      ],
      billing_cadence: ["one_time", "monthly", "annual"],
      coaching_product_type: ["module", "session_pack", "one_to_one"],
      coaching_session_status: [
        "scheduled",
        "completed",
        "no_show",
        "canceled",
      ],
      commission_status: ["pending", "invoiced", "paid", "written_off"],
      enrollment_status: ["active", "completed", "expired", "refunded"],
      job_status: ["active", "filled", "expired"],
      job_tier: ["tier_1", "tier_2", "tier_3"],
      linkedin_sync_status: ["idle", "processing", "complete", "failed"],
      payment_status: ["succeeded", "pending", "failed"],
      placement_status: [
        "pending",
        "confirmed",
        "guarantee_period",
        "finalized",
        "refunded",
      ],
      plan: ["free", "plan_1", "plan_2", "plan_3"],
      product_type: [
        "webinar",
        "resume_review",
        "linkedin_review",
        "interview_prep",
        "subscription",
      ],
      referral_status: ["invited", "signed_up", "placed"],
      relationship_type: ["direct_client", "agency_partner"],
      remote_policy: ["remote", "hybrid", "onsite"],
      resume_status: ["uploading", "processing", "complete", "failed"],
      subscription_status: ["active", "canceled", "expired", "trial"],
    },
  },
} as const
