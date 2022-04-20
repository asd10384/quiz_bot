import "dotenv/config";
import { I, M, MEM } from "../aliases/discord.js";
import { connect } from "mongoose";
import { Guild, GuildMember, PartialMessage, SelectMenuInteraction, VoiceState } from "discord.js";
import { guild_type, guild_model } from "./obj/guild";
import { user_type, user_model } from "./obj/user";

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

async function guild_get(guild: Guild) {
  let guildDB: guild_type | null = await guild_model.findOne({ id: guild.id });
  if (guildDB) {
    if (guildDB.name !== guild.name) guildDB.name = (guild.name) ? guild.name : "";
    return guildDB;
  } else {
    await guild_model.findOneAndDelete({ id: guild.id }).catch((err) => {});
    if (guild.id) {
      const guildDB: guild_type = new guild_model({});
      guildDB.id = guild.id;
      guildDB.name = guild.name;
      await guildDB.save().catch((err) => console.error(err));
      return guildDB;
    } else {
      return console.error('guildID를 찾을수 없음');
    }
  }
}

async function user_get(member: MEM) {
  let userDB: user_type | null = await user_model.findOne({ id: member.user.id });
  if (userDB) {
    if (userDB.nickname !== (member.nickname ? member.nickname : member.user.username)) userDB.nickname = member.nickname ? member.nickname : member.user.username;
    return userDB;
  } else {
    await user_model.findOneAndDelete({ id: member.user.id }).catch((err) => {});
    if (member.user.id) {
      const userDB: user_type = new user_model({});
      userDB.id = member.user.id;
      userDB.tag = member.user.tag;
      userDB.nickname = (member.nickname) ? member.nickname : member.user.username;
      await userDB.save().catch((err) => console.error(err));
      return userDB;
    } else {
      return console.error('userID를 찾을수 없음');
    }
  }
}