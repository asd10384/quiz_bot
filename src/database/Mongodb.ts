import { config } from "dotenv";
import { I, M, MEM } from "../aliases/discord.js";
import { connect } from "mongoose";
import { GuildMember, PartialMessage, SelectMenuInteraction, VoiceState } from "discord.js";
import { guild_type, guild_model } from "./obj/guild";
import { user_type, user_model } from "./obj/user";

config();

const mongodb_url = process.env.MONGODB_URL;
connect(mongodb_url!, (err) => {
  if (err) return console.error(err);
  console.log(`mongodb 연결 성공`);
});
const out = {
  module: {
    guild: guild_model,
    user: user_model
  },
  get: {
    guild: guild_get,
    user: user_get
  }
};

export default out;

async function guild_get(msg: M | I | VoiceState | PartialMessage | SelectMenuInteraction) {
  let guildDB: guild_type | null = await guild_model.findOne({ id: msg.guild?.id! });
  if (guildDB) {
    return guildDB;
  } else {
    if (msg.guild?.id) {
      let data = {
        id: msg.guild?.id,
        name: (msg.guild?.name) ? msg.guild.name : '',
        prefix: (process.env.PREFIX) ? process.env.PREFIX : 'm;',
        role: [],
        channelId: '',
        msgId: '',
        playing: false,
        nowplay: {
          title: '',
          author: '',
          duration: '',
          url: '',
          image: '',
          player: ''
        },
        queue: [],
        options: {
          volume: 70,
          player: true,
          listlimit: 300,
          author: false
        }
      };
      const guildDB: guild_type = new guild_model(data);
      await guildDB.save().catch((err: any) => console.error(err));
      return guildDB;
    } else {
      return console.error('guildID를 찾을수 없음');
    }
  }
}

async function user_get(member: MEM) {
  let userDB: user_type | null = await user_model.findOne({ id: member.user.id });
  if (userDB) {
    return userDB;
  } else {
    if (member.user.id) {
      let data = {
        id: member.user.id,
        tag: member.user.tag,
        name: (member.nickname) ? member.nickname : member.user.username,
        canplay: true
      };
      const userDB: user_type = new user_model(data);
      await userDB.save().catch((err: any) => console.error(err));
      return userDB;
    } else {
      return console.error('userID를 찾을수 없음');
    }
  }
}