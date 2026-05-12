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
  public: {
    Tables: {
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
      employers: {
        Row: {
          company_name: string
          contact_email: string
          contact_name: string
          created_at: string
          id: string
          notes: string | null
          relationship_type: Database["public"]["Enums"]["relationship_type"]
        }
        Insert: {
          company_name: string
          contact_email: string
          contact_name: string
          created_at?: string
          id?: string
          notes?: string | null
          relationship_type: Database["public"]["Enums"]["relationship_type"]
        }
        Update: {
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
      job_scores: {
        Row: {
          communication_weight: number
          id: string
          impact_weight: number
          job_id: string
          leadership_weight: number
          mindset_weight: number
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
          summary: string | null
          synced_at: string | null
        }
        Insert: {
          headline?: string | null
          id?: string
          linkedin_url: string
          profile_id: string
          profile_score?: number | null
          raw_json?: Json | null
          summary?: string | null
          synced_at?: string | null
        }
        Update: {
          headline?: string | null
          id?: string
          linkedin_url?: string
          profile_id?: string
          profile_score?: number | null
          raw_json?: Json | null
          summary?: string | null
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
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          google_provider_id: string | null
          id: string
          linkedin_provider_id: string | null
          linkedin_url: string | null
          onboarding_completed_at: string | null
          phone: string | null
          stripe_customer_id: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          google_provider_id?: string | null
          id: string
          linkedin_provider_id?: string | null
          linkedin_url?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          stripe_customer_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          google_provider_id?: string | null
          id?: string
          linkedin_provider_id?: string | null
          linkedin_url?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          stripe_customer_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          ats_score: number | null
          id: string
          parsed_at: string | null
          parsed_json: Json | null
          parsed_text: string | null
          profile_id: string
          raw_file_url: string
          uploaded_at: string
        }
        Insert: {
          ats_score?: number | null
          id?: string
          parsed_at?: string | null
          parsed_json?: Json | null
          parsed_text?: string | null
          profile_id: string
          raw_file_url: string
          uploaded_at?: string
        }
        Update: {
          ats_score?: number | null
          id?: string
          parsed_at?: string | null
          parsed_json?: Json | null
          parsed_text?: string | null
          profile_id?: string
          raw_file_url?: string
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
      job_status: "active" | "filled" | "expired"
      payment_status: "succeeded" | "pending" | "failed"
      product_type:
        | "webinar"
        | "resume_review"
        | "linkedin_review"
        | "interview_prep"
        | "subscription"
      relationship_type: "direct_client" | "agency_partner"
      remote_policy: "remote" | "hybrid" | "onsite"
      subscription_status: "active" | "canceled" | "expired" | "trial"
      subscription_tier: "free" | "paid_monthly" | "paid_annual"
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
  public: {
    Enums: {
      job_status: ["active", "filled", "expired"],
      payment_status: ["succeeded", "pending", "failed"],
      product_type: [
        "webinar",
        "resume_review",
        "linkedin_review",
        "interview_prep",
        "subscription",
      ],
      relationship_type: ["direct_client", "agency_partner"],
      remote_policy: ["remote", "hybrid", "onsite"],
      subscription_status: ["active", "canceled", "expired", "trial"],
      subscription_tier: ["free", "paid_monthly", "paid_annual"],
    },
  },
} as const
