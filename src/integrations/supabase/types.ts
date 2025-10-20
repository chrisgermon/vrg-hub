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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          background_color: string | null
          background_image_url: string | null
          company_name: string
          created_at: string | null
          foreground_color: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          updated_at: string | null
          use_custom_colors: boolean | null
        }
        Insert: {
          background_color?: string | null
          background_image_url?: string | null
          company_name?: string
          created_at?: string | null
          foreground_color?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          updated_at?: string | null
          use_custom_colors?: boolean | null
        }
        Update: {
          background_color?: string | null
          background_image_url?: string | null
          company_name?: string
          created_at?: string | null
          foreground_color?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          updated_at?: string | null
          use_custom_colors?: boolean | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      beta_feedback: {
        Row: {
          browser_info: string | null
          created_at: string | null
          feedback_type: string | null
          id: string
          message: string
          page_url: string | null
          subject: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          browser_info?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          message: string
          page_url?: string | null
          subject?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          browser_info?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          message?: string
          page_url?: string | null
          subject?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      canned_responses: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinics: {
        Row: {
          created_at: string
          created_by: string | null
          gateway: string | null
          id: string
          ip_range: string | null
          location_name: string
          notes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          gateway?: string | null
          id?: string
          ip_range?: string | null
          location_name: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          gateway?: string | null
          id?: string
          ip_range?: string | null
          location_name?: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      company_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          updated_at: string
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          updated_at?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          updated_at?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      department_assignments: {
        Row: {
          assignee_ids: string[]
          brand_id: string | null
          created_at: string | null
          department: string
          id: string
          updated_at: string | null
        }
        Insert: {
          assignee_ids?: string[]
          brand_id?: string | null
          created_at?: string | null
          department: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          assignee_ids?: string[]
          brand_id?: string | null
          created_at?: string | null
          department?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_assignments_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dicom_servers: {
        Row: {
          ae_title: string | null
          clinic_id: string
          created_at: string
          function: string | null
          id: string
          ip_address: string
          name: string
          notes: string | null
          port: number | null
          updated_at: string
        }
        Insert: {
          ae_title?: string | null
          clinic_id: string
          created_at?: string
          function?: string | null
          id?: string
          ip_address: string
          name: string
          notes?: string | null
          port?: number | null
          updated_at?: string
        }
        Update: {
          ae_title?: string | null
          clinic_id?: string
          created_at?: string
          function?: string | null
          id?: string
          ip_address?: string
          name?: string
          notes?: string | null
          port?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dicom_servers_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notifications: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string | null
          error: string | null
          event_type: string
          id: string
          recipient_user_id: string
          sent_at: string | null
          subject: string
          ticket_id: string | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string | null
          error?: string | null
          event_type: string
          id?: string
          recipient_user_id: string
          sent_at?: string | null
          subject: string
          ticket_id?: string | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string | null
          error?: string | null
          event_type?: string
          id?: string
          recipient_user_id?: string
          sent_at?: string | null
          subject?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_policies: {
        Row: {
          applies_to_department_id: string | null
          applies_to_request_type_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          levels: Json
          name: string
          updated_at: string | null
        }
        Insert: {
          applies_to_department_id?: string | null
          applies_to_request_type_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          levels: Json
          name: string
          updated_at?: string | null
        }
        Update: {
          applies_to_department_id?: string | null
          applies_to_request_type_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          levels?: Json
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_policies_applies_to_department_id_fkey"
            columns: ["applies_to_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_policies_applies_to_request_type_id_fkey"
            columns: ["applies_to_request_type_id"]
            isOneToOne: false
            referencedRelation: "request_types"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          feature_key: string
          id: string
          is_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          feature_key: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          feature_key?: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      form_templates: {
        Row: {
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          fields: Json
          form_type: string
          id: string
          is_active: boolean
          name: string
          settings: Json | null
          sub_department: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          fields?: Json
          form_type: string
          id?: string
          is_active?: boolean
          name: string
          settings?: Json | null
          sub_department?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          fields?: Json
          form_type?: string
          id?: string
          is_active?: boolean
          name?: string
          settings?: Json | null
          sub_department?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      hardware_catalog: {
        Row: {
          category: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          manufacturer: string | null
          model_number: string | null
          name: string
          price: number | null
          specifications: Json | null
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          manufacturer?: string | null
          model_number?: string | null
          name: string
          price?: number | null
          specifications?: Json | null
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          manufacturer?: string | null
          model_number?: string | null
          name?: string
          price?: number | null
          specifications?: Json | null
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      hardware_requests: {
        Row: {
          admin_approval_notes: string | null
          admin_approved_at: string | null
          admin_id: string | null
          brand_id: string | null
          business_justification: string
          clinic_name: string | null
          created_at: string | null
          currency: string | null
          decline_reason: string | null
          declined_at: string | null
          declined_by: string | null
          description: string | null
          expected_delivery_date: string | null
          id: string
          location_id: string | null
          manager_approval_notes: string | null
          manager_approved_at: string | null
          manager_id: string | null
          priority: string
          request_number: number | null
          status: string
          title: string
          total_amount: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_approval_notes?: string | null
          admin_approved_at?: string | null
          admin_id?: string | null
          brand_id?: string | null
          business_justification: string
          clinic_name?: string | null
          created_at?: string | null
          currency?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          description?: string | null
          expected_delivery_date?: string | null
          id?: string
          location_id?: string | null
          manager_approval_notes?: string | null
          manager_approved_at?: string | null
          manager_id?: string | null
          priority?: string
          request_number?: number | null
          status?: string
          title: string
          total_amount?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_approval_notes?: string | null
          admin_approved_at?: string | null
          admin_id?: string | null
          brand_id?: string | null
          business_justification?: string
          clinic_name?: string | null
          created_at?: string | null
          currency?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          description?: string | null
          expected_delivery_date?: string | null
          id?: string
          location_id?: string | null
          manager_approval_notes?: string | null
          manager_approved_at?: string | null
          manager_id?: string | null
          priority?: string
          request_number?: number | null
          status?: string
          title?: string
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hardware_requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hardware_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      kb_pages: {
        Row: {
          author_id: string
          category_id: string
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          slug: string | null
          subcategory_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id: string
          category_id: string
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug?: string | null
          subcategory_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string
          category_id?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug?: string | null
          subcategory_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_pages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_pages_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "kb_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_subcategories: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          brand_id: string
          city: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          sort_order: number | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          brand_id: string
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          sort_order?: number | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          brand_id?: string
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          sort_order?: number | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          attachments: Json | null
          brand_id: string | null
          completed_at: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          location_id: string | null
          metadata: Json | null
          priority: string
          request_type: string
          status: string
          target_audience: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          brand_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          metadata?: Json | null
          priority?: string
          request_type: string
          status?: string
          target_audience?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          brand_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          metadata?: Json | null
          priority?: string
          request_type?: string
          status?: string
          target_audience?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_configurations: {
        Row: {
          created_at: string | null
          custom_icon: string | null
          custom_label: string | null
          id: string
          is_visible: boolean | null
          item_key: string
          item_type: string
          role: Database["public"]["Enums"]["app_role"]
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_icon?: string | null
          custom_label?: string | null
          id?: string
          is_visible?: boolean | null
          item_key: string
          item_type?: string
          role: Database["public"]["Enums"]["app_role"]
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_icon?: string | null
          custom_label?: string | null
          id?: string
          is_visible?: boolean | null
          item_key?: string
          item_type?: string
          role?: Database["public"]["Enums"]["app_role"]
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      modalities: {
        Row: {
          ae_title: string | null
          brand_id: string | null
          clinic_id: string
          created_at: string
          id: string
          ip_address: string
          location_id: string | null
          modality_type: string | null
          name: string
          notes: string | null
          port: number | null
          updated_at: string
          worklist_ae_title: string | null
          worklist_ip_address: string | null
          worklist_port: number | null
        }
        Insert: {
          ae_title?: string | null
          brand_id?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          ip_address: string
          location_id?: string | null
          modality_type?: string | null
          name: string
          notes?: string | null
          port?: number | null
          updated_at?: string
          worklist_ae_title?: string | null
          worklist_ip_address?: string | null
          worklist_port?: number | null
        }
        Update: {
          ae_title?: string | null
          brand_id?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          ip_address?: string
          location_id?: string | null
          modality_type?: string | null
          name?: string
          notes?: string | null
          port?: number | null
          updated_at?: string
          worklist_ae_title?: string | null
          worklist_ip_address?: string | null
          worklist_port?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modalities_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modalities_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modalities_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          slug: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      newsletter_assignments: {
        Row: {
          assigned_at: string
          contributor_id: string
          created_at: string
          cycle_id: string
          department: string
          id: string
          status: string
          submitted_at: string | null
          topic: string | null
          updated_at: string
          word_count: number | null
        }
        Insert: {
          assigned_at?: string
          contributor_id: string
          created_at?: string
          cycle_id: string
          department: string
          id?: string
          status?: string
          submitted_at?: string | null
          topic?: string | null
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          assigned_at?: string
          contributor_id?: string
          created_at?: string
          cycle_id?: string
          department?: string
          id?: string
          status?: string
          submitted_at?: string | null
          topic?: string | null
          updated_at?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_assignments_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "newsletter_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_cycles: {
        Row: {
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          month: number
          name: string
          notes: string | null
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          month: number
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          month?: number
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      newsletter_submissions: {
        Row: {
          assignment_id: string
          attachments: Json | null
          content: string
          contributor_id: string
          created_at: string
          cycle_id: string
          department: string
          id: string
          images: Json | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          attachments?: Json | null
          content: string
          contributor_id: string
          created_at?: string
          cycle_id: string
          department: string
          id?: string
          images?: Json | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          attachments?: Json | null
          content?: string
          contributor_id?: string
          created_at?: string
          cycle_id?: string
          department?: string
          id?: string
          images?: Json | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "newsletter_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_submissions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "newsletter_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_templates: {
        Row: {
          body_template: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          subject_template: string | null
          updated_at: string
        }
        Insert: {
          body_template: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          subject_template?: string | null
          updated_at?: string
        }
        Update: {
          body_template?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          subject_template?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          email_enabled: boolean | null
          event_type: string
          id: string
          in_app_enabled: boolean | null
          sms_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean | null
          event_type: string
          id?: string
          in_app_enabled?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean | null
          event_type?: string
          id?: string
          in_app_enabled?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifyre_fax_campaigns: {
        Row: {
          campaign_id: string
          campaign_name: string | null
          contact_group_id: string | null
          contact_group_name: string | null
          created_at: string
          delivered_count: number | null
          document_path: string | null
          failed_count: number | null
          id: string
          metadata: Json | null
          pending_count: number | null
          sent_at: string | null
          total_recipients: number | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          campaign_name?: string | null
          contact_group_id?: string | null
          contact_group_name?: string | null
          created_at?: string
          delivered_count?: number | null
          document_path?: string | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          pending_count?: number | null
          sent_at?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          campaign_name?: string | null
          contact_group_id?: string | null
          contact_group_name?: string | null
          created_at?: string
          delivered_count?: number | null
          document_path?: string | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          pending_count?: number | null
          sent_at?: string | null
          total_recipients?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      notifyre_fax_logs: {
        Row: {
          campaign_id: string | null
          cost_cents: number | null
          created_at: string
          delivered_at: string | null
          document_id: string | null
          document_path: string | null
          document_url: string | null
          duration_seconds: number | null
          error_message: string | null
          failed_at: string | null
          id: string
          notifyre_fax_id: string | null
          pages_sent: number | null
          recipient_name: string | null
          recipient_number: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          cost_cents?: number | null
          created_at?: string
          delivered_at?: string | null
          document_id?: string | null
          document_path?: string | null
          document_url?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          notifyre_fax_id?: string | null
          pages_sent?: number | null
          recipient_name?: string | null
          recipient_number: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          cost_cents?: number | null
          created_at?: string
          delivered_at?: string | null
          document_id?: string | null
          document_path?: string | null
          document_url?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          notifyre_fax_id?: string | null
          pages_sent?: number | null
          recipient_name?: string | null
          recipient_number?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifyre_fax_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "notifyre_fax_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      notifyre_sync_history: {
        Row: {
          campaigns_synced: number
          created_at: string
          error_message: string | null
          faxes_synced: number
          from_date: string
          id: string
          status: string
          synced_by: string | null
          to_date: string
        }
        Insert: {
          campaigns_synced?: number
          created_at?: string
          error_message?: string | null
          faxes_synced?: number
          from_date: string
          id?: string
          status?: string
          synced_by?: string | null
          to_date: string
        }
        Update: {
          campaigns_synced?: number
          created_at?: string
          error_message?: string | null
          faxes_synced?: number
          from_date?: string
          id?: string
          status?: string
          synced_by?: string | null
          to_date?: string
        }
        Relationships: []
      }
      office365_connections: {
        Row: {
          access_token: string
          company_id: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          company_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          company_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      print_brands: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          brand_id: string | null
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          imported_from_o365: boolean | null
          is_active: boolean | null
          last_login: string | null
          location: string | null
          location_id: string | null
          phone: string | null
          sms_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          brand_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          imported_from_o365?: boolean | null
          is_active?: boolean | null
          last_login?: string | null
          location?: string | null
          location_id?: string | null
          phone?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          brand_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          imported_from_o365?: boolean | null
          is_active?: boolean | null
          last_login?: string | null
          location?: string | null
          location_id?: string | null
          phone?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_audit_log: {
        Row: {
          action: string
          after_state: Json | null
          before_state: Json | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rbac_permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          resource?: string
        }
        Relationships: []
      }
      rbac_role_permissions: {
        Row: {
          created_at: string | null
          effect: string
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          effect: string
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          effect?: string
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "rbac_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system_role: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rbac_user_permissions: {
        Row: {
          created_at: string | null
          effect: string
          id: string
          permission_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          effect: string
          id?: string
          permission_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          effect?: string
          id?: string
          permission_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "rbac_permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_user_roles: {
        Row: {
          created_at: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      reminder_notifications: {
        Row: {
          days_before: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          notification_type: string
          recipient: string | null
          reminder_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          days_before?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notification_type: string
          recipient?: string | null
          reminder_id: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          days_before?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string
          recipient?: string | null
          reminder_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_notifications_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          advance_notice_days: number[] | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          metadata: Json | null
          notification_channels: Json
          phone_number: string | null
          recurrence_interval: number | null
          recurrence_pattern: string | null
          reminder_date: string
          reminder_type: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          advance_notice_days?: number[] | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          metadata?: Json | null
          notification_channels?: Json
          phone_number?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          reminder_date: string
          reminder_type: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          advance_notice_days?: number[] | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          metadata?: Json | null
          notification_channels?: Json
          phone_number?: string | null
          recurrence_interval?: number | null
          recurrence_pattern?: string | null
          reminder_date?: string
          reminder_type?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      request_attachments: {
        Row: {
          attachment_type: string
          content_type: string | null
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          request_id: string
          uploaded_by: string
        }
        Insert: {
          attachment_type: string
          content_type?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          request_id: string
          uploaded_by: string
        }
        Update: {
          attachment_type?: string
          content_type?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          request_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "hardware_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          model_number: string | null
          name: string
          quantity: number
          request_id: string
          specifications: Json | null
          total_price: number | null
          unit_price: number | null
          vendor: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          model_number?: string | null
          name: string
          quantity?: number
          request_id: string
          specifications?: Json | null
          total_price?: number | null
          unit_price?: number | null
          vendor?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          model_number?: string | null
          name?: string
          quantity?: number
          request_id?: string
          specifications?: Json | null
          total_price?: number | null
          unit_price?: number | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "hardware_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_notification_assignments: {
        Row: {
          assignee_ids: string[]
          created_at: string
          department: string | null
          id: string
          notification_level: string
          request_type: string
          updated_at: string
        }
        Insert: {
          assignee_ids?: string[]
          created_at?: string
          department?: string | null
          id?: string
          notification_level?: string
          request_type: string
          updated_at?: string
        }
        Update: {
          assignee_ids?: string[]
          created_at?: string
          department?: string | null
          id?: string
          notification_level?: string
          request_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      request_status_history: {
        Row: {
          changed_by: string
          created_at: string | null
          id: string
          notes: string | null
          request_id: string
          status: string
        }
        Insert: {
          changed_by: string
          created_at?: string | null
          id?: string
          notes?: string | null
          request_id: string
          status: string
        }
        Update: {
          changed_by?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "hardware_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_types: {
        Row: {
          created_at: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_types_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_rules: {
        Row: {
          created_at: string | null
          default_assignee_user_id: string | null
          id: string
          is_active: boolean | null
          json_rules: Json | null
          priority: number | null
          request_type_id: string
          skills: string[] | null
          strategy: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_assignee_user_id?: string | null
          id?: string
          is_active?: boolean | null
          json_rules?: Json | null
          priority?: number | null
          request_type_id: string
          skills?: string[] | null
          strategy: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_assignee_user_id?: string | null
          id?: string
          is_active?: boolean | null
          json_rules?: Json | null
          priority?: number | null
          request_type_id?: string
          skills?: string[] | null
          strategy?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routing_rules_request_type_id_fkey"
            columns: ["request_type_id"]
            isOneToOne: false
            referencedRelation: "request_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_rules_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string | null
          id: string
          name: string
          query: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          query: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          query?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shareable_modality_links: {
        Row: {
          access_count: number | null
          created_at: string | null
          created_by: string | null
          encrypted_token: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          modality_id: string
        }
        Insert: {
          access_count?: number | null
          created_at?: string | null
          created_by?: string | null
          encrypted_token: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          modality_id: string
        }
        Update: {
          access_count?: number | null
          created_at?: string | null
          created_by?: string | null
          encrypted_token?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          modality_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shareable_modality_links_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
        ]
      }
      sharepoint_cache: {
        Row: {
          cached_at: string
          child_count: number | null
          company_id: string
          created_at: string
          created_by: string | null
          created_datetime: string | null
          download_url: string | null
          expires_at: string
          file_type: string | null
          id: string
          item_id: string
          item_type: string
          last_modified_by: string | null
          last_modified_datetime: string | null
          metadata: Json | null
          name: string
          parent_path: string
          permissions: Json | null
          size: number | null
          updated_at: string
          web_url: string | null
        }
        Insert: {
          cached_at?: string
          child_count?: number | null
          company_id: string
          created_at?: string
          created_by?: string | null
          created_datetime?: string | null
          download_url?: string | null
          expires_at?: string
          file_type?: string | null
          id?: string
          item_id: string
          item_type: string
          last_modified_by?: string | null
          last_modified_datetime?: string | null
          metadata?: Json | null
          name: string
          parent_path: string
          permissions?: Json | null
          size?: number | null
          updated_at?: string
          web_url?: string | null
        }
        Update: {
          cached_at?: string
          child_count?: number | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          created_datetime?: string | null
          download_url?: string | null
          expires_at?: string
          file_type?: string | null
          id?: string
          item_id?: string
          item_type?: string
          last_modified_by?: string | null
          last_modified_datetime?: string | null
          metadata?: Json | null
          name?: string
          parent_path?: string
          permissions?: Json | null
          size?: number | null
          updated_at?: string
          web_url?: string | null
        }
        Relationships: []
      }
      sharepoint_configurations: {
        Row: {
          company_id: string
          configured_by: string | null
          created_at: string | null
          folder_path: string | null
          id: string
          is_active: boolean | null
          site_id: string | null
          site_name: string | null
          site_url: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          configured_by?: string | null
          created_at?: string | null
          folder_path?: string | null
          id?: string
          is_active?: boolean | null
          site_id?: string | null
          site_name?: string | null
          site_url?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          configured_by?: string | null
          created_at?: string | null
          folder_path?: string | null
          id?: string
          is_active?: boolean | null
          site_id?: string | null
          site_name?: string | null
          site_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      synced_office365_mailboxes: {
        Row: {
          company_id: string
          created_at: string | null
          email_address: string
          id: string
          mailbox_name: string
          mailbox_type: string | null
          members: Json | null
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email_address: string
          id?: string
          mailbox_name: string
          mailbox_type?: string | null
          members?: Json | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email_address?: string
          id?: string
          mailbox_name?: string
          mailbox_type?: string | null
          members?: Json | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      synced_office365_users: {
        Row: {
          assigned_licenses: Json | null
          business_phones: Json | null
          company_id: string
          created_at: string | null
          department: string | null
          display_name: string | null
          id: string
          is_active: boolean | null
          job_title: string | null
          mail: string | null
          member_of: Json | null
          mobile_phone: string | null
          office_location: string | null
          synced_at: string | null
          updated_at: string | null
          user_principal_name: string
        }
        Insert: {
          assigned_licenses?: Json | null
          business_phones?: Json | null
          company_id: string
          created_at?: string | null
          department?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          mail?: string | null
          member_of?: Json | null
          mobile_phone?: string | null
          office_location?: string | null
          synced_at?: string | null
          updated_at?: string | null
          user_principal_name: string
        }
        Update: {
          assigned_licenses?: Json | null
          business_phones?: Json | null
          company_id?: string
          created_at?: string | null
          department?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          mail?: string | null
          member_of?: Json | null
          mobile_phone?: string | null
          office_location?: string | null
          synced_at?: string | null
          updated_at?: string | null
          user_principal_name?: string
        }
        Relationships: []
      }
      system_banners: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          message: string
          show_on_pages: string[] | null
          start_date: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          message: string
          show_on_pages?: string[] | null
          start_date?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          message?: string
          show_on_pages?: string[] | null
          start_date?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_statuses: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_critical: boolean | null
          message: string | null
          sort_order: number | null
          status: string
          system_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_critical?: boolean | null
          message?: string | null
          sort_order?: number | null
          status: string
          system_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_critical?: boolean | null
          message?: string | null
          sort_order?: number | null
          status?: string
          system_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          out_of_office_from: string | null
          out_of_office_to: string | null
          role_in_team: string | null
          skills: string[] | null
          team_id: string
          timezone: string | null
          updated_at: string | null
          user_id: string
          workload_capacity: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          out_of_office_from?: string | null
          out_of_office_to?: string | null
          role_in_team?: string | null
          skills?: string[] | null
          team_id: string
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          workload_capacity?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          out_of_office_from?: string | null
          out_of_office_to?: string | null
          role_in_team?: string | null
          skills?: string[] | null
          team_id?: string
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          workload_capacity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          author_user_id: string
          body: string
          created_at: string | null
          id: string
          ticket_id: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string | null
          id?: string
          ticket_id: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string | null
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_events: {
        Row: {
          actor_user_id: string | null
          created_at: string | null
          data: Json | null
          id: string
          ticket_id: string
          type: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          ticket_id: string
          type: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          ticket_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_watchers: {
        Row: {
          added_by_user_id: string | null
          created_at: string | null
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          added_by_user_id?: string | null
          created_at?: string | null
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          added_by_user_id?: string | null
          created_at?: string | null
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_watchers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_team_id: string | null
          assigned_user_id: string | null
          created_at: string | null
          description: string | null
          due_at: string | null
          id: string
          metadata: Json | null
          priority: string | null
          reference_code: string
          request_type_id: string
          requester_user_id: string | null
          status: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          assigned_team_id?: string | null
          assigned_user_id?: string | null
          created_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          reference_code: string
          request_type_id: string
          requester_user_id?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          assigned_team_id?: string | null
          assigned_user_id?: string | null
          created_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          reference_code?: string
          request_type_id?: string
          requester_user_id?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_request_type_id_fkey"
            columns: ["request_type_id"]
            isOneToOne: false
            referencedRelation: "request_types"
            referencedColumns: ["id"]
          },
        ]
      }
      toner_requests: {
        Row: {
          assigned_to: string | null
          brand_id: string | null
          colors_required: string[] | null
          completed_at: string | null
          created_at: string
          description: string | null
          eta_delivery: string | null
          id: string
          location_id: string | null
          predicted_toner_models: string | null
          printer_model: string | null
          priority: string
          quantity: number
          site: string | null
          status: string
          title: string
          toner_type: string | null
          tracking_link: string | null
          updated_at: string
          urgency: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          brand_id?: string | null
          colors_required?: string[] | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          eta_delivery?: string | null
          id?: string
          location_id?: string | null
          predicted_toner_models?: string | null
          printer_model?: string | null
          priority?: string
          quantity?: number
          site?: string | null
          status?: string
          title: string
          toner_type?: string | null
          tracking_link?: string | null
          updated_at?: string
          urgency?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          brand_id?: string | null
          colors_required?: string[] | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          eta_delivery?: string | null
          id?: string
          location_id?: string | null
          predicted_toner_models?: string | null
          printer_model?: string | null
          priority?: string
          quantity?: number
          site?: string | null
          status?: string
          title?: string
          toner_type?: string | null
          tracking_link?: string | null
          updated_at?: string
          urgency?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "toner_requests_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toner_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_prefs: {
        Row: {
          channel: string | null
          created_at: string | null
          digest: string | null
          events: Json | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          digest?: string | null
          events?: Json | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          digest?: string | null
          events?: Json | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clean_expired_sharepoint_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      has_rbac_role: {
        Args: { _role_name: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "requester"
        | "manager"
        | "marketing_manager"
        | "tenant_admin"
        | "super_admin"
        | "marketing"
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
      app_role: [
        "requester",
        "manager",
        "marketing_manager",
        "tenant_admin",
        "super_admin",
        "marketing",
      ],
    },
  },
} as const
