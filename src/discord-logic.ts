import { Guild, GuildMember, User } from "discord.js";
import { CmdUser } from "./command";

export const transDiscordUser = (user: User | GuildMember): CmdUser => {
  return {
    id: user.id,
    name: user.displayName
  }
};

export const getUserNameWithAllFetch = async (guild: Guild, id: string) => {
  let member = guild.members.cache.get(id);
  if (member === undefined) {
    await guild.members.fetch();
    member = guild.members.cache.get(id);
  }
  return member === undefined ? "(存在しないユーザー)" : member.displayName
};

export const getUserWithEachFetch = async (guild: Guild, id: string) => {
  let member = guild.members.cache.get(id);
  if (member === undefined) {
    try {
      await guild.members.fetch(id);
    } catch (e) {
      console.log(`Warning: No such user does not exsit.
\tguildId: ${guild.id}
\tid: ${id}
`)
    }
    member = guild.members.cache.get(id);
  }
  return member
};

export const getUserNameWithEachFetch = async (guild: Guild, id: string) => {
  const member = await getUserWithEachFetch(guild, id);
  return member === undefined ? "(存在しないユーザー)" : member.displayName;
};