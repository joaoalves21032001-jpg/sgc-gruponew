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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          cargo: string | null
          cpf: string | null
          created_at: string
          email: string
          endereco: string | null
          id: string
          mensagem: string | null
          motivo_recusa: string | null
          nivel_acesso: string | null
          nome: string
          numero_emergencia_1: string | null
          numero_emergencia_2: string | null
          rg: string | null
          status: string
          telefone: string | null
        }
        Insert: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          endereco?: string | null
          id?: string
          mensagem?: string | null
          motivo_recusa?: string | null
          nivel_acesso?: string | null
          nome: string
          numero_emergencia_1?: string | null
          numero_emergencia_2?: string | null
          rg?: string | null
          status?: string
          telefone?: string | null
        }
        Update: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          endereco?: string | null
          id?: string
          mensagem?: string | null
          motivo_recusa?: string | null
          nivel_acesso?: string | null
          nome?: string
          numero_emergencia_1?: string | null
          numero_emergencia_2?: string | null
          rg?: string | null
          status?: string
          telefone?: string | null
        }
        Relationships: []
      }
      atividades: {
        Row: {
          cotacoes_enviadas: number
          cotacoes_fechadas: number
          created_at: string
          data: string
          follow_up: number
          id: string
          ligacoes: number
          mensagens: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cotacoes_enviadas?: number
          cotacoes_fechadas?: number
          created_at?: string
          data?: string
          follow_up?: number
          id?: string
          ligacoes?: number
          mensagens?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cotacoes_enviadas?: number
          cotacoes_fechadas?: number
          created_at?: string
          data?: string
          follow_up?: number
          id?: string
          ligacoes?: number
          mensagens?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      companhias: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      correction_requests: {
        Row: {
          admin_resposta: string | null
          created_at: string
          id: string
          motivo: string
          registro_id: string
          status: string
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_resposta?: string | null
          created_at?: string
          id?: string
          motivo: string
          registro_id: string
          status?: string
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_resposta?: string | null
          created_at?: string
          id?: string
          motivo?: string
          registro_id?: string
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_stages: {
        Row: {
          cor: string
          created_at: string
          created_by: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          cor?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          cor?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          boletos_path: string | null
          cartao_cnpj_path: string | null
          cnpj: string | null
          comprovante_endereco_path: string | null
          contato: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          doc_foto_path: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          stage_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          boletos_path?: string | null
          cartao_cnpj_path?: string | null
          cnpj?: string | null
          comprovante_endereco_path?: string | null
          contato?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          doc_foto_path?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          stage_id?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          boletos_path?: string | null
          cartao_cnpj_path?: string | null
          cnpj?: string | null
          comprovante_endereco_path?: string | null
          contato?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          doc_foto_path?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          stage_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "lead_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_trusted_devices: {
        Row: {
          created_at: string
          device_hash: string
          id: string
          trusted_until: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_hash: string
          id?: string
          trusted_until: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_hash?: string
          id?: string
          trusted_until?: string
          user_id?: string
        }
        Relationships: []
      }
      modalidades: {
        Row: {
          created_at: string
          documentos_obrigatorios: string[]
          documentos_opcionais: string[]
          id: string
          nome: string
          quantidade_vidas: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          documentos_obrigatorios?: string[]
          documentos_opcionais?: string[]
          id?: string
          nome: string
          quantidade_vidas?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          documentos_obrigatorios?: string[]
          documentos_opcionais?: string[]
          id?: string
          nome?: string
          quantidade_vidas?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          lida: boolean
          link: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          lida?: boolean
          link?: string | null
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          lida?: boolean
          link?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          companhia_id: string
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          companhia_id: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          companhia_id?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_companhia_id_fkey"
            columns: ["companhia_id"]
            isOneToOne: false
            referencedRelation: "companhias"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          acoes_desabilitadas: boolean
          apelido: string | null
          atividades_desabilitadas: boolean
          avatar_url: string | null
          cargo: string
          celular: string | null
          codigo: string | null
          cpf: string | null
          created_at: string
          disabled: boolean
          email: string
          endereco: string | null
          gerente_id: string | null
          id: string
          meta_faturamento: number | null
          nome_completo: string
          numero_emergencia_1: string | null
          numero_emergencia_2: string | null
          progresso_desabilitado: boolean
          rg: string | null
          supervisor_id: string | null
          updated_at: string
        }
        Insert: {
          acoes_desabilitadas?: boolean
          apelido?: string | null
          atividades_desabilitadas?: boolean
          avatar_url?: string | null
          cargo?: string
          celular?: string | null
          codigo?: string | null
          cpf?: string | null
          created_at?: string
          disabled?: boolean
          email: string
          endereco?: string | null
          gerente_id?: string | null
          id: string
          meta_faturamento?: number | null
          nome_completo: string
          numero_emergencia_1?: string | null
          numero_emergencia_2?: string | null
          progresso_desabilitado?: boolean
          rg?: string | null
          supervisor_id?: string | null
          updated_at?: string
        }
        Update: {
          acoes_desabilitadas?: boolean
          apelido?: string | null
          atividades_desabilitadas?: boolean
          avatar_url?: string | null
          cargo?: string
          celular?: string | null
          codigo?: string | null
          cpf?: string | null
          created_at?: string
          disabled?: boolean
          email?: string
          endereco?: string | null
          gerente_id?: string | null
          id?: string
          meta_faturamento?: number | null
          nome_completo?: string
          numero_emergencia_1?: string | null
          numero_emergencia_2?: string | null
          progresso_desabilitado?: boolean
          rg?: string | null
          supervisor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_gerente_id_fkey"
            columns: ["gerente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tab_permissions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          tab_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          tab_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          tab_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      venda_documentos: {
        Row: {
          created_at: string
          file_path: string
          file_size: number | null
          id: string
          nome: string
          tipo: string
          venda_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size?: number | null
          id?: string
          nome: string
          tipo: string
          venda_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size?: number | null
          id?: string
          nome?: string
          tipo?: string
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_documentos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          created_at: string
          data_lancamento: string | null
          id: string
          justificativa_retroativo: string | null
          modalidade: Database["public"]["Enums"]["venda_modalidade"]
          nome_titular: string
          observacoes: string | null
          status: Database["public"]["Enums"]["venda_status"]
          updated_at: string
          user_id: string
          valor: number | null
          vidas: number
        }
        Insert: {
          created_at?: string
          data_lancamento?: string | null
          id?: string
          justificativa_retroativo?: string | null
          modalidade: Database["public"]["Enums"]["venda_modalidade"]
          nome_titular: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["venda_status"]
          updated_at?: string
          user_id: string
          valor?: number | null
          vidas?: number
        }
        Update: {
          created_at?: string
          data_lancamento?: string | null
          id?: string
          justificativa_retroativo?: string | null
          modalidade?: Database["public"]["Enums"]["venda_modalidade"]
          nome_titular?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["venda_status"]
          updated_at?: string
          user_id?: string
          valor?: number | null
          vidas?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_user_data: {
        Args: { _target_user_id: string }
        Returns: boolean
      }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      cleanup_read_notifications: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_consultor_under_me: {
        Args: { _target_user_id: string }
        Returns: boolean
      }
      is_gerente: { Args: never; Returns: boolean }
      is_supervisor: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "consultor" | "supervisor" | "gerente" | "administrador"
      venda_modalidade:
        | "PF"
        | "Familiar"
        | "PME Multi"
        | "Empresarial"
        | "Adesão"
      venda_status:
        | "analise"
        | "pendente"
        | "aprovado"
        | "recusado"
        | "devolvido"
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
      app_role: ["consultor", "supervisor", "gerente", "administrador"],
      venda_modalidade: [
        "PF",
        "Familiar",
        "PME Multi",
        "Empresarial",
        "Adesão",
      ],
      venda_status: [
        "analise",
        "pendente",
        "aprovado",
        "recusado",
        "devolvido",
      ],
    },
  },
} as const
