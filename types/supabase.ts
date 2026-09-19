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
      api_rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      audit_action_items: {
        Row: {
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          item_index: number
          report_id: string
          task: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          item_index: number
          report_id: string
          task: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          item_index?: number
          report_id?: string
          task?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_action_items_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "audit_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_jobs: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          document_hash: string | null
          document_name: string
          document_path: string
          error_message: string | null
          file_size: number | null
          id: string
          model_version: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          submitted_by: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          document_hash?: string | null
          document_name: string
          document_path: string
          error_message?: string | null
          file_size?: number | null
          id?: string
          model_version?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          submitted_by: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          document_hash?: string | null
          document_name?: string
          document_path?: string
          error_message?: string | null
          file_size?: number | null
          id?: string
          model_version?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: []
      }
      audit_reports: {
        Row: {
          action_items: Json
          area_rag: Json | null
          completion_tokens: number | null
          compliance_status: Database["public"]["Enums"]["compliance_status"]
          created_at: string
          findings: Json
          id: string
          input_signature: string | null
          job_id: string
          model_version: string | null
          prompt_tokens: number | null
          recommendations: Json
          regulations_cited: Json
          reused_from_report_id: string | null
          summary: string | null
        }
        Insert: {
          action_items?: Json
          area_rag?: Json | null
          completion_tokens?: number | null
          compliance_status: Database["public"]["Enums"]["compliance_status"]
          created_at?: string
          findings?: Json
          id?: string
          input_signature?: string | null
          job_id: string
          model_version?: string | null
          prompt_tokens?: number | null
          recommendations?: Json
          regulations_cited?: Json
          reused_from_report_id?: string | null
          summary?: string | null
        }
        Update: {
          action_items?: Json
          area_rag?: Json | null
          completion_tokens?: number | null
          compliance_status?: Database["public"]["Enums"]["compliance_status"]
          created_at?: string
          findings?: Json
          id?: string
          input_signature?: string | null
          job_id?: string
          model_version?: string | null
          prompt_tokens?: number | null
          recommendations?: Json
          regulations_cited?: Json
          reused_from_report_id?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "audit_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ca_combustion: {
        Row: {
          company_id: string
          created_at: string
          ef_combustion_id: string | null
          ef_snapshot: Json | null
          emission_outside_scope_co2e: number | null
          emission_scope1_co2e: number | null
          fuel_name: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          quantity: number
          reviewed_at: string | null
          reviewed_by: string | null
          scope_category: string
          status: string
          submitted_by: string
          unit: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          ef_combustion_id?: string | null
          ef_snapshot?: Json | null
          emission_outside_scope_co2e?: number | null
          emission_scope1_co2e?: number | null
          fuel_name: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          quantity: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          scope_category: string
          status?: string
          submitted_by: string
          unit: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          ef_combustion_id?: string | null
          ef_snapshot?: Json | null
          emission_outside_scope_co2e?: number | null
          emission_scope1_co2e?: number | null
          fuel_name?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          quantity?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          scope_category?: string
          status?: string
          submitted_by?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ca_combustion_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ca_combustion_ef_combustion_id_fkey"
            columns: ["ef_combustion_id"]
            isOneToOne: false
            referencedRelation: "ef_combustion"
            referencedColumns: ["id"]
          },
        ]
      }
      ca_energy: {
        Row: {
          company_id: string
          consumption: number
          created_at: string
          custom_ef_kg_co2e: number | null
          ef_snapshot: Json | null
          emission_co2e: number | null
          energy_type: string
          grid_ef_id: string | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          region_name: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          unit: string
          updated_at: string
          use_custom_ef: boolean
        }
        Insert: {
          company_id: string
          consumption: number
          created_at?: string
          custom_ef_kg_co2e?: number | null
          ef_snapshot?: Json | null
          emission_co2e?: number | null
          energy_type: string
          grid_ef_id?: string | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          region_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          unit: string
          updated_at?: string
          use_custom_ef?: boolean
        }
        Update: {
          company_id?: string
          consumption?: number
          created_at?: string
          custom_ef_kg_co2e?: number | null
          ef_snapshot?: Json | null
          emission_co2e?: number | null
          energy_type?: string
          grid_ef_id?: string | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          region_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          unit?: string
          updated_at?: string
          use_custom_ef?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ca_energy_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ca_energy_grid_ef_id_fkey"
            columns: ["grid_ef_id"]
            isOneToOne: false
            referencedRelation: "grid_emission_factors"
            referencedColumns: ["id"]
          },
        ]
      }
      ca_fugitive: {
        Row: {
          asset_category_id: string | null
          asset_category_name: string | null
          company_id: string
          created_at: string
          ef_snapshot: Json | null
          emission_co2e: number | null
          estimated_leakage_kg: number | null
          gwp_value: number
          id: string
          leakage_rate: number | null
          mass_refilled_kg: number | null
          method: string
          notes: string | null
          period_end: string
          period_start: string
          refrigerant_gwp_id: string | null
          refrigerant_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          total_capacity_kg: number | null
          updated_at: string
        }
        Insert: {
          asset_category_id?: string | null
          asset_category_name?: string | null
          company_id: string
          created_at?: string
          ef_snapshot?: Json | null
          emission_co2e?: number | null
          estimated_leakage_kg?: number | null
          gwp_value: number
          id?: string
          leakage_rate?: number | null
          mass_refilled_kg?: number | null
          method: string
          notes?: string | null
          period_end: string
          period_start: string
          refrigerant_gwp_id?: string | null
          refrigerant_name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          total_capacity_kg?: number | null
          updated_at?: string
        }
        Update: {
          asset_category_id?: string | null
          asset_category_name?: string | null
          company_id?: string
          created_at?: string
          ef_snapshot?: Json | null
          emission_co2e?: number | null
          estimated_leakage_kg?: number | null
          gwp_value?: number
          id?: string
          leakage_rate?: number | null
          mass_refilled_kg?: number | null
          method?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          refrigerant_gwp_id?: string | null
          refrigerant_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          total_capacity_kg?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ca_fugitive_asset_category_id_fkey"
            columns: ["asset_category_id"]
            isOneToOne: false
            referencedRelation: "fugitive_asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ca_fugitive_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ca_fugitive_refrigerant_gwp_id_fkey"
            columns: ["refrigerant_gwp_id"]
            isOneToOne: false
            referencedRelation: "refrigerant_gwp"
            referencedColumns: ["id"]
          },
        ]
      }
      ca_s3c1: {
        Row: {
          company_id: string
          created_at: string
          currency: string | null
          ef_average_id: string | null
          ef_snapshot: Json | null
          ef_spend_id: string | null
          emission_co2e: number | null
          id: string
          material_name: string | null
          method: string
          notes: string | null
          period_end: string
          period_start: string
          product_name: string | null
          quantity: number
          reviewed_at: string | null
          reviewed_by: string | null
          sector_name: string | null
          status: string
          submitted_by: string
          supplier_ef_kg_co2e_per_unit: number | null
          supplier_name: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          currency?: string | null
          ef_average_id?: string | null
          ef_snapshot?: Json | null
          ef_spend_id?: string | null
          emission_co2e?: number | null
          id?: string
          material_name?: string | null
          method: string
          notes?: string | null
          period_end: string
          period_start: string
          product_name?: string | null
          quantity: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector_name?: string | null
          status?: string
          submitted_by: string
          supplier_ef_kg_co2e_per_unit?: number | null
          supplier_name?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string | null
          ef_average_id?: string | null
          ef_snapshot?: Json | null
          ef_spend_id?: string | null
          emission_co2e?: number | null
          id?: string
          material_name?: string | null
          method?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          product_name?: string | null
          quantity?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector_name?: string | null
          status?: string
          submitted_by?: string
          supplier_ef_kg_co2e_per_unit?: number | null
          supplier_name?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ca_s3c1_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ca_s3c1_ef_average_id_fkey"
            columns: ["ef_average_id"]
            isOneToOne: false
            referencedRelation: "s3c1_average_factors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ca_s3c1_ef_spend_id_fkey"
            columns: ["ef_spend_id"]
            isOneToOne: false
            referencedRelation: "s3c1_spend_factors"
            referencedColumns: ["id"]
          },
        ]
      }
      ca_s3c2: {
        Row: {
          company_id: string
          created_at: string
          currency: string | null
          ef_average_id: string | null
          ef_snapshot: Json | null
          ef_spend_id: string | null
          emission_co2e: number | null
          id: string
          material_name: string | null
          method: string
          notes: string | null
          period_end: string
          period_start: string
          product_name: string | null
          quantity: number
          reviewed_at: string | null
          reviewed_by: string | null
          sector_name: string | null
          status: string
          submitted_by: string
          supplier_ef_kg_co2e_per_unit: number | null
          supplier_name: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          currency?: string | null
          ef_average_id?: string | null
          ef_snapshot?: Json | null
          ef_spend_id?: string | null
          emission_co2e?: number | null
          id?: string
          material_name?: string | null
          method: string
          notes?: string | null
          period_end: string
          period_start: string
          product_name?: string | null
          quantity: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector_name?: string | null
          status?: string
          submitted_by: string
          supplier_ef_kg_co2e_per_unit?: number | null
          supplier_name?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string | null
          ef_average_id?: string | null
          ef_snapshot?: Json | null
          ef_spend_id?: string | null
          emission_co2e?: number | null
          id?: string
          material_name?: string | null
          method?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          product_name?: string | null
          quantity?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          sector_name?: string | null
          status?: string
          submitted_by?: string
          supplier_ef_kg_co2e_per_unit?: number | null
          supplier_name?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ca_s3c2_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ca_s3c2_ef_average_id_fkey"
            columns: ["ef_average_id"]
            isOneToOne: false
            referencedRelation: "s3c2_average_factors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ca_s3c2_ef_spend_id_fkey"
            columns: ["ef_spend_id"]
            isOneToOne: false
            referencedRelation: "s3c2_spend_factors"
            referencedColumns: ["id"]
          },
        ]
      }
      ca_vehicle: {
        Row: {
          company_id: string
          created_at: string
          distance: number
          ef_snapshot: Json | null
          ef_vehicle_id: string | null
          emission_co2e: number | null
          id: string
          notes: string | null
          period_end: string
          period_start: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          unit: string
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          distance: number
          ef_snapshot?: Json | null
          ef_vehicle_id?: string | null
          emission_co2e?: number | null
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          unit: string
          updated_at?: string
          vehicle_type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          distance?: number
          ef_snapshot?: Json | null
          ef_vehicle_id?: string | null
          emission_co2e?: number | null
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          unit?: string
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ca_vehicle_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ca_vehicle_ef_vehicle_id_fkey"
            columns: ["ef_vehicle_id"]
            isOneToOne: false
            referencedRelation: "ef_vehicle"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          co2e_avoided_kg: number
          company_name: string
          ef_source: string | null
          ef_unit: string
          id: string
          issued_at: string
          manifest_id: string
          material_type: string
          pdf_url: string
          recycled_ef_kg_co2e: number | null
          recycler_name: string
          virgin_ef_kg_co2e: number | null
          weight_kg: number
        }
        Insert: {
          co2e_avoided_kg: number
          company_name: string
          ef_source?: string | null
          ef_unit?: string
          id?: string
          issued_at?: string
          manifest_id: string
          material_type: string
          pdf_url: string
          recycled_ef_kg_co2e?: number | null
          recycler_name: string
          virgin_ef_kg_co2e?: number | null
          weight_kg: number
        }
        Update: {
          co2e_avoided_kg?: number
          company_name?: string
          ef_source?: string | null
          ef_unit?: string
          id?: string
          issued_at?: string
          manifest_id?: string
          material_type?: string
          pdf_url?: string
          recycled_ef_kg_co2e?: number | null
          recycler_name?: string
          virgin_ef_kg_co2e?: number | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "certificates_manifest_id_fkey"
            columns: ["manifest_id"]
            isOneToOne: false
            referencedRelation: "manifests"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          listing_id: string
          recycler_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          listing_id: string
          recycler_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          listing_id?: string
          recycler_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "waste_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_threads_recycler_id_fkey"
            columns: ["recycler_id"]
            isOneToOne: false
            referencedRelation: "recyclers"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          address_text: string | null
          certifications: Json | null
          created_at: string
          id: string
          industry: string | null
          location: unknown
          logo_url: string | null
          name: string
          nik: string | null
          nib: string | null
          npwp: string | null
          segment: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          address?: string | null
          address_text?: string | null
          certifications?: Json | null
          created_at?: string
          id?: string
          industry?: string | null
          location?: unknown
          logo_url?: string | null
          name: string
          nib?: string | null
          nik?: string | null
          npwp?: string | null
          segment?: string | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          address?: string | null
          address_text?: string | null
          certifications?: Json | null
          created_at?: string
          id?: string
          industry?: string | null
          location?: unknown
          logo_url?: string | null
          name?: string
          nib?: string | null
          nik?: string | null
          npwp?: string | null
          segment?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: []
      }
      company_document_chunks: {
        Row: {
          chunk_index: number
          created_at: string
          embedding: unknown
          id: string
          is_metadata: boolean
          job_id: string
          page_number: number | null
          section_title: string | null
          text_chunk: string
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          created_at?: string
          embedding?: unknown
          id?: string
          is_metadata?: boolean
          job_id: string
          page_number?: number | null
          section_title?: string | null
          text_chunk: string
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          created_at?: string
          embedding?: unknown
          id?: string
          is_metadata?: boolean
          job_id?: string
          page_number?: number | null
          section_title?: string | null
          text_chunk?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_document_chunks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "audit_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ef_combustion: {
        Row: {
          created_at: string
          created_by: string | null
          ef_ch4: number | null
          ef_co2: number | null
          ef_n2o: number | null
          ef_outside_scope_co2e: number
          ef_scope1_co2e: number
          fuel_name: string
          id: string
          is_active: boolean
          is_fossil: boolean
          scope_category: string
          source: string | null
          unit: string
          updated_at: string
          year_reference: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ef_ch4?: number | null
          ef_co2?: number | null
          ef_n2o?: number | null
          ef_outside_scope_co2e?: number
          ef_scope1_co2e: number
          fuel_name: string
          id?: string
          is_active?: boolean
          is_fossil?: boolean
          scope_category: string
          source?: string | null
          unit: string
          updated_at?: string
          year_reference?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ef_ch4?: number | null
          ef_co2?: number | null
          ef_n2o?: number | null
          ef_outside_scope_co2e?: number
          ef_scope1_co2e?: number
          fuel_name?: string
          id?: string
          is_active?: boolean
          is_fossil?: boolean
          scope_category?: string
          source?: string | null
          unit?: string
          updated_at?: string
          year_reference?: number | null
        }
        Relationships: []
      }
      ef_vehicle: {
        Row: {
          created_at: string
          created_by: string | null
          ef_ch4: number | null
          ef_co2: number | null
          ef_co2e: number
          ef_n2o: number | null
          id: string
          is_active: boolean
          source: string | null
          unit: string
          updated_at: string
          vehicle_type: string
          year_reference: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ef_ch4?: number | null
          ef_co2?: number | null
          ef_co2e: number
          ef_n2o?: number | null
          id?: string
          is_active?: boolean
          source?: string | null
          unit: string
          updated_at?: string
          vehicle_type: string
          year_reference?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ef_ch4?: number | null
          ef_co2?: number | null
          ef_co2e?: number
          ef_n2o?: number | null
          id?: string
          is_active?: boolean
          source?: string | null
          unit?: string
          updated_at?: string
          vehicle_type?: string
          year_reference?: number | null
        }
        Relationships: []
      }
      fugitive_asset_categories: {
        Row: {
          annual_leakage_rate: number
          category_name: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          source: string | null
          typical_refrigerant: string | null
          updated_at: string
        }
        Insert: {
          annual_leakage_rate: number
          category_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          source?: string | null
          typical_refrigerant?: string | null
          updated_at?: string
        }
        Update: {
          annual_leakage_rate?: number
          category_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          source?: string | null
          typical_refrigerant?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      grid_emission_factors: {
        Row: {
          country: string | null
          created_at: string
          created_by: string | null
          ef_kg_co2e: number
          energy_type: string
          id: string
          is_active: boolean
          method: string | null
          region_name: string
          source: string | null
          unit: string
          updated_at: string
          year_reference: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          ef_kg_co2e: number
          energy_type: string
          id?: string
          is_active?: boolean
          method?: string | null
          region_name: string
          source?: string | null
          unit: string
          updated_at?: string
          year_reference?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          ef_kg_co2e?: number
          energy_type?: string
          id?: string
          is_active?: boolean
          method?: string | null
          region_name?: string
          source?: string | null
          unit?: string
          updated_at?: string
          year_reference?: number | null
        }
        Relationships: []
      }
      manifests: {
        Row: {
          attended_at: string | null
          bid_id: string
          company_confirmed_at: string | null
          created_at: string
          id: string
          listing_id: string
          manifest_no: string
          qr_code: string
          recycler_confirmed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attended_at?: string | null
          bid_id: string
          company_confirmed_at?: string | null
          created_at?: string
          id?: string
          listing_id: string
          manifest_no: string
          qr_code: string
          recycler_confirmed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attended_at?: string | null
          bid_id?: string
          company_confirmed_at?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          manifest_no?: string
          qr_code?: string
          recycler_confirmed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manifests_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "marketplace_bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "waste_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_bids: {
        Row: {
          created_at: string | null
          id: string
          initiator: string
          listing_id: string
          note: string | null
          pickup_address: string | null
          pickup_note: string | null
          pickup_scheduled_at: string | null
          price: number | null
          recycler_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          initiator: string
          listing_id: string
          note?: string | null
          pickup_address?: string | null
          pickup_note?: string | null
          pickup_scheduled_at?: string | null
          price?: number | null
          recycler_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          initiator?: string
          listing_id?: string
          note?: string | null
          pickup_address?: string | null
          pickup_note?: string | null
          pickup_scheduled_at?: string | null
          price?: number | null
          recycler_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_bids_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "waste_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_bids_recycler_id_fkey"
            columns: ["recycler_id"]
            isOneToOne: false
            referencedRelation: "recyclers"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          level: string
          message: string
          metadata: Json
          source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          level?: string
          message: string
          metadata?: Json
          source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          level?: string
          message?: string
          metadata?: Json
          source?: string | null
        }
        Relationships: []
      }
      pickup_records: {
        Row: {
          created_at: string
          id: string
          manifest_id: string
          net_weight_kg: number
          photo_evidence: string[]
          recorded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          manifest_id: string
          net_weight_kg: number
          photo_evidence?: string[]
          recorded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          manifest_id?: string
          net_weight_kg?: number
          photo_evidence?: string[]
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_records_manifest_id_fkey"
            columns: ["manifest_id"]
            isOneToOne: false
            referencedRelation: "manifests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          full_name: string | null
          id: string
          recycler_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          recycler_id?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          recycler_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_recycler_id_fkey"
            columns: ["recycler_id"]
            isOneToOne: false
            referencedRelation: "recyclers"
            referencedColumns: ["id"]
          },
        ]
      }
      recycler_details: {
        Row: {
          accepted_materials: string[] | null
          address_text: string | null
          capacity_per_month: number | null
          certifications: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          location: unknown
          recycler_id: string
          service_radius_km: number | null
          updated_at: string | null
        }
        Insert: {
          accepted_materials?: string[] | null
          address_text?: string | null
          capacity_per_month?: number | null
          certifications?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: unknown
          recycler_id: string
          service_radius_km?: number | null
          updated_at?: string | null
        }
        Update: {
          accepted_materials?: string[] | null
          address_text?: string | null
          capacity_per_month?: number | null
          certifications?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: unknown
          recycler_id?: string
          service_radius_km?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recycler_details_recycler_id_fkey"
            columns: ["recycler_id"]
            isOneToOne: true
            referencedRelation: "recyclers"
            referencedColumns: ["id"]
          },
        ]
      }
      recyclers: {
        Row: {
          address: string | null
          capacity_kg_per_month: number | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          nib: string | null
          nik: string | null
          npwp: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          address?: string | null
          capacity_kg_per_month?: number | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          nib?: string | null
          nik?: string | null
          npwp?: string | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          address?: string | null
          capacity_kg_per_month?: number | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          nib?: string | null
          nik?: string | null
          npwp?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: []
      }
      recycling_avoided_factors: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          material_name: string
          recycled_ef_kg_co2e: number
          source: string | null
          unit: string
          updated_at: string
          virgin_ef_kg_co2e: number
          year_reference: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          material_name: string
          recycled_ef_kg_co2e?: number
          source?: string | null
          unit?: string
          updated_at?: string
          virgin_ef_kg_co2e: number
          year_reference?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          material_name?: string
          recycled_ef_kg_co2e?: number
          source?: string | null
          unit?: string
          updated_at?: string
          virgin_ef_kg_co2e?: number
          year_reference?: number | null
        }
        Relationships: []
      }
      refrigerant_gwp: {
        Row: {
          created_at: string
          created_by: string | null
          gas_type: string
          gwp_value: number
          id: string
          is_active: boolean
          refrigerant_name: string
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          gas_type: string
          gwp_value: number
          id?: string
          is_active?: boolean
          refrigerant_name: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          gas_type?: string
          gwp_value?: number
          id?: string
          is_active?: boolean
          refrigerant_name?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      regulation_chunks: {
        Row: {
          chunk_index: number
          created_at: string
          embedding: string | null
          id: string
          regulation_id: string
          text_chunk: string
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          created_at?: string
          embedding?: string | null
          id?: string
          regulation_id: string
          text_chunk: string
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          created_at?: string
          embedding?: string | null
          id?: string
          regulation_id?: string
          text_chunk?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "regulation_chunks_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
        ]
      }
      regulations: {
        Row: {
          category: string
          chunk_count: number | null
          created_at: string
          description: string | null
          embedded_at: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_embedded: boolean
          status: Database["public"]["Enums"]["regulation_status"]
          title: string
          updated_at: string
          uploaded_by: string
          version: string
        }
        Insert: {
          category: string
          chunk_count?: number | null
          created_at?: string
          description?: string | null
          embedded_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_embedded?: boolean
          status?: Database["public"]["Enums"]["regulation_status"]
          title: string
          updated_at?: string
          uploaded_by: string
          version?: string
        }
        Update: {
          category?: string
          chunk_count?: number | null
          created_at?: string
          description?: string | null
          embedded_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_embedded?: boolean
          status?: Database["public"]["Enums"]["regulation_status"]
          title?: string
          updated_at?: string
          uploaded_by?: string
          version?: string
        }
        Relationships: []
      }
      s3c1_average_factors: {
        Row: {
          created_at: string
          created_by: string | null
          ef_kg_co2e: number
          id: string
          is_active: boolean
          material_name: string
          source: string | null
          unit: string
          updated_at: string
          year_reference: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ef_kg_co2e: number
          id?: string
          is_active?: boolean
          material_name: string
          source?: string | null
          unit: string
          updated_at?: string
          year_reference?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ef_kg_co2e?: number
          id?: string
          is_active?: boolean
          material_name?: string
          source?: string | null
          unit?: string
          updated_at?: string
          year_reference?: number | null
        }
        Relationships: []
      }
      s3c1_spend_factors: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          eeio_database: string | null
          ef_kg_co2e: number
          id: string
          is_active: boolean
          sector_name: string
          updated_at: string
          year_reference: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency: string
          eeio_database?: string | null
          ef_kg_co2e: number
          id?: string
          is_active?: boolean
          sector_name: string
          updated_at?: string
          year_reference?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          eeio_database?: string | null
          ef_kg_co2e?: number
          id?: string
          is_active?: boolean
          sector_name?: string
          updated_at?: string
          year_reference?: number | null
        }
        Relationships: []
      }
      s3c2_average_factors: {
        Row: {
          created_at: string
          created_by: string | null
          ef_kg_co2e: number
          id: string
          is_active: boolean
          material_name: string
          source: string | null
          unit: string
          updated_at: string
          year_reference: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ef_kg_co2e: number
          id?: string
          is_active?: boolean
          material_name: string
          source?: string | null
          unit: string
          updated_at?: string
          year_reference?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ef_kg_co2e?: number
          id?: string
          is_active?: boolean
          material_name?: string
          source?: string | null
          unit?: string
          updated_at?: string
          year_reference?: number | null
        }
        Relationships: []
      }
      s3c2_spend_factors: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          eeio_database: string | null
          ef_kg_co2e: number
          id: string
          is_active: boolean
          sector_name: string
          updated_at: string
          year_reference: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency: string
          eeio_database?: string | null
          ef_kg_co2e: number
          id?: string
          is_active?: boolean
          sector_name: string
          updated_at?: string
          year_reference?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          eeio_database?: string | null
          ef_kg_co2e?: number
          id?: string
          is_active?: boolean
          sector_name?: string
          updated_at?: string
          year_reference?: number | null
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          note: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          note?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          note?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
        }
        Relationships: []
      }
      waste_listings: {
        Row: {
          address_text: string | null
          category: string
          company_id: string
          contaminant_note: string | null
          created_at: string | null
          free_for_pickup: boolean | null
          id: string
          is_cleaned: boolean | null
          is_mixed: boolean | null
          is_sorted: boolean | null
          location: unknown
          material_type: string
          photos: string[] | null
          pickup_instructions: string | null
          pickup_schedule: string | null
          status: string | null
          unit: string | null
          updated_at: string | null
          weight: number
        }
        Insert: {
          address_text?: string | null
          category: string
          company_id: string
          contaminant_note?: string | null
          created_at?: string | null
          free_for_pickup?: boolean | null
          id?: string
          is_cleaned?: boolean | null
          is_mixed?: boolean | null
          is_sorted?: boolean | null
          location: unknown
          material_type: string
          photos?: string[] | null
          pickup_instructions?: string | null
          pickup_schedule?: string | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
          weight: number
        }
        Update: {
          address_text?: string | null
          category?: string
          company_id?: string
          contaminant_note?: string | null
          created_at?: string | null
          free_for_pickup?: boolean | null
          id?: string
          is_cleaned?: boolean | null
          is_mixed?: boolean | null
          is_sorted?: boolean | null
          location?: unknown
          material_type?: string
          photos?: string[] | null
          pickup_instructions?: string | null
          pickup_schedule?: string | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "waste_listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      view_company_public: {
        Row: {
          address_text: string | null
          certifications: Json | null
          created_at: string
          id: string
          industry: string | null
          location: unknown
          logo_url: string | null
          name: string
          verification_status: string
        }
        Relationships: []
      }
      view_recycler_public: {
        Row: {
          accepted_materials: string[] | null
          address: string | null
          capacity_kg_per_month: number | null
          capacity_per_month: number | null
          certifications: Json | null
          created_at: string
          details_id: string | null
          id: string
          is_active: boolean | null
          location: unknown
          logo_url: string | null
          name: string
          service_radius_km: number | null
          verification_status: string
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      admin_dashboard_snapshot: { Args: never; Returns: Json }
      admin_get_user_email: {
        Args: { p_user_id: string }
        Returns: string
      }
      company_confirm_pickup: { Args: { p_manifest_id: string }; Returns: Json }
      company_dashboard_snapshot: {
        Args: { p_company: string }
        Returns: Json
      }
      company_send_request_pickup: {
        Args: {
          p_listing_id: string
          p_note: string
          p_price: number
          p_recycler_id: string
        }
        Returns: Json
      }
      create_pickup_manifest: {
        Args: { p_listing_id: string; p_manifest_no: string; p_qr_code: string }
        Returns: Json
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_company_id: { Args: never; Returns: string }
      get_listings_within_radius:
        | {
            Args: { p_lat: number; p_lng: number; p_radius_km: number }
            Returns: {
              address_text: string
              category: string
              company_id: string
              company_name: string
              distance_km: number
              free_for_pickup: boolean
              id: string
              material_type: string
              photos: string[]
              pickup_schedule: string
              status: string
              unit: string
              weight: number
            }[]
          }
        | {
            Args: {
              p_accepted_materials?: string[]
              p_lat: number
              p_lng: number
              p_radius_km: number
            }
            Returns: {
              address_text: string
              category: string
              company_id: string
              company_name: string
              distance_km: number
              free_for_pickup: boolean
              id: string
              material_type: string
              photos: string[]
              pickup_schedule: string
              status: string
              unit: string
              weight: number
            }[]
          }
        | {
            Args: {
              p_accepted_materials?: string[]
              p_lat: number
              p_lng: number
              p_radius_km: number
              p_recycler_id?: string
            }
            Returns: {
              address_text: string
              category: string
              company_id: string
              company_name: string
              distance_km: number
              free_for_pickup: boolean
              id: string
              material_type: string
              my_bid_status: string
              photos: string[]
              pickup_schedule: string
              status: string
              unit: string
              weight: number
            }[]
          }
      get_public_manifest: { Args: { p_manifest_no: string }; Returns: Json }
      get_recyclers_within_radius: {
        Args: {
          p_lat: number
          p_lng: number
          p_material_filter?: string
          p_radius_km: number
        }
        Returns: {
          accepted_materials: string[]
          address_text: string
          capacity_per_month: number
          certifications: Json
          distance_km: number
          logo_url: string
          recycler_id: string
          recycler_name: string
          service_radius_km: number
          verification_status: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      is_admin: { Args: never; Returns: boolean }
      issue_certificate: {
        Args: { p_manifest_id: string; p_pdf_url: string }
        Returns: Json
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      manifest_parties: {
        Args: { p_manifest_id: string }
        Returns: {
          company_id: string
          company_user_id: string
          recycler_id: string
          recycler_user_id: string
        }[]
      }
      match_carbon_doc_chunks: {
        Args: { match_count?: number; query_embedding: number[] }
        Returns: {
          chunk_id: string
          doc_id: string
          doc_title: string
          doc_type: string
          similarity: number
          source_org: string
          text_chunk: string
        }[]
      }
      match_company_document_chunks: {
        Args: {
          match_count?: number
          min_similarity?: number
          p_job_id: string
          query_embedding: number[]
        }
        Returns: {
          chunk_id: string
          page_number: number | null
          section_title: string | null
          similarity: number
          text_chunk: string
        }[]
      }
      match_regulation_chunks: {
        Args: {
          match_count?: number
          min_similarity?: number
          query_embedding: number[]
        }
        Returns: {
          chunk_id: string
          regulation_id: string
          regulation_title: string
          similarity: number
          text_chunk: string
        }[]
      }
      search_company_document_chunks: {
        Args: { match_count?: number; p_job_id: string; search_query: string }
        Returns: {
          chunk_id: string
          page_number: number | null
          section_title: string | null
          similarity: number
          text_chunk: string
        }[]
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      record_ops_event: {
        Args: {
          p_kind: string
          p_level: string
          p_message: string
          p_metadata?: Json
          p_source?: string
        }
        Returns: string
      }
      record_pickup: {
        Args: {
          p_manifest_id: string
          p_net_weight_kg: number
          p_photos: string[]
        }
        Returns: Json
      }
      recycler_dashboard_snapshot: {
        Args: { p_recycler: string }
        Returns: Json
      }
      recycler_mark_attended: { Args: { p_manifest_no: string }; Returns: Json }
      recycler_respond_company_request: {
        Args: { p_action: string; p_bid_id: string }
        Returns: Json
      }
      recycling_avoided_ef: {
        Args: { p_category: string; p_material: string }
        Returns: {
          avoided_ef_kg_co2e: number
          ef_source: string
          ef_year: number
          recycled_ef_kg_co2e: number
          virgin_ef_kg_co2e: number
        }[]
      }
      redact_partner_name: { Args: { p_name: string }; Returns: string }
      reset_verification_to_pending: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: boolean
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      user_has_bid_on_listing: {
        Args: { p_listing_id: string }
        Returns: boolean
      }
      user_is_bid_owner: { Args: { p_bid_id: string }; Returns: boolean }
      user_owns_bid_listing: { Args: { p_bid_id: string }; Returns: boolean }
      user_owns_listing: { Args: { p_listing_id: string }; Returns: boolean }
    }
    Enums: {
      compliance_status:
        | "compliant"
| "partial"
        | "non_compliant"
        | "not_assessed"
      emission_scope: "scope1" | "scope2" | "scope3"
      entity_type: "company" | "recycler"
      job_status: "queued" | "processing" | "done" | "failed"
      regulation_status: "active" | "archived"
      scope3_method: "activity_based" | "spend_based"
      user_role: "company" | "recycler" | "admin"
      verification_action: "approved" | "rejected"
      verification_status: "pending" | "verified" | "rejected"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      compliance_status: [
        "compliant",
        "partial",
        "non_compliant",
        "not_assessed",
      ],
      emission_scope: ["scope1", "scope2", "scope3"],
      entity_type: ["company", "recycler"],
      job_status: ["queued", "processing", "done", "failed"],
      regulation_status: ["active", "archived"],
      scope3_method: ["activity_based", "spend_based"],
      user_role: ["company", "recycler", "admin"],
      verification_action: ["approved", "rejected"],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const
