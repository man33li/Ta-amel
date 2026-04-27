export interface Card {
  id: string
  user_id: string
  title: string
  content: Record<string, unknown> // Tiptap JSON
  created_at: string
  updated_at: string
  room_id?: string | null
}

export interface Wing {
  id: string
  user_id: string
  name: string
  color: string | null
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  wing_id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export type MemorySource = 'semantic' | 'keyword' | 'recent'

export interface SearchHit {
  id: string
  card_id: string | null
  title: string
  preview: string
  score: number
  source: MemorySource
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      cards: {
        Row: Card
        Insert: Omit<Card, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Card, 'id' | 'user_id' | 'created_at'>>
      }
      wings: {
        Row: Wing
        Insert: Omit<Wing, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Wing, 'id' | 'user_id' | 'created_at'>>
      }
      rooms: {
        Row: Room
        Insert: Omit<Room, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Room, 'id' | 'user_id' | 'wing_id' | 'created_at'>>
      }
    }
  }
}
