import { ButtonInteraction, CacheType, ChatInputCommandInteraction, Client, Guild, GuildMember, User } from "discord.js";
import { type CmdUser, type ResultMsg } from "./command";

export class GuildMemberGetter {
  private guild: Guild;
  private fetched: boolean = false;

  constructor(guild: Guild) {
    this.guild = guild;
  }

  public static async fromGuildId(client: Client, guildId: string) {
    return new GuildMemberGetter(await client.guilds.fetch(guildId));
  }

  public async getUserWithFetch(id: string) {
    const member = this.guild.members.cache.get(id);
    if (!this.fetched && member === undefined) {
      try {
        await this.guild.members.fetch();
      } catch (e) {
        console.log("Waring: GatewayRateLimitError\n");
      }
      this.fetched = true;
      return this.guild.members.cache.get(id);
    } else {
      return member
    }
  };

  public async getUserNameWithFetch(id: string) {
    const member = await this.getUserWithFetch(id);
    return member === undefined ? "(存在しないユーザー)" : member.displayName;
  };
}

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
