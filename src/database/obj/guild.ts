import { config } from "dotenv";
import { Document, model, Schema } from "mongoose";
import { page_data } from "../../quiz/type";
config();

export interface quiz {
  score: Map<string, number>;
  anser: string | null;
  image: string;
  type: page_data;
  playing: boolean;
  nowplaying: nowplay | null;
  queue: nowplay[];
  count: [ number, number ];
  page: {
    go: boolean | null;
    page: string[];
    now: number;
    first: boolean;
    list: string[];
    maxpage: number;
    player: string | null;
  }
};

export interface nowplay {
  name: string;
  vocal: string;
  link: string;
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

export const guild_model = model<guild_type>(`GuildBot`, GuildSchema);