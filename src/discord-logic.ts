import { ButtonInteraction, CacheType, ChatInputCommandInteraction, Guild, GuildMember, User } from "discord.js";
import { type CmdUser, type ResultMsg } from "./command";

export const replyResult = async (interaction: ChatInputCommandInteraction<CacheType> | ButtonInteraction<CacheType>, result: ResultMsg) => {
  if (result.msg === null) {
    return;
  }
  const sendMethod = interaction.replied ? interaction.followUp : interaction.reply;
  if (result.isOk) {
    await sendMethod.bind(interaction, result.msg)();
  } else {
    await sendMethod.bind(interaction, { content: result.msg, ephemeral: true })()
  }
}

export const transDiscordUser = (user: User | GuildMember): CmdUser => {
  return {
    id: user.id,
    name: user.displayName
  }
};

export const getUserWithAllFetch = async (guild: Guild, id: string) => {
  let member = guild.members.cache.get(id);
  if (member === undefined) {
    await guild.members.fetch();
    member = guild.members.cache.get(id);
  }
  return member
};

export const getUserNameWithAllFetch = async (guild: Guild, id: string) => {
  const member = await getUserWithAllFetch(guild, id);
  return member === undefined ? "(存在しないユーザー)" : member.displayName;
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