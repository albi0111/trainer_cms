import { BaseModel } from '../../../types/base';

export interface Client extends BaseModel {
  name: string;
  email: string;
  phone: string;
  goal: string;
  status: 'active' | 'inactive';
  last_session_at: Date | null;
  search_tokens: string[]; // Trigram/Prefix index for Firestore search
}
