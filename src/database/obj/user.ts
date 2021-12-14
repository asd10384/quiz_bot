import { config } from "dotenv";
import { Document, model, Schema } from "mongoose";
config();

export interface user_type extends Document {
  id: string,
  tag: string,
  nickname: string,
  canplay: boolean
}

const UserSchema: Schema = new Schema({
  id: { type: String, required: true },
  tag: { type: String, required: true },
  nickname: { type: String },
  canplay: { type: Boolean }
});

export const user_model = model<user_type>(`UserBot`, UserSchema);