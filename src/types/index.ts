// Database types will be added in Task 5
export interface Card {
  id: string
  user_id: string
  title: string
  content: Record<string, unknown> // Tiptap JSON
  created_at: string
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
    }
  }
}
