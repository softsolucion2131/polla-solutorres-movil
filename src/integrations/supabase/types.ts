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
      agencies: {
        Row: {
          activo: boolean
          bank_id: number | null
          created_at: string
          id: number
          name: string
          phone: string
          porcentaje: number
          rif: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          bank_id?: number | null
          created_at?: string
          id?: number
          name: string
          phone?: string
          porcentaje?: number
          rif?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          bank_id?: number | null
          created_at?: string
          id?: number
          name?: string
          phone?: string
          porcentaje?: number
          rif?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agencies_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      banks: {
        Row: {
          activo: boolean
          created_at: string
          id: number
          name: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: number
          name: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      detprog: {
        Row: {
          bloquea_ok: boolean
          carrera: number
          created_at: string
          divgan: number
          divgand: number
          divplace: number | null
          divplaced: number
          divshow: number
          fechac: string
          id: number
          idhip: string
          idprog: number
          nombreeje: string | null
          nro_valida: number | null
          nroejem: string
          puntos_especiales: number | null
          ret_ok: boolean
          updated_at: string
          valida_polla: boolean | null
        }
        Insert: {
          bloquea_ok?: boolean
          carrera: number
          created_at?: string
          divgan?: number
          divgand?: number
          divplace?: number | null
          divplaced?: number
          divshow?: number
          fechac: string
          id?: number
          idhip: string
          idprog: number
          nombreeje?: string | null
          nro_valida?: number | null
          nroejem: string
          puntos_especiales?: number | null
          ret_ok?: boolean
          updated_at?: string
          valida_polla?: boolean | null
        }
        Update: {
          bloquea_ok?: boolean
          carrera?: number
          created_at?: string
          divgan?: number
          divgand?: number
          divplace?: number | null
          divplaced?: number
          divshow?: number
          fechac?: string
          id?: number
          idhip?: string
          idprog?: number
          nombreeje?: string | null
          nro_valida?: number | null
          nroejem?: string
          puntos_especiales?: number | null
          ret_ok?: boolean
          updated_at?: string
          valida_polla?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "detprog_idprog_fkey"
            columns: ["idprog"]
            isOneToOne: false
            referencedRelation: "programa"
            referencedColumns: ["idprog"]
          },
        ]
      }
      dividendos: {
        Row: {
          adicional: number
          adicionald: number
          adicionalp: number
          adicionals: number
          created_at: string
          desde: number
          desdep: number
          desdes: number
          divfijo: number
          divfijop: number
          divfijos: number
          fijo: number
          fijod: number
          fijop: number
          fijos: number
          hasta: number
          hastap: number
          hastas: number
          id_div: number
          idage: number
          idhip: string
          updated_at: string
        }
        Insert: {
          adicional?: number
          adicionald?: number
          adicionalp?: number
          adicionals?: number
          created_at?: string
          desde?: number
          desdep?: number
          desdes?: number
          divfijo?: number
          divfijop?: number
          divfijos?: number
          fijo?: number
          fijod?: number
          fijop?: number
          fijos?: number
          hasta?: number
          hastap?: number
          hastas?: number
          id_div?: number
          idage: number
          idhip: string
          updated_at?: string
        }
        Update: {
          adicional?: number
          adicionald?: number
          adicionalp?: number
          adicionals?: number
          created_at?: string
          desde?: number
          desdep?: number
          desdes?: number
          divfijo?: number
          divfijop?: number
          divfijos?: number
          fijo?: number
          fijod?: number
          fijop?: number
          fijos?: number
          hasta?: number
          hastap?: number
          hastas?: number
          id_div?: number
          idage?: number
          idhip?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dividendos_idage_fkey"
            columns: ["idage"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dividendos_idhip_fkey"
            columns: ["idhip"]
            isOneToOne: false
            referencedRelation: "hipodromos"
            referencedColumns: ["idhip"]
          },
        ]
      }
      hipodromos: {
        Row: {
          activo: boolean
          acumulado: number
          cos_bol: number
          created_at: string
          divmax: number
          empate: number
          idhip: string
          nomhip: string
          nrocaballos: number
          nrocarreras: number
          porc_acumulado: number
          porc_primer_lugar: number
          porc_retener: number
          porc_segundo_lugar: number
          porc_tercer_lugar: number
          tipo: number
          updated_at: string
          venxcar: number
        }
        Insert: {
          activo?: boolean
          acumulado?: number
          cos_bol?: number
          created_at?: string
          divmax?: number
          empate?: number
          idhip: string
          nomhip: string
          nrocaballos?: number
          nrocarreras?: number
          porc_acumulado?: number
          porc_primer_lugar?: number
          porc_retener?: number
          porc_segundo_lugar?: number
          porc_tercer_lugar?: number
          tipo?: number
          updated_at?: string
          venxcar?: number
        }
        Update: {
          activo?: boolean
          acumulado?: number
          cos_bol?: number
          created_at?: string
          divmax?: number
          empate?: number
          idhip?: string
          nomhip?: string
          nrocaballos?: number
          nrocarreras?: number
          porc_acumulado?: number
          porc_primer_lugar?: number
          porc_retener?: number
          porc_segundo_lugar?: number
          porc_tercer_lugar?: number
          tipo?: number
          updated_at?: string
          venxcar?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agency_id: number | null
          balance: number
          bank_id: number | null
          block_balance: number
          created_at: string
          email: string
          id: string
          identity_card: string | null
          name: string
          number_account: string | null
          phone: string | null
          pseudonimo: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: number | null
          balance?: number
          bank_id?: number | null
          block_balance?: number
          created_at?: string
          email: string
          id: string
          identity_card?: string | null
          name?: string
          number_account?: string | null
          phone?: string | null
          pseudonimo?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: number | null
          balance?: number
          bank_id?: number | null
          block_balance?: number
          created_at?: string
          email?: string
          id?: string
          identity_card?: string | null
          name?: string
          number_account?: string | null
          phone?: string | null
          pseudonimo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      programa: {
        Row: {
          bloquea_ok: boolean
          cabgan: string
          cabpla: number
          cabpla2: number
          cabshow3: number
          carrera: number
          conf_ok: boolean
          created_at: string
          divgan: number | null
          divgand: number | null
          divpla: number
          divpla2: number
          divplad: number
          divplad2: number
          divshow: number
          divshow2: number
          divshow3: number
          divshowd: number
          divshowd2: number
          divshowd3: number
          empate: boolean | null
          fechac: string
          horac: string | null
          idhip: string
          idprog: number
          nro_valida: number | null
          nrocab: number
          updated_at: string
          valida_polla: boolean | null
        }
        Insert: {
          bloquea_ok?: boolean
          cabgan?: string
          cabpla?: number
          cabpla2?: number
          cabshow3?: number
          carrera: number
          conf_ok?: boolean
          created_at?: string
          divgan?: number | null
          divgand?: number | null
          divpla?: number
          divpla2?: number
          divplad?: number
          divplad2?: number
          divshow?: number
          divshow2?: number
          divshow3?: number
          divshowd?: number
          divshowd2?: number
          divshowd3?: number
          empate?: boolean | null
          fechac: string
          horac?: string | null
          idhip: string
          idprog?: number
          nro_valida?: number | null
          nrocab?: number
          updated_at?: string
          valida_polla?: boolean | null
        }
        Update: {
          bloquea_ok?: boolean
          cabgan?: string
          cabpla?: number
          cabpla2?: number
          cabshow3?: number
          carrera?: number
          conf_ok?: boolean
          created_at?: string
          divgan?: number | null
          divgand?: number | null
          divpla?: number
          divpla2?: number
          divplad?: number
          divplad2?: number
          divshow?: number
          divshow2?: number
          divshow3?: number
          divshowd?: number
          divshowd2?: number
          divshowd3?: number
          empate?: boolean | null
          fechac?: string
          horac?: string | null
          idhip?: string
          idprog?: number
          nro_valida?: number | null
          nrocab?: number
          updated_at?: string
          valida_polla?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "programa_idhip_fkey"
            columns: ["idhip"]
            isOneToOne: false
            referencedRelation: "hipodromos"
            referencedColumns: ["idhip"]
          },
        ]
      }
      transfers: {
        Row: {
          agency_id: number
          amount: number
          bank_id: number | null
          capture_url: string | null
          created_at: string
          id: string
          observations: string | null
          reference: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: number
          amount: number
          bank_id?: number | null
          capture_url?: string | null
          created_at?: string
          id?: string
          observations?: string | null
          reference: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: number
          amount?: number
          bank_id?: number | null
          capture_url?: string | null
          created_at?: string
          id?: string
          observations?: string | null
          reference?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          account_holder: string | null
          account_number: string
          agency_id: number | null
          amount: number
          bank_id: number | null
          created_at: string
          id: string
          identity_card: string | null
          observations: string | null
          reference_payment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder?: string | null
          account_number: string
          agency_id?: number | null
          amount: number
          bank_id?: number | null
          created_at?: string
          id?: string
          identity_card?: string | null
          observations?: string | null
          reference_payment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string
          agency_id?: number | null
          amount?: number
          bank_id?: number | null
          created_at?: string
          id?: string
          identity_card?: string | null
          observations?: string | null
          reference_payment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "agency" | "player"
      transfer_status: "pendiente" | "aprobado" | "rechazado"
      withdrawal_status: "pendiente" | "aprobado" | "rechazado"
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
      app_role: ["admin", "agency", "player"],
      transfer_status: ["pendiente", "aprobado", "rechazado"],
      withdrawal_status: ["pendiente", "aprobado", "rechazado"],
    },
  },
} as const
