/**
 * TypeScript definitions for database tables
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name?: string;
          created_at: number;
          updated_at: number;
        };
        Insert: {
          id?: string;
          email: string;
          display_name?: string;
          created_at?: number;
          updated_at?: number;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          created_at?: number;
          updated_at?: number;
        };
      };
      credentials: {
        Row: {
          id: string;
          user_id: string;
          credential_id: string;
          credential_public_key: string;
          counter: number;
          device_type?: string;
          backed_up?: boolean;
          transports?: string[];
          created_at: number;
          last_used_at: number;
          name?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          credential_id: string;
          credential_public_key: string;
          counter: number;
          device_type?: string;
          backed_up?: boolean;
          transports?: string[];
          created_at?: number;
          last_used_at?: number;
          name?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          credential_id?: string;
          credential_public_key?: string;
          counter?: number;
          device_type?: string;
          backed_up?: boolean;
          transports?: string[];
          created_at?: number;
          last_used_at?: number;
          name?: string;
        };
      };
      device_credentials: {
        Row: {
          id: string;
          user_id: string;
          credential_id: string;
          device_fingerprint: string;
          device_details: {
            userAgent?: string;
            platform?: string;
            screenResolution?: string;
            timezone?: string;
            language?: string;
            [key: string]: unknown;
          };
          created_at: number;
          last_used_at: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          credential_id: string;
          device_fingerprint: string;
          device_details: {
            userAgent?: string;
            platform?: string;
            screenResolution?: string;
            timezone?: string;
            language?: string;
            [key: string]: unknown;
          };
          created_at?: number;
          last_used_at?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          credential_id?: string;
          device_fingerprint?: string;
          device_details?: {
            userAgent?: string;
            platform?: string;
            screenResolution?: string;
            timezone?: string;
            language?: string;
            [key: string]: unknown;
          };
          created_at?: number;
          last_used_at?: number;
        };
      };
      challenges: {
        Row: {
          id: string;
          challenge: string;
          type: "registration" | "authentication";
          data: Record<string, unknown>;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          challenge: string;
          type: "registration" | "authentication";
          data?: Record<string, unknown>;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          challenge?: string;
          type?: "registration" | "authentication";
          data?: Record<string, unknown>;
          expires_at?: string;
          created_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          expires_at?: string;
          created_at?: string;
        };
      };
    };
  };
}
