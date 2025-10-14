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
      activity_feed: {
        Row: {
          activity_type: string
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      approval_steps: {
        Row: {
          approved_at: string | null
          approver_id: string
          approver_role: string | null
          created_at: string
          id: string
          notes: string | null
          rejected_at: string | null
          status: string
          step_number: number
          updated_at: string
          workflow_instance_id: string
        }
        Insert: {
          approved_at?: string | null
          approver_id: string
          approver_role?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          rejected_at?: string | null
          status?: string
          step_number: number
          updated_at?: string
          workflow_instance_id: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string
          approver_role?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          rejected_at?: string | null
          status?: string
          step_number?: number
          updated_at?: string
          workflow_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_steps_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "approval_workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflow_instances: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: number
          id: string
          reference_id: string
          reference_type: string
          status: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          reference_id: string
          reference_type: string
          status?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          reference_id?: string
          reference_type?: string
          status?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflow_instances_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflows: {
        Row: {
          company_id: string
          conditions: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          steps: Json
          updated_at: string
          workflow_type: string
        }
        Insert: {
          company_id: string
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          steps?: Json
          updated_at?: string
          workflow_type: string
        }
        Update: {
          company_id?: string
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          steps?: Json
          updated_at?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      beta_feedback: {
        Row: {
          browser_info: string | null
          created_at: string
          feedback_type: string
          id: string
          message: string
          page_url: string | null
          subject: string
          user_email: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          browser_info?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          message: string
          page_url?: string | null
          subject: string
          user_email: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          browser_info?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          message?: string
          page_url?: string | null
          subject?: string
          user_email?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      canned_responses: {
        Row: {
          category: string | null
          company_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "canned_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_item_companies: {
        Row: {
          catalog_item_id: string
          company_id: string
          created_at: string
          id: string
        }
        Insert: {
          catalog_item_id: string
          company_id: string
          created_at?: string
          id?: string
        }
        Update: {
          catalog_item_id?: string
          company_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_item_companies_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "hardware_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_item_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_private: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_network_configs: {
        Row: {
          company_id: string
          created_at: string
          gateway: string | null
          id: string
          ip_range: string | null
          location_name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          gateway?: string | null
          id?: string
          ip_range?: string | null
          location_name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          gateway?: string | null
          id?: string
          ip_range?: string | null
          location_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_network_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_shared_links: {
        Row: {
          clinic_network_config_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          share_token: string
        }
        Insert: {
          clinic_network_config_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          share_token?: string
        }
        Update: {
          clinic_network_config_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_shared_links_clinic_network_config_id_fkey"
            columns: ["clinic_network_config_id"]
            isOneToOne: false
            referencedRelation: "clinic_network_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          accent_color: string | null
          active: boolean
          approval_emails: string[] | null
          background_color: string | null
          background_image_url: string | null
          billing_contact_email: string | null
          border_color: string | null
          card_color: string | null
          card_foreground_color: string | null
          created_at: string
          foreground_color: string | null
          id: string
          logo_url: string | null
          muted_color: string | null
          muted_foreground_color: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          slug: string
          subdomain: string | null
          updated_at: string
          use_custom_colors: boolean | null
        }
        Insert: {
          accent_color?: string | null
          active?: boolean
          approval_emails?: string[] | null
          background_color?: string | null
          background_image_url?: string | null
          billing_contact_email?: string | null
          border_color?: string | null
          card_color?: string | null
          card_foreground_color?: string | null
          created_at?: string
          foreground_color?: string | null
          id?: string
          logo_url?: string | null
          muted_color?: string | null
          muted_foreground_color?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          subdomain?: string | null
          updated_at?: string
          use_custom_colors?: boolean | null
        }
        Update: {
          accent_color?: string | null
          active?: boolean
          approval_emails?: string[] | null
          background_color?: string | null
          background_image_url?: string | null
          billing_contact_email?: string | null
          border_color?: string | null
          card_color?: string | null
          card_foreground_color?: string | null
          created_at?: string
          foreground_color?: string | null
          id?: string
          logo_url?: string | null
          muted_color?: string | null
          muted_foreground_color?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          subdomain?: string | null
          updated_at?: string
          use_custom_colors?: boolean | null
        }
        Relationships: []
      }
      company_applications: {
        Row: {
          application_id: string
          company_id: string
          created_at: string
          id: string
        }
        Insert: {
          application_id: string
          company_id: string
          created_at?: string
          id?: string
        }
        Update: {
          application_id?: string
          company_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_applications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_domains: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          domain: string
          id: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          domain: string
          id?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          domain?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_domains_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_features: {
        Row: {
          company_id: string
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_features_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_home_pages: {
        Row: {
          category_buttons: Json
          company_id: string
          created_at: string
          custom_sections: Json | null
          hero_background: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          layout_config: Json
          quick_access_tiles: Json
          quick_actions: Json | null
          quick_links_sections: Json
          updated_at: string
        }
        Insert: {
          category_buttons?: Json
          company_id: string
          created_at?: string
          custom_sections?: Json | null
          hero_background?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          layout_config?: Json
          quick_access_tiles?: Json
          quick_actions?: Json | null
          quick_links_sections?: Json
          updated_at?: string
        }
        Update: {
          category_buttons?: Json
          company_id?: string
          created_at?: string
          custom_sections?: Json | null
          hero_background?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          layout_config?: Json
          quick_access_tiles?: Json
          quick_actions?: Json | null
          quick_links_sections?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_home_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_locations: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_memberships: {
        Row: {
          activated_at: string | null
          company_id: string
          created_at: string
          deactivated_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_primary: boolean
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          company_id: string
          created_at?: string
          deactivated_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_primary?: boolean
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          company_id?: string
          created_at?: string
          deactivated_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_primary?: boolean
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_notification_settings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          recipient_emails: string[]
          request_type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          recipient_emails?: string[]
          request_type: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          recipient_emails?: string[]
          request_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_notification_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_request_counters: {
        Row: {
          company_id: string
          counter: number
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          counter?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          counter?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_request_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_request_prefixes: {
        Row: {
          company_id: string
          created_at: string
          id: string
          prefix: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          prefix: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          prefix?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_request_prefixes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      department_assignment_rules: {
        Row: {
          assigned_role: string | null
          assigned_user_id: string | null
          company_id: string
          created_at: string | null
          department: string
          id: string
          is_active: boolean | null
          priority: number | null
          sub_department: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_role?: string | null
          assigned_user_id?: string | null
          company_id: string
          created_at?: string | null
          department: string
          id?: string
          is_active?: boolean | null
          priority?: number | null
          sub_department?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_role?: string | null
          assigned_user_id?: string | null
          company_id?: string
          created_at?: string | null
          department?: string
          id?: string
          is_active?: boolean | null
          priority?: number | null
          sub_department?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_assignment_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      department_assignments: {
        Row: {
          allow_multiple_clinics: boolean
          assignee_ids: string[]
          created_at: string
          department: string
          id: string
          updated_at: string
        }
        Insert: {
          allow_multiple_clinics?: boolean
          assignee_ids?: string[]
          created_at?: string
          department: string
          id?: string
          updated_at?: string
        }
        Update: {
          allow_multiple_clinics?: boolean
          assignee_ids?: string[]
          created_at?: string
          department?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      department_requests: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          company_id: string
          created_at: string
          department: string
          description: string | null
          from_email: boolean | null
          id: string
          location_id: string | null
          priority: string
          request_number: string | null
          status: string
          sub_department: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          company_id: string
          created_at?: string
          department: string
          description?: string | null
          from_email?: boolean | null
          id?: string
          location_id?: string | null
          priority?: string
          request_number?: string | null
          status?: string
          sub_department: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          company_id?: string
          created_at?: string
          department?: string
          description?: string | null
          from_email?: boolean | null
          id?: string
          location_id?: string | null
          priority?: string
          request_number?: string | null
          status?: string
          sub_department?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "company_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      department_templates: {
        Row: {
          created_at: string
          department: string
          fields: Json
          id: string
          is_active: boolean
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          department: string
          fields: Json
          id?: string
          is_active?: boolean
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          department?: string
          fields?: Json
          id?: string
          is_active?: boolean
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      department_user_assignments: {
        Row: {
          can_approve: boolean | null
          can_change_status: boolean | null
          can_respond: boolean | null
          can_view: boolean | null
          company_id: string
          created_at: string
          created_by: string | null
          department: string
          id: string
          is_active: boolean | null
          receive_notifications: boolean | null
          request_type: string | null
          sub_department: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_approve?: boolean | null
          can_change_status?: boolean | null
          can_respond?: boolean | null
          can_view?: boolean | null
          company_id: string
          created_at?: string
          created_by?: string | null
          department: string
          id?: string
          is_active?: boolean | null
          receive_notifications?: boolean | null
          request_type?: string | null
          sub_department?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_approve?: boolean | null
          can_change_status?: boolean | null
          can_respond?: boolean | null
          can_view?: boolean | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          department?: string
          id?: string
          is_active?: boolean | null
          receive_notifications?: boolean | null
          request_type?: string | null
          sub_department?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_user_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dicom_modalities: {
        Row: {
          ae_title: string | null
          clinic_network_config_id: string
          created_at: string
          id: string
          ip_address: string
          name: string
          port: number | null
          worklist_ae_title: string | null
          worklist_ip_address: string | null
          worklist_port: number | null
        }
        Insert: {
          ae_title?: string | null
          clinic_network_config_id: string
          created_at?: string
          id?: string
          ip_address: string
          name: string
          port?: number | null
          worklist_ae_title?: string | null
          worklist_ip_address?: string | null
          worklist_port?: number | null
        }
        Update: {
          ae_title?: string | null
          clinic_network_config_id?: string
          created_at?: string
          id?: string
          ip_address?: string
          name?: string
          port?: number | null
          worklist_ae_title?: string | null
          worklist_ip_address?: string | null
          worklist_port?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dicom_modalities_clinic_network_config_id_fkey"
            columns: ["clinic_network_config_id"]
            isOneToOne: false
            referencedRelation: "clinic_network_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      dicom_servers: {
        Row: {
          ae_title: string | null
          clinic_network_config_id: string
          created_at: string
          function: string | null
          id: string
          ip_address: string
          name: string
          port: number | null
        }
        Insert: {
          ae_title?: string | null
          clinic_network_config_id: string
          created_at?: string
          function?: string | null
          id?: string
          ip_address: string
          name: string
          port?: number | null
        }
        Update: {
          ae_title?: string | null
          clinic_network_config_id?: string
          created_at?: string
          function?: string | null
          id?: string
          ip_address?: string
          name?: string
          port?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dicom_servers_clinic_network_config_id_fkey"
            columns: ["clinic_network_config_id"]
            isOneToOne: false
            referencedRelation: "clinic_network_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          department_request_id: string | null
          email_type: string
          error_message: string | null
          id: string
          marketing_request_id: string | null
          metadata: Json | null
          recipient_email: string
          request_id: string | null
          request_type: string | null
          sent_at: string
          status: string
          subject: string
          user_account_request_id: string | null
        }
        Insert: {
          created_at?: string
          department_request_id?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          marketing_request_id?: string | null
          metadata?: Json | null
          recipient_email: string
          request_id?: string | null
          request_type?: string | null
          sent_at?: string
          status?: string
          subject: string
          user_account_request_id?: string | null
        }
        Update: {
          created_at?: string
          department_request_id?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          marketing_request_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          request_id?: string | null
          request_type?: string | null
          sent_at?: string
          status?: string
          subject?: string
          user_account_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_department_request_id_fkey"
            columns: ["department_request_id"]
            isOneToOne: false
            referencedRelation: "department_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_marketing_request_id_fkey"
            columns: ["marketing_request_id"]
            isOneToOne: false
            referencedRelation: "marketing_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "hardware_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_user_account_request_id_fkey"
            columns: ["user_account_request_id"]
            isOneToOne: false
            referencedRelation: "user_account_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          feature_group: string
          feature_key: string
          id: string
          is_menu_item: boolean
          menu_order: number | null
          scope: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          feature_group?: string
          feature_key: string
          id?: string
          is_menu_item?: boolean
          menu_order?: number | null
          scope?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          feature_group?: string
          feature_key?: string
          id?: string
          is_menu_item?: boolean
          menu_order?: number | null
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      form_templates: {
        Row: {
          company_id: string
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
          company_id: string
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
          company_id?: string
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
        Relationships: [
          {
            foreignKeyName: "form_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      halo_integration_settings: {
        Row: {
          auto_create_users: boolean | null
          company_id: string
          created_at: string
          halo_client_id: number
          halo_client_name: string
          halo_default_user_id: number | null
          halo_default_user_name: string | null
          halo_site_id: number | null
          halo_site_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          auto_create_users?: boolean | null
          company_id: string
          created_at?: string
          halo_client_id: number
          halo_client_name: string
          halo_default_user_id?: number | null
          halo_default_user_name?: string | null
          halo_site_id?: number | null
          halo_site_name?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          auto_create_users?: boolean | null
          company_id?: string
          created_at?: string
          halo_client_id?: number
          halo_client_name?: string
          halo_default_user_id?: number | null
          halo_default_user_name?: string | null
          halo_site_id?: number | null
          halo_site_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "halo_integration_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hardware_catalog: {
        Row: {
          category: string | null
          company_id: string | null
          created_at: string
          created_by: string
          currency: string | null
          description: string | null
          id: string
          is_active: boolean
          model_number: string | null
          name: string
          specifications: Json | null
          unit_price: number | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          created_at?: string
          created_by: string
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          model_number?: string | null
          name: string
          specifications?: Json | null
          unit_price?: number | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          model_number?: string | null
          name?: string
          specifications?: Json | null
          unit_price?: number | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hardware_catalog_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hardware_requests: {
        Row: {
          admin_approval_notes: string | null
          admin_approved_at: string | null
          admin_id: string | null
          business_justification: string | null
          clinic_name: string | null
          company_id: string
          created_at: string
          currency: string | null
          decline_reason: string | null
          declined_at: string | null
          declined_by: string | null
          description: string | null
          eta_delivery: string | null
          expected_delivery_date: string | null
          from_email: boolean | null
          id: string
          manager_approval_notes: string | null
          manager_approved_at: string | null
          manager_id: string | null
          priority: Database["public"]["Enums"]["request_priority"]
          request_number: string | null
          status: Database["public"]["Enums"]["request_status"]
          title: string
          total_amount: number | null
          tracking_link: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_approval_notes?: string | null
          admin_approved_at?: string | null
          admin_id?: string | null
          business_justification?: string | null
          clinic_name?: string | null
          company_id: string
          created_at?: string
          currency?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          description?: string | null
          eta_delivery?: string | null
          expected_delivery_date?: string | null
          from_email?: boolean | null
          id?: string
          manager_approval_notes?: string | null
          manager_approved_at?: string | null
          manager_id?: string | null
          priority?: Database["public"]["Enums"]["request_priority"]
          request_number?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title: string
          total_amount?: number | null
          tracking_link?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_approval_notes?: string | null
          admin_approved_at?: string | null
          admin_id?: string | null
          business_justification?: string | null
          clinic_name?: string | null
          company_id?: string
          created_at?: string
          currency?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          description?: string | null
          eta_delivery?: string | null
          expected_delivery_date?: string | null
          from_email?: boolean | null
          id?: string
          manager_approval_notes?: string | null
          manager_approved_at?: string | null
          manager_id?: string | null
          priority?: Database["public"]["Enums"]["request_priority"]
          request_number?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          total_amount?: number | null
          tracking_link?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      helpdesk_knowledge_base: {
        Row: {
          company_id: string
          content: string
          created_at: string
          created_by: string | null
          department_id: string | null
          helpful_count: number | null
          id: string
          is_published: boolean | null
          not_helpful_count: number | null
          tags: string[] | null
          title: string
          updated_at: string
          updated_by: string | null
          view_count: number | null
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          not_helpful_count?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string
          updated_by?: string | null
          view_count?: number | null
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          not_helpful_count?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_knowledge_base_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_routing_rules: {
        Row: {
          auto_assign_to: string | null
          company_id: string
          created_at: string
          department_id: string
          id: string
          is_active: boolean
          priority: Database["public"]["Enums"]["ticket_priority"] | null
          sub_department_id: string | null
          updated_at: string
        }
        Insert: {
          auto_assign_to?: string | null
          company_id: string
          created_at?: string
          department_id: string
          id?: string
          is_active?: boolean
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          sub_department_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_assign_to?: string | null
          company_id?: string
          created_at?: string
          department_id?: string
          id?: string
          is_active?: boolean
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          sub_department_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_routing_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          is_public: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters: Json
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      helpdesk_status_workflows: {
        Row: {
          actions: Json
          company_id: string
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          priority: number
          trigger_conditions: Json
          updated_at: string
        }
        Insert: {
          actions?: Json
          company_id: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          trigger_conditions?: Json
          updated_at?: string
        }
        Update: {
          actions?: Json
          company_id?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          trigger_conditions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpdesk_status_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      helpdesk_ticket_checklists: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          items: Json
          ticket_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json
          ticket_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json
          ticket_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      helpdesk_ticket_metrics: {
        Row: {
          agent_responses: number | null
          calculated_at: string
          customer_responses: number | null
          first_response_time_minutes: number | null
          id: string
          reopened_times: number | null
          resolution_time_minutes: number | null
          ticket_id: string
          total_comments: number | null
        }
        Insert: {
          agent_responses?: number | null
          calculated_at?: string
          customer_responses?: number | null
          first_response_time_minutes?: number | null
          id?: string
          reopened_times?: number | null
          resolution_time_minutes?: number | null
          ticket_id: string
          total_comments?: number | null
        }
        Update: {
          agent_responses?: number | null
          calculated_at?: string
          customer_responses?: number | null
          first_response_time_minutes?: number | null
          id?: string
          reopened_times?: number | null
          resolution_time_minutes?: number | null
          ticket_id?: string
          total_comments?: number | null
        }
        Relationships: []
      }
      knowledge_base_categories: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_workspaces_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_favorites: {
        Row: {
          created_at: string
          id: string
          page_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_favorites_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_feedback: {
        Row: {
          comment: string | null
          created_at: string
          feedback_type: string
          id: string
          page_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          page_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          page_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_feedback_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_media: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          media_type: string
          media_url: string
          page_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          media_type: string
          media_url: string
          page_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          media_type?: string
          media_url?: string
          page_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_media_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_page_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          page_id: string
          parent_comment_id: string | null
          resolved: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          page_id: string
          parent_comment_id?: string | null
          resolved?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          page_id?: string
          parent_comment_id?: string | null
          resolved?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_page_comments_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_page_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_page_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_page_shares: {
        Row: {
          access_level: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          page_id: string
          password_hash: string | null
          share_token: string
          shared_by: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          page_id: string
          password_hash?: string | null
          share_token?: string
          shared_by: string
        }
        Update: {
          access_level?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          page_id?: string
          password_hash?: string | null
          share_token?: string
          shared_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_page_shares_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_page_tags: {
        Row: {
          created_at: string
          id: string
          page_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_page_tags_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_page_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_page_versions: {
        Row: {
          change_summary: string | null
          content: Json
          created_at: string
          created_by: string
          id: string
          page_id: string
          title: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          content: Json
          created_at?: string
          created_by: string
          id?: string
          page_id: string
          title: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          content?: Json
          created_at?: string
          created_by?: string
          id?: string
          page_id?: string
          title?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_page_versions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_pages: {
        Row: {
          category_id: string
          company_id: string
          content: Json
          cover_image: string | null
          created_at: string
          created_by: string
          icon: string | null
          id: string
          is_archived: boolean
          is_template: boolean
          parent_id: string | null
          published_at: string | null
          sort_order: number
          subcategory_id: string | null
          template_description: string | null
          template_name: string | null
          template_preview_image: string | null
          title: string
          updated_at: string
          updated_by: string | null
          view_mode: string
        }
        Insert: {
          category_id: string
          company_id: string
          content?: Json
          cover_image?: string | null
          created_at?: string
          created_by: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          is_template?: boolean
          parent_id?: string | null
          published_at?: string | null
          sort_order?: number
          subcategory_id?: string | null
          template_description?: string | null
          template_name?: string | null
          template_preview_image?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          view_mode?: string
        }
        Update: {
          category_id?: string
          company_id?: string
          content?: Json
          cover_image?: string | null
          created_at?: string
          created_by?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          is_template?: boolean
          parent_id?: string | null
          published_at?: string | null
          sort_order?: number
          subcategory_id?: string | null
          template_description?: string | null
          template_name?: string | null
          template_preview_image?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          view_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_pages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_pages_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_pages_workspace_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_ratings: {
        Row: {
          created_at: string
          id: string
          page_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_ratings_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_subcategories: {
        Row: {
          category_id: string
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_subcategories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_tags: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_request_attachments: {
        Row: {
          attachment_type: string | null
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          request_id: string
          uploaded_by: string
        }
        Insert: {
          attachment_type?: string | null
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          request_id: string
          uploaded_by: string
        }
        Update: {
          attachment_type?: string | null
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          request_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "marketing_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_request_status_history: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          notes: string | null
          request_id: string
          status: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          notes?: string | null
          request_id: string
          status: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          notes?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "marketing_request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "marketing_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_requests: {
        Row: {
          admin_approval_notes: string | null
          admin_approved_at: string | null
          admin_id: string | null
          brand: string | null
          business_justification: string | null
          clinic: string | null
          company_id: string
          created_at: string
          decline_reason: string | null
          declined_at: string | null
          declined_by: string | null
          description: string | null
          document_file_paths: string[] | null
          document_urls: string[] | null
          from_email: boolean | null
          id: string
          is_recurring: boolean | null
          manager_approval_notes: string | null
          manager_approved_at: string | null
          manager_id: string | null
          priority: Database["public"]["Enums"]["request_priority"]
          recipient_list_file_path: string | null
          recurrence_end_date: string | null
          recurrence_frequency:
            | Database["public"]["Enums"]["recurrence_frequency"]
            | null
          request_number: string | null
          request_type: Database["public"]["Enums"]["marketing_request_type"]
          scheduled_send_date: string | null
          scheduled_send_time: string | null
          status: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at: string
          user_id: string
          website_update_details: string | null
        }
        Insert: {
          admin_approval_notes?: string | null
          admin_approved_at?: string | null
          admin_id?: string | null
          brand?: string | null
          business_justification?: string | null
          clinic?: string | null
          company_id: string
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          description?: string | null
          document_file_paths?: string[] | null
          document_urls?: string[] | null
          from_email?: boolean | null
          id?: string
          is_recurring?: boolean | null
          manager_approval_notes?: string | null
          manager_approved_at?: string | null
          manager_id?: string | null
          priority?: Database["public"]["Enums"]["request_priority"]
          recipient_list_file_path?: string | null
          recurrence_end_date?: string | null
          recurrence_frequency?:
            | Database["public"]["Enums"]["recurrence_frequency"]
            | null
          request_number?: string | null
          request_type: Database["public"]["Enums"]["marketing_request_type"]
          scheduled_send_date?: string | null
          scheduled_send_time?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title: string
          updated_at?: string
          user_id: string
          website_update_details?: string | null
        }
        Update: {
          admin_approval_notes?: string | null
          admin_approved_at?: string | null
          admin_id?: string | null
          brand?: string | null
          business_justification?: string | null
          clinic?: string | null
          company_id?: string
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          description?: string | null
          document_file_paths?: string[] | null
          document_urls?: string[] | null
          from_email?: boolean | null
          id?: string
          is_recurring?: boolean | null
          manager_approval_notes?: string | null
          manager_approved_at?: string | null
          manager_id?: string | null
          priority?: Database["public"]["Enums"]["request_priority"]
          recipient_list_file_path?: string | null
          recurrence_end_date?: string | null
          recurrence_frequency?:
            | Database["public"]["Enums"]["recurrence_frequency"]
            | null
          request_number?: string | null
          request_type?: Database["public"]["Enums"]["marketing_request_type"]
          scheduled_send_date?: string | null
          scheduled_send_time?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          updated_at?: string
          user_id?: string
          website_update_details?: string | null
        }
        Relationships: []
      }
      membership_roles: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          membership_id: string
          role: Database["public"]["Enums"]["membership_role"]
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          membership_id: string
          role: Database["public"]["Enums"]["membership_role"]
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          membership_id?: string
          role?: Database["public"]["Enums"]["membership_role"]
        }
        Relationships: [
          {
            foreignKeyName: "membership_roles_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "company_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_configurations: {
        Row: {
          created_at: string
          custom_icon: string | null
          custom_label: string | null
          id: string
          is_visible: boolean
          item_key: string
          item_type: string
          parent_key: string | null
          role: Database["public"]["Enums"]["user_role"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_icon?: string | null
          custom_label?: string | null
          id?: string
          is_visible?: boolean
          item_key: string
          item_type: string
          parent_key?: string | null
          role: Database["public"]["Enums"]["user_role"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_icon?: string | null
          custom_label?: string | null
          id?: string
          is_visible?: boolean
          item_key?: string
          item_type?: string
          parent_key?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          channel_id: string | null
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          recipient_id: string | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          channel_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          recipient_id?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          channel_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          recipient_id?: string | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      news_article_permissions: {
        Row: {
          company_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_article_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      news_article_views: {
        Row: {
          article_id: string
          company_id: string
          id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          article_id: string
          company_id: string
          id?: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          article_id?: string
          company_id?: string
          id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_article_views_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "news_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_article_views_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          author_id: string
          company_id: string
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          published_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          company_id: string
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          company_id?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_articles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          submission_id: string
          uploaded_by: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          submission_id: string
          uploaded_by: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          submission_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_attachments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "newsletter_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_cycles: {
        Row: {
          compile_window_end: string
          compile_window_start: string
          created_at: string
          due_at: string
          id: string
          locked_at: string | null
          locked_by: string | null
          month: string
          open_at: string
          status: Database["public"]["Enums"]["newsletter_cycle_status"]
          updated_at: string
        }
        Insert: {
          compile_window_end: string
          compile_window_start: string
          created_at?: string
          due_at: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month: string
          open_at: string
          status?: Database["public"]["Enums"]["newsletter_cycle_status"]
          updated_at?: string
        }
        Update: {
          compile_window_end?: string
          compile_window_start?: string
          created_at?: string
          due_at?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          month?: string
          open_at?: string
          status?: Database["public"]["Enums"]["newsletter_cycle_status"]
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_reminder_logs: {
        Row: {
          channel: string
          cycle_id: string
          department: string
          id: string
          metadata: Json | null
          sent_at: string
          type: Database["public"]["Enums"]["newsletter_reminder_type"]
          user_id: string
        }
        Insert: {
          channel?: string
          cycle_id: string
          department: string
          id?: string
          metadata?: Json | null
          sent_at?: string
          type: Database["public"]["Enums"]["newsletter_reminder_type"]
          user_id: string
        }
        Update: {
          channel?: string
          cycle_id?: string
          department?: string
          id?: string
          metadata?: Json | null
          sent_at?: string
          type?: Database["public"]["Enums"]["newsletter_reminder_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_reminder_logs_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "newsletter_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_submissions: {
        Row: {
          clinics: string[] | null
          created_at: string
          cycle_id: string
          department: string
          has_no_update: boolean
          id: string
          last_edited_at: string
          payload: Json
          status: Database["public"]["Enums"]["newsletter_submission_status"]
          submitted_at: string | null
          submitter_id: string
          submitter_name: string
        }
        Insert: {
          clinics?: string[] | null
          created_at?: string
          cycle_id: string
          department: string
          has_no_update?: boolean
          id?: string
          last_edited_at?: string
          payload?: Json
          status?: Database["public"]["Enums"]["newsletter_submission_status"]
          submitted_at?: string | null
          submitter_id: string
          submitter_name: string
        }
        Update: {
          clinics?: string[] | null
          created_at?: string
          cycle_id?: string
          department?: string
          has_no_update?: boolean
          id?: string
          last_edited_at?: string
          payload?: Json
          status?: Database["public"]["Enums"]["newsletter_submission_status"]
          submitted_at?: string | null
          submitter_id?: string
          submitter_name?: string
        }
        Relationships: [
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
          created_at: string
          created_by: string | null
          department: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          sections: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          sections?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          sections?: Json
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_company_wide: boolean | null
          is_read: boolean | null
          link: string | null
          message: string
          metadata: Json | null
          notification_type:
            | Database["public"]["Enums"]["notification_type"]
            | null
          read_at: string | null
          reference_id: string | null
          reference_url: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_company_wide?: boolean | null
          is_read?: boolean | null
          link?: string | null
          message: string
          metadata?: Json | null
          notification_type?:
            | Database["public"]["Enums"]["notification_type"]
            | null
          read_at?: string | null
          reference_id?: string | null
          reference_url?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_company_wide?: boolean | null
          is_read?: boolean | null
          link?: string | null
          message?: string
          metadata?: Json | null
          notification_type?:
            | Database["public"]["Enums"]["notification_type"]
            | null
          read_at?: string | null
          reference_id?: string | null
          reference_url?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifyre_fax_campaigns: {
        Row: {
          campaign_id: string
          campaign_name: string | null
          company_id: string
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
          company_id: string
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
          company_id?: string
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
        Relationships: [
          {
            foreignKeyName: "notifyre_fax_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifyre_fax_logs: {
        Row: {
          campaign_id: string | null
          company_id: string
          cost_cents: number | null
          created_at: string
          delivered_at: string | null
          duration_seconds: number | null
          error_message: string | null
          failed_at: string | null
          id: string
          metadata: Json | null
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
          company_id: string
          cost_cents?: number | null
          created_at?: string
          delivered_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          notifyre_fax_id?: string | null
          pages_sent?: number | null
          recipient_name?: string | null
          recipient_number: string
          sent_at?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          company_id?: string
          cost_cents?: number | null
          created_at?: string
          delivered_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
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
          {
            foreignKeyName: "notifyre_fax_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifyre_sync_history: {
        Row: {
          campaigns_synced: number
          company_id: string
          created_at: string
          error_message: string | null
          faxes_synced: number
          from_date: string
          id: string
          status: string
          synced_by: string | null
          to_date: string
          updated_at: string
        }
        Insert: {
          campaigns_synced?: number
          company_id: string
          created_at?: string
          error_message?: string | null
          faxes_synced?: number
          from_date: string
          id?: string
          status?: string
          synced_by?: string | null
          to_date: string
          updated_at?: string
        }
        Update: {
          campaigns_synced?: number
          company_id?: string
          created_at?: string
          error_message?: string | null
          faxes_synced?: number
          from_date?: string
          id?: string
          status?: string
          synced_by?: string | null
          to_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifyre_sync_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      office365_connections: {
        Row: {
          access_token: string | null
          company_id: string
          connected_by: string
          created_at: string
          groups_delta_link: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          refresh_token: string | null
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
          user_id: string | null
          users_delta_link: string | null
        }
        Insert: {
          access_token?: string | null
          company_id: string
          connected_by: string
          created_at?: string
          groups_delta_link?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          refresh_token?: string | null
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
          users_delta_link?: string | null
        }
        Update: {
          access_token?: string | null
          company_id?: string
          connected_by?: string
          created_at?: string
          groups_delta_link?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          refresh_token?: string | null
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
          users_delta_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "office365_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_confirmation_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          request_id: string
          token: string
          updated_at: string
          used_at: string | null
          used_by_email: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          request_id: string
          token: string
          updated_at?: string
          used_at?: string | null
          used_by_email?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          request_id?: string
          token?: string
          updated_at?: string
          used_at?: string | null
          used_by_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_confirmation_tokens_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "hardware_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_permissions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      platform_roles: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["platform_role"]
          user_id?: string
        }
        Relationships: []
      }
      print_order_brands: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          form_url: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          form_url: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          form_url?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_order_brands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company_id: string | null
          created_at: string
          department: string | null
          email: string
          has_seen_theme_dialog: boolean
          id: string
          is_visible_in_directory: boolean | null
          last_sign_in_at: string | null
          mobile: string | null
          name: string | null
          office_location: string | null
          phone: string | null
          position: string | null
          primary_membership_id: string | null
          profile_image_url: string | null
          theme_preference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company_id?: string | null
          created_at?: string
          department?: string | null
          email: string
          has_seen_theme_dialog?: boolean
          id?: string
          is_visible_in_directory?: boolean | null
          last_sign_in_at?: string | null
          mobile?: string | null
          name?: string | null
          office_location?: string | null
          phone?: string | null
          position?: string | null
          primary_membership_id?: string | null
          profile_image_url?: string | null
          theme_preference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company_id?: string | null
          created_at?: string
          department?: string | null
          email?: string
          has_seen_theme_dialog?: boolean
          id?: string
          is_visible_in_directory?: boolean | null
          last_sign_in_at?: string | null
          mobile?: string | null
          name?: string | null
          office_location?: string | null
          phone?: string | null
          position?: string | null
          primary_membership_id?: string | null
          profile_image_url?: string | null
          theme_preference?: string | null
          updated_at?: string
          user_id?: string
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
            foreignKeyName: "profiles_primary_membership_id_fkey"
            columns: ["primary_membership_id"]
            isOneToOne: false
            referencedRelation: "company_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      request_attachments: {
        Row: {
          attachment_type: string | null
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          request_id: string
          request_type: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          attachment_type?: string | null
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          request_id: string
          request_type?: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          attachment_type?: string | null
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          request_id?: string
          request_type?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      request_comments: {
        Row: {
          comment: string | null
          comment_text: string | null
          created_at: string
          id: string
          is_internal: boolean | null
          request_id: string
          request_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          comment_text?: string | null
          created_at?: string
          id?: string
          is_internal?: boolean | null
          request_id: string
          request_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          comment_text?: string | null
          created_at?: string
          id?: string
          is_internal?: boolean | null
          request_id?: string
          request_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      request_items: {
        Row: {
          catalog_item_id: string | null
          created_at: string
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
          catalog_item_id?: string | null
          created_at?: string
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
          catalog_item_id?: string | null
          created_at?: string
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
            foreignKeyName: "request_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "hardware_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "hardware_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_status_history: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          notes: string | null
          request_id: string
          status: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          notes?: string | null
          request_id: string
          status: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          notes?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["request_status"]
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
      request_type_notifications: {
        Row: {
          can_approve: boolean | null
          company_id: string
          created_at: string | null
          id: string
          receive_notifications: boolean | null
          request_type: string
          sub_request_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_approve?: boolean | null
          company_id: string
          created_at?: string | null
          id?: string
          receive_notifications?: boolean | null
          request_type: string
          sub_request_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_approve?: boolean | null
          company_id?: string
          created_at?: string | null
          id?: string
          receive_notifications?: boolean | null
          request_type?: string
          sub_request_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_type_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          company_id: string
          created_at: string
          enabled: boolean
          feature_id: string | null
          id: string
          permission_key: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          enabled?: boolean
          feature_id?: string | null
          id?: string
          permission_key?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          enabled?: boolean
          feature_id?: string | null
          id?: string
          permission_key?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string | null
          filters: Json | null
          id: string
          name: string
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          name: string
          query: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          name?: string
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      sharepoint_configurations: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          drive_id: string | null
          folder_path: string | null
          id: string
          is_active: boolean
          site_id: string | null
          site_url: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          drive_id?: string | null
          folder_path?: string | null
          id?: string
          is_active?: boolean
          site_id?: string | null
          site_url: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          drive_id?: string | null
          folder_path?: string | null
          id?: string
          is_active?: boolean
          site_id?: string | null
          site_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sharepoint_configurations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      synced_office365_mailboxes: {
        Row: {
          company_id: string
          created_at: string
          email_address: string
          id: string
          mailbox_name: string
          mailbox_type: string | null
          members: Json | null
          synced_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email_address: string
          id?: string
          mailbox_name: string
          mailbox_type?: string | null
          members?: Json | null
          synced_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email_address?: string
          id?: string
          mailbox_name?: string
          mailbox_type?: string | null
          members?: Json | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "synced_office365_mailboxes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      synced_office365_users: {
        Row: {
          assigned_licenses: Json | null
          business_phones: Json | null
          company_id: string
          created_at: string
          department: string | null
          display_name: string | null
          id: string
          is_active: boolean
          job_title: string | null
          mail: string | null
          member_of: Json | null
          mobile_phone: string | null
          office_location: string | null
          synced_at: string
          user_principal_name: string
        }
        Insert: {
          assigned_licenses?: Json | null
          business_phones?: Json | null
          company_id: string
          created_at?: string
          department?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          mail?: string | null
          member_of?: Json | null
          mobile_phone?: string | null
          office_location?: string | null
          synced_at?: string
          user_principal_name: string
        }
        Update: {
          assigned_licenses?: Json | null
          business_phones?: Json | null
          company_id?: string
          created_at?: string
          department?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          mail?: string | null
          member_of?: Json | null
          mobile_phone?: string | null
          office_location?: string | null
          synced_at?: string
          user_principal_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "synced_office365_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_banners: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          is_active: boolean
          message: string
          show_on_pages: string[] | null
          start_date: string | null
          target_departments: string[] | null
          target_roles: string[] | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          message: string
          show_on_pages?: string[] | null
          start_date?: string | null
          target_departments?: string[] | null
          target_roles?: string[] | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          message?: string
          show_on_pages?: string[] | null
          start_date?: string | null
          target_departments?: string[] | null
          target_roles?: string[] | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_banners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_statuses: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          icon: string | null
          id: string
          is_active: boolean
          is_critical: boolean | null
          message: string | null
          sort_order: number
          status: string
          system_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_critical?: boolean | null
          message?: string | null
          sort_order?: number
          status: string
          system_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          is_critical?: boolean | null
          message?: string | null
          sort_order?: number
          status?: string
          system_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_statuses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      toner_requests: {
        Row: {
          colors_required: string[] | null
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          eta_delivery: string | null
          from_email: boolean | null
          id: string
          predicted_toner_models: string | null
          printer_model: string | null
          quantity: number
          request_number: string | null
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
          colors_required?: string[] | null
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          eta_delivery?: string | null
          from_email?: boolean | null
          id?: string
          predicted_toner_models?: string | null
          printer_model?: string | null
          quantity?: number
          request_number?: string | null
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
          colors_required?: string[] | null
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          eta_delivery?: string | null
          from_email?: boolean | null
          id?: string
          predicted_toner_models?: string | null
          printer_model?: string | null
          quantity?: number
          request_number?: string | null
          site?: string | null
          status?: string
          title?: string
          toner_type?: string | null
          tracking_link?: string | null
          updated_at?: string
          urgency?: string
          user_id?: string
        }
        Relationships: []
      }
      user_account_applications: {
        Row: {
          application_id: string
          created_at: string
          id: string
          user_account_request_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          user_account_request_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          user_account_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_account_applications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_account_applications_user_account_request_id_fkey"
            columns: ["user_account_request_id"]
            isOneToOne: false
            referencedRelation: "user_account_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_account_requests: {
        Row: {
          admin_approval_notes: string | null
          admin_approved_at: string | null
          admin_id: string | null
          business_justification: string | null
          company_id: string
          created_at: string
          decline_reason: string | null
          declined_at: string | null
          declined_by: string | null
          department: string | null
          email: string
          first_name: string
          from_email: boolean | null
          hardware_request_id: string | null
          id: string
          job_title: string | null
          last_name: string
          manager_name: string | null
          office365_license:
            | Database["public"]["Enums"]["office365_license"]
            | null
          request_number: string | null
          requested_by: string
          roles: string[] | null
          shared_mailboxes: string[] | null
          start_date: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          admin_approval_notes?: string | null
          admin_approved_at?: string | null
          admin_id?: string | null
          business_justification?: string | null
          company_id: string
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          department?: string | null
          email: string
          first_name: string
          from_email?: boolean | null
          hardware_request_id?: string | null
          id?: string
          job_title?: string | null
          last_name: string
          manager_name?: string | null
          office365_license?:
            | Database["public"]["Enums"]["office365_license"]
            | null
          request_number?: string | null
          requested_by: string
          roles?: string[] | null
          shared_mailboxes?: string[] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          admin_approval_notes?: string | null
          admin_approved_at?: string | null
          admin_id?: string | null
          business_justification?: string | null
          company_id?: string
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          department?: string | null
          email?: string
          first_name?: string
          from_email?: boolean | null
          hardware_request_id?: string | null
          id?: string
          job_title?: string | null
          last_name?: string
          manager_name?: string | null
          office365_license?:
            | Database["public"]["Enums"]["office365_license"]
            | null
          request_number?: string | null
          requested_by?: string
          roles?: string[] | null
          shared_mailboxes?: string[] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_account_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_account_requests_hardware_request_id_fkey"
            columns: ["hardware_request_id"]
            isOneToOne: false
            referencedRelation: "hardware_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invites: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invite_token: string
          invited_by: string
          role: Database["public"]["Enums"]["user_role"]
          status: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invite_token?: string
          invited_by: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_offboarding_requests: {
        Row: {
          additional_notes: string | null
          admin_approval_notes: string | null
          admin_approved_at: string | null
          admin_id: string | null
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          department: string | null
          disable_accounts: boolean | null
          exit_interview_completed: boolean | null
          forward_email_to: string | null
          id: string
          last_working_day: string
          manager_name: string | null
          remove_shared_mailboxes: string[] | null
          requested_by: string
          return_laptop: boolean | null
          return_other: string | null
          return_phone: boolean | null
          revoke_applications: string[] | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          user_email: string
          user_name: string
        }
        Insert: {
          additional_notes?: string | null
          admin_approval_notes?: string | null
          admin_approved_at?: string | null
          admin_id?: string | null
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          department?: string | null
          disable_accounts?: boolean | null
          exit_interview_completed?: boolean | null
          forward_email_to?: string | null
          id?: string
          last_working_day: string
          manager_name?: string | null
          remove_shared_mailboxes?: string[] | null
          requested_by: string
          return_laptop?: boolean | null
          return_other?: string | null
          return_phone?: boolean | null
          revoke_applications?: string[] | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_email: string
          user_name: string
        }
        Update: {
          additional_notes?: string | null
          admin_approval_notes?: string | null
          admin_approved_at?: string | null
          admin_id?: string | null
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          department?: string | null
          disable_accounts?: boolean | null
          exit_interview_completed?: boolean | null
          forward_email_to?: string | null
          id?: string
          last_working_day?: string
          manager_name?: string | null
          remove_shared_mailboxes?: string[] | null
          requested_by?: string
          return_laptop?: boolean | null
          return_other?: string | null
          return_phone?: boolean | null
          revoke_applications?: string[] | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_email?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_offboarding_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          company_id: string
          created_at: string
          feature_id: string | null
          granted: boolean
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["permission_type"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          feature_id?: string | null
          granted?: boolean
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["permission_type"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          feature_id?: string | null
          granted?: boolean
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["permission_type"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_news: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      can_user_view_clinic: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      generate_request_number: {
        Args: { p_company_id: string }
        Returns: string
      }
      get_assigned_users_for_department: {
        Args: {
          p_company_id: string
          p_department: string
          p_request_type?: string
          p_sub_department?: string
        }
        Returns: {
          can_approve: boolean
          email: string
          name: string
          receive_notifications: boolean
          user_id: string
        }[]
      }
      get_user_company: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_primary_company: {
        Args: { _user_id: string }
        Returns: string
      }
      has_global_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_membership_role: {
        Args: { _company_id: string; _roles: string[]; _user_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: {
          _company_id: string
          _permission: Database["public"]["Enums"]["permission_type"]
          _user_id: string
        }
        Returns: boolean
      }
      has_platform_role: {
        Args: { _roles: string[]; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _company_id: string
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_to_department: {
        Args: {
          p_company_id: string
          p_department: string
          p_request_type?: string
          p_sub_department?: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_clinic_publicly_shared: {
        Args: { _clinic_id: string }
        Returns: boolean
      }
      is_system_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      seed_company_role_permissions: {
        Args: { _company_id: string }
        Returns: undefined
      }
      sync_orphaned_auth_users: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      marketing_request_type: "fax_blast" | "email_blast" | "website_update"
      membership_role:
        | "company_owner"
        | "company_admin"
        | "approver"
        | "requester"
      membership_status: "invited" | "active" | "suspended" | "inactive"
      newsletter_cycle_status:
        | "open"
        | "due_soon"
        | "past_due"
        | "compiling"
        | "locked"
        | "published"
      newsletter_reminder_type:
        | "opening"
        | "day_10"
        | "day_7"
        | "day_3"
        | "day_1"
        | "past_due"
        | "escalation"
        | "cycle_created"
      newsletter_submission_status: "draft" | "submitted" | "approved"
      notification_type:
        | "news_article"
        | "newsletter_submission"
        | "request_approved"
        | "request_declined"
        | "company_announcement"
        | "user_mention"
      office365_license:
        | "microsoft_365_business_basic"
        | "microsoft_365_business_standard"
        | "microsoft_365_business_premium"
        | "microsoft_365_e3"
        | "microsoft_365_e5"
        | "office_365_e1"
        | "office_365_e3"
        | "office_365_e5"
      permission_type:
        | "view_requests"
        | "create_requests"
        | "approve_requests"
        | "manage_users"
        | "manage_company"
        | "manage_catalog"
        | "manage_news"
        | "manage_newsletter"
        | "view_audit_logs"
        | "manage_marketing_requests"
        | "manage_user_accounts"
        | "manage_user_offboarding"
        | "create_hardware_request"
        | "create_toner_request"
        | "create_user_account_request"
        | "create_user_offboarding_request"
        | "create_marketing_request"
        | "view_marketing_requests"
        | "view_user_accounts"
        | "view_user_offboarding"
        | "view_hardware_requests"
        | "view_toner_requests"
        | "create_helpdesk_ticket"
        | "view_helpdesk_tickets"
        | "manage_helpdesk_tickets"
        | "assign_helpdesk_tickets"
        | "manage_helpdesk_departments"
        | "create_news_article"
        | "publish_news_article"
        | "delete_news_article"
        | "create_newsletter_submission"
        | "review_newsletter_submission"
        | "export_newsletter"
        | "view_hardware_catalog"
        | "create_catalog_item"
        | "edit_catalog_item"
        | "delete_catalog_item"
        | "manage_company_settings"
        | "manage_company_locations"
        | "manage_company_domains"
        | "manage_company_features"
        | "manage_role_permissions"
        | "manage_user_permissions"
        | "manage_workflows"
        | "manage_office365"
        | "sync_office365_users"
        | "manage_sharepoint"
        | "manage_halo_integration"
        | "view_modality_management"
        | "manage_modality"
        | "manage_clinic_network"
        | "share_clinic_details"
        | "view_dashboard_analytics"
        | "view_request_metrics"
        | "manage_system_banners"
        | "manage_system_status"
        | "view_documentation"
        | "manage_documentation"
        | "view_knowledge_base"
        | "manage_knowledge_base"
        | "view_company_directory"
        | "manage_company_directory"
        | "manage_notifications"
        | "send_notifications"
        | "create_user_invite"
        | "revoke_user_invite"
        | "resend_user_invite"
      platform_role: "platform_admin" | "support_agent"
      recurrence_frequency: "daily" | "weekly" | "biweekly" | "monthly"
      request_priority: "low" | "medium" | "high" | "urgent"
      request_status:
        | "draft"
        | "submitted"
        | "pending_manager_approval"
        | "pending_admin_approval"
        | "approved"
        | "declined"
        | "ordered"
        | "delivered"
        | "cancelled"
        | "inbox"
      ticket_priority: "low" | "normal" | "high" | "urgent"
      ticket_status:
        | "new"
        | "open"
        | "in_progress"
        | "pending"
        | "resolved"
        | "closed"
        | "cancelled"
      user_role:
        | "requester"
        | "manager"
        | "tenant_admin"
        | "super_admin"
        | "marketing"
        | "marketing_manager"
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
      marketing_request_type: ["fax_blast", "email_blast", "website_update"],
      membership_role: [
        "company_owner",
        "company_admin",
        "approver",
        "requester",
      ],
      membership_status: ["invited", "active", "suspended", "inactive"],
      newsletter_cycle_status: [
        "open",
        "due_soon",
        "past_due",
        "compiling",
        "locked",
        "published",
      ],
      newsletter_reminder_type: [
        "opening",
        "day_10",
        "day_7",
        "day_3",
        "day_1",
        "past_due",
        "escalation",
        "cycle_created",
      ],
      newsletter_submission_status: ["draft", "submitted", "approved"],
      notification_type: [
        "news_article",
        "newsletter_submission",
        "request_approved",
        "request_declined",
        "company_announcement",
        "user_mention",
      ],
      office365_license: [
        "microsoft_365_business_basic",
        "microsoft_365_business_standard",
        "microsoft_365_business_premium",
        "microsoft_365_e3",
        "microsoft_365_e5",
        "office_365_e1",
        "office_365_e3",
        "office_365_e5",
      ],
      permission_type: [
        "view_requests",
        "create_requests",
        "approve_requests",
        "manage_users",
        "manage_company",
        "manage_catalog",
        "manage_news",
        "manage_newsletter",
        "view_audit_logs",
        "manage_marketing_requests",
        "manage_user_accounts",
        "manage_user_offboarding",
        "create_hardware_request",
        "create_toner_request",
        "create_user_account_request",
        "create_user_offboarding_request",
        "create_marketing_request",
        "view_marketing_requests",
        "view_user_accounts",
        "view_user_offboarding",
        "view_hardware_requests",
        "view_toner_requests",
        "create_helpdesk_ticket",
        "view_helpdesk_tickets",
        "manage_helpdesk_tickets",
        "assign_helpdesk_tickets",
        "manage_helpdesk_departments",
        "create_news_article",
        "publish_news_article",
        "delete_news_article",
        "create_newsletter_submission",
        "review_newsletter_submission",
        "export_newsletter",
        "view_hardware_catalog",
        "create_catalog_item",
        "edit_catalog_item",
        "delete_catalog_item",
        "manage_company_settings",
        "manage_company_locations",
        "manage_company_domains",
        "manage_company_features",
        "manage_role_permissions",
        "manage_user_permissions",
        "manage_workflows",
        "manage_office365",
        "sync_office365_users",
        "manage_sharepoint",
        "manage_halo_integration",
        "view_modality_management",
        "manage_modality",
        "manage_clinic_network",
        "share_clinic_details",
        "view_dashboard_analytics",
        "view_request_metrics",
        "manage_system_banners",
        "manage_system_status",
        "view_documentation",
        "manage_documentation",
        "view_knowledge_base",
        "manage_knowledge_base",
        "view_company_directory",
        "manage_company_directory",
        "manage_notifications",
        "send_notifications",
        "create_user_invite",
        "revoke_user_invite",
        "resend_user_invite",
      ],
      platform_role: ["platform_admin", "support_agent"],
      recurrence_frequency: ["daily", "weekly", "biweekly", "monthly"],
      request_priority: ["low", "medium", "high", "urgent"],
      request_status: [
        "draft",
        "submitted",
        "pending_manager_approval",
        "pending_admin_approval",
        "approved",
        "declined",
        "ordered",
        "delivered",
        "cancelled",
        "inbox",
      ],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: [
        "new",
        "open",
        "in_progress",
        "pending",
        "resolved",
        "closed",
        "cancelled",
      ],
      user_role: [
        "requester",
        "manager",
        "tenant_admin",
        "super_admin",
        "marketing",
        "marketing_manager",
      ],
    },
  },
} as const
