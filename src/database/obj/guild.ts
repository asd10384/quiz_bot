import { config } from "dotenv";
import { Document, model, Schema } from "mongoose";
config();

export interface quiz {
  type: string;
  playing: boolean;
  nowplaying: nowplay | null;
  queue: nowplay[];
};

export interface nowplay {
  anser: boolean;
  title: string;
  author: string;
  duration: string;
  url: string;
  image: string;
  player: string;
};

export interface guild_type extends Document {
  id: string;
  name: string;
  prefix: string;
  role: string[];
  channelId: string;
  msgId: string;
  scoreId: string;
  options: {
    volume: number;
    player: boolean;
    listlimit: number;
    author: boolean;
    nexttime: number;
    anser: string;
  }
}

const GuildSchema: Schema = new Schema({
  id: { type: String, required: true },
  name: { type: String },
  prefix: { type: String, default: (process.env.PREFIX) ? process.env.PREFIX : 'm;' },
  role: { type: Array },
  channelId: { type: String },
  msgId: { type: String },
  scoreId: { type: String },
  options: {
    volume: { type: Number },
    player: { type: Boolean },
    listlimit: { type: Number },
    author: { type: Boolean },
    nexttime: { type: Number, default: 10 },
    anser: { type: String, default: "제목" }
  }
});

export const guild_model = model<guild_type>(`Guild${(process.env.BOT_NUMBER) ? process.env.BOT_NUMBER : ''}`, GuildSchema);