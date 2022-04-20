import "dotenv/config";
import { Document, model, Schema } from "mongoose";

export interface user_type extends Document {
  id: string,
  tag: string,
  nickname: string,
  canplay: boolean
}

const UserSchema: Schema = new Schema({
  id: { type: String, required: true },
  tag: { type: String, required: true },
  nickname: { type: String, default: "" },
  canplay: { type: Boolean, default: true }
});

export const user_model = model<user_type>(`UserBot`, UserSchema);