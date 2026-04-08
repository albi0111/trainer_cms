import { FieldValue } from 'firebase/firestore';

export interface BaseModel {
  id: string;
  created_at: Date; // Note: In Firestore it's a Timestamp, we convert in converters
  updated_at: Date | FieldValue; 
  updated_by: string;
  version: number;
  deleted: boolean;
  deleted_at?: Date | null;
}

export type CreateModelInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at' | 'deleted' | 'deleted_at' | 'version'>;
export type UpdateModelInput<T> = Partial<CreateModelInput<T>>;
