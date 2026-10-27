export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      approvals: {
        Row: {
          autor_nome: string;
          comentario: string | null;
          created_at: string;
          decisao: Database["public"]["Enums"]["approval_decision"];
          deliverable_id: string;
          id: string;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          autor_nome: string;
          comentario?: string | null;
          created_at?: string;
          decisao: Database["public"]["Enums"]["approval_decision"];
          deliverable_id: string;
          id?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          autor_nome?: string;
          comentario?: string | null;
          created_at?: string;
          decisao?: Database["public"]["Enums"]["approval_decision"];
          deliverable_id?: string;
          id?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "approvals_deliverable_id_workspace_id_fkey";
            columns: ["deliverable_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "deliverables";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "approvals_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          briefing: string | null;
          contatos: NonNullable<Json>;
          created_at: string;
          dia_vencimento: number | null;
          id: string;
          inicio_contrato: string | null;
          links: NonNullable<Json>;
          nome: string;
          package_template_id: string | null;
          portal_token: string;
          segmento: string | null;
          status: Database["public"]["Enums"]["client_status"];
          tom_de_voz: string | null;
          updated_at: string;
          valor_mensal: number | null;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          briefing?: string | null;
          contatos?: NonNullable<Json>;
          created_at?: string;
          dia_vencimento?: number | null;
          id?: string;
          inicio_contrato?: string | null;
          links?: NonNullable<Json>;
          nome: string;
          package_template_id?: string | null;
          portal_token?: string;
          segmento?: string | null;
          status?: Database["public"]["Enums"]["client_status"];
          tom_de_voz?: string | null;
          updated_at?: string;
          valor_mensal?: number | null;
          workspace_id: string;
        };
        Update: {
          briefing?: string | null;
          contatos?: NonNullable<Json>;
          created_at?: string;
          dia_vencimento?: number | null;
          id?: string;
          inicio_contrato?: string | null;
          links?: NonNullable<Json>;
          nome?: string;
          package_template_id?: string | null;
          portal_token?: string;
          segmento?: string | null;
          status?: Database["public"]["Enums"]["client_status"];
          tom_de_voz?: string | null;
          updated_at?: string;
          valor_mensal?: number | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clients_package_template_id_workspace_id_fkey";
            columns: ["package_template_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "package_templates";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "clients_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      deliverables: {
        Row: {
          client_id: string;
          created_at: string;
          data_publicacao: string | null;
          formato: Database["public"]["Enums"]["deliverable_format"];
          id: string;
          legenda: string | null;
          midia_urls: string[];
          ordem: number;
          status: Database["public"]["Enums"]["deliverable_status"];
          status_changed_at: string;
          titulo: string;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          created_at?: string;
          data_publicacao?: string | null;
          formato?: Database["public"]["Enums"]["deliverable_format"];
          id?: string;
          legenda?: string | null;
          midia_urls?: string[];
          ordem?: number;
          status?: Database["public"]["Enums"]["deliverable_status"];
          status_changed_at?: string;
          titulo: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          data_publicacao?: string | null;
          formato?: Database["public"]["Enums"]["deliverable_format"];
          id?: string;
          legenda?: string | null;
          midia_urls?: string[];
          ordem?: number;
          status?: Database["public"]["Enums"]["deliverable_status"];
          status_changed_at?: string;
          titulo?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deliverables_client_id_workspace_id_fkey";
            columns: ["client_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "deliverables_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          role: Database["public"]["Enums"]["workspace_role"];
          token: string;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["workspace_role"];
          token?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["workspace_role"];
          token?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      package_templates: {
        Row: {
          created_at: string;
          id: string;
          itens: NonNullable<Json>;
          nome: string;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          itens?: NonNullable<Json>;
          nome: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          itens?: NonNullable<Json>;
          nome?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "package_templates_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          client_id: string;
          competencia: string;
          created_at: string;
          id: string;
          pago_em: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          updated_at: string;
          valor: number;
          vencimento: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          competencia: string;
          created_at?: string;
          id?: string;
          pago_em?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
          valor: number;
          vencimento: string;
          workspace_id: string;
        };
        Update: {
          client_id?: string;
          competencia?: string;
          created_at?: string;
          id?: string;
          pago_em?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          updated_at?: string;
          valor?: number;
          vencimento?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_client_id_workspace_id_fkey";
            columns: ["client_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "payments_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      plan_limits: {
        Row: {
          created_at: string;
          max_clients: number | null;
          max_members: number;
          plano: Database["public"]["Enums"]["plan_tier"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          max_clients?: number | null;
          max_members: number;
          plano: Database["public"]["Enums"]["plan_tier"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          max_clients?: number | null;
          max_members?: number;
          plano?: Database["public"]["Enums"]["plan_tier"];
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          id: string;
          last_workspace_id: string | null;
          nome: string;
          onboarded_at: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          id: string;
          last_workspace_id?: string | null;
          nome?: string;
          onboarded_at?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          id?: string;
          last_workspace_id?: string | null;
          nome?: string;
          onboarded_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_last_workspace_id_fkey";
            columns: ["last_workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          client_id: string | null;
          competencia: string | null;
          created_at: string;
          done_at: string | null;
          due_date: string | null;
          id: string;
          meeting_id: string | null;
          origem: Database["public"]["Enums"]["task_origin"];
          status: Database["public"]["Enums"]["task_status"];
          template_key: string | null;
          tipo: Database["public"]["Enums"]["task_type"];
          titulo: string;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          client_id?: string | null;
          competencia?: string | null;
          created_at?: string;
          done_at?: string | null;
          due_date?: string | null;
          id?: string;
          meeting_id?: string | null;
          origem?: Database["public"]["Enums"]["task_origin"];
          status?: Database["public"]["Enums"]["task_status"];
          template_key?: string | null;
          tipo?: Database["public"]["Enums"]["task_type"];
          titulo: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          client_id?: string | null;
          competencia?: string | null;
          created_at?: string;
          done_at?: string | null;
          due_date?: string | null;
          id?: string;
          meeting_id?: string | null;
          origem?: Database["public"]["Enums"]["task_origin"];
          status?: Database["public"]["Enums"]["task_status"];
          template_key?: string | null;
          tipo?: Database["public"]["Enums"]["task_type"];
          titulo?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_workspace_id_fkey";
            columns: ["client_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_members: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["workspace_role"];
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          role?: Database["public"]["Enums"]["workspace_role"];
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["workspace_role"];
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          created_at: string;
          id: string;
          nome: string;
          owner_id: string;
          plano: Database["public"]["Enums"]["plan_tier"];
          slug: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          nome: string;
          owner_id: string;
          plano?: Database["public"]["Enums"]["plan_tier"];
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          nome?: string;
          owner_id?: string;
          plano?: Database["public"]["Enums"]["plan_tier"];
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspaces_plano_fkey";
            columns: ["plano"];
            isOneToOne: false;
            referencedRelation: "plan_limits";
            referencedColumns: ["plano"];
          },
        ];
      };
    };
    Views: {
      client_timeline: {
        Row: {
          client_id: string | null;
          ocorreu_em: string | null;
          ref_id: string | null;
          tipo: string | null;
          titulo: string | null;
          workspace_id: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string };
      can_access_media: { Args: { p_name: string }; Returns: boolean };
      complete_onboarding: { Args: { p_nome: string; p_workspace_nome: string }; Returns: string };
      create_workspace: {
        Args: { p_nome: string };
        Returns: {
          created_at: string;
          id: string;
          nome: string;
          owner_id: string;
          plano: Database["public"]["Enums"]["plan_tier"];
          slug: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "workspaces";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_workspace_for: {
        Args: { p_nome: string; p_user_id: string };
        Returns: {
          created_at: string;
          id: string;
          nome: string;
          owner_id: string;
          plano: Database["public"]["Enums"]["plan_tier"];
          slug: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "workspaces";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      generate_month: {
        Args: { p_competencia: string; p_workspace_id: string };
        Returns: {
          cobrancas_criadas: number;
          tarefas_criadas: number;
        }[];
      };
      get_invitation: {
        Args: { p_token: string };
        Returns: {
          aceito: boolean;
          email: string;
          expirado: boolean;
          role: Database["public"]["Enums"]["workspace_role"];
          workspace_nome: string;
        }[];
      };
      has_workspace_role: {
        Args: { p_roles: Database["public"]["Enums"]["workspace_role"][]; p_workspace_id: string };
        Returns: boolean;
      };
      is_workspace_member: { Args: { p_workspace_id: string }; Returns: boolean };
      package_item_dates: {
        Args: {
          p_cadencia: Database["public"]["Enums"]["package_cadence"];
          p_competencia: string;
          p_quantidade: number;
        };
        Returns: string[];
      };
      portal_respond: {
        Args: {
          p_autor_nome: string;
          p_comentario: string;
          p_decisao: Database["public"]["Enums"]["approval_decision"];
          p_deliverable_id: string;
          p_token: string;
        };
        Returns: undefined;
      };
      regenerate_portal_token: { Args: { p_client_id: string }; Returns: string };
      shares_workspace_with: { Args: { p_user_id: string }; Returns: boolean };
      slugify: { Args: { value: string }; Returns: string };
      unique_workspace_slug: { Args: { p_nome: string }; Returns: string };
      workspace_seat_usage: { Args: { p_workspace_id: string }; Returns: number };
      workspace_usage: {
        Args: { p_workspace_id: string };
        Returns: {
          clients: number;
          max_clients: number;
          max_members: number;
          members: number;
          pending_invitations: number;
          plano: Database["public"]["Enums"]["plan_tier"];
        }[];
      };
    };
    Enums: {
      approval_decision: "aprovado" | "ajuste";
      client_status: "ativo" | "pausado" | "encerrado";
      deliverable_format: "post" | "reels" | "carrossel" | "story" | "relatorio";
      deliverable_status: "planejar" | "produzir" | "em_aprovacao" | "aprovado" | "publicado";
      package_cadence: "diaria" | "semanal" | "mensal";
      payment_status: "pendente" | "pago" | "atrasado";
      plan_tier: "free" | "pro" | "estudio";
      task_origin: "template" | "ata" | "manual";
      task_status: "pendente" | "feita";
      task_type: "recorrente" | "avulsa" | "reuniao";
      workspace_role: "owner" | "admin" | "member";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      approval_decision: ["aprovado", "ajuste"],
      client_status: ["ativo", "pausado", "encerrado"],
      deliverable_format: ["post", "reels", "carrossel", "story", "relatorio"],
      deliverable_status: ["planejar", "produzir", "em_aprovacao", "aprovado", "publicado"],
      package_cadence: ["diaria", "semanal", "mensal"],
      payment_status: ["pendente", "pago", "atrasado"],
      plan_tier: ["free", "pro", "estudio"],
      task_origin: ["template", "ata", "manual"],
      task_status: ["pendente", "feita"],
      task_type: ["recorrente", "avulsa", "reuniao"],
      workspace_role: ["owner", "admin", "member"],
    },
  },
} as const;
