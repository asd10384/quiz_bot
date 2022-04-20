import "dotenv/config";
import { Document, model, Schema } from "mongoose";
import { page_data } from "../../quiz/quizClass";

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
  realnumber: number;
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
  name: { type: String, default: "" },
  prefix: { type: String, default: (process.env.PREFIX) ? process.env.PREFIX : 'm;' },
  role: { type: Array, default: [] },
  channelId: { type: String, default: "" },
  msgId: { type: String, default: "" },
  scoreId: { type: String, default: "" },
  options: {
    volume: { type: Number, default: 70 },
    player: { type: Boolean, default: true },
    listlimit: { type: Number, default: 300 },
    author: { type: Boolean, default: false },
    nexttime: { type: Number, default: 10 },
    anser: { type: String, default: "제목" }
  }
});

export const guild_model = model<guild_type>(`GuildBot`, GuildSchema);