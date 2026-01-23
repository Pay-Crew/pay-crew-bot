import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, CacheType, ChatInputCommandInteraction, Client, Guild, GuildBasedChannel, GuildMember, User } from "discord.js";
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

export const mentionToMember = async (members: GuildMemberGetter, mention: string) => {
  if (mention.charAt(0) === "<" && mention.charAt(1) === "@" && mention.charAt(mention.length - 1) === ">") {
    const t = await members.getUserWithFetch(mention.slice(2, mention.length - 1));
    return t;
  } else {
    return undefined;
  }
};

export const interactiveArg = async (
  interaction: ButtonInteraction<CacheType> & { channel: GuildBasedChannel },
  msg: string,
  buttonName: string
) => {
  const channel = interaction.channel;

  let argInput: string | undefined = undefined;
  buttonSend(interaction, buttonName, { content: msg })
  try {
    const payersCollect = await channel.awaitMessages({
      filter: (msg) => (msg.author.id === interaction.user.id),
      max: 1,
      time: 30000,
      errors: ['time'],
    });
    argInput = payersCollect.first()?.content;
  } catch (e) {
    await interaction.followUp({ content: "時間切れです。\n(コマンドは中断されました。)", ephemeral: true });
    return undefined;
  }

  return argInput;
};

export const ableToInterative = (
  interaction: ChatInputCommandInteraction<CacheType> | ButtonInteraction<CacheType>
): interaction is (ChatInputCommandInteraction<CacheType> | ButtonInteraction<CacheType>) & { channel: GuildBasedChannel } => {
  return interaction.channel !== null && interaction.inGuild();
};

export const msgInButton = (interaction: ButtonInteraction<CacheType>, buttonName: string, msg: string) => {
  return `[ 「**${buttonName}**」を「**${interaction.user.displayName}**」が実行中 ]

${msg}`
}

export const buttonSend = async (interaction: ButtonInteraction<CacheType>, buttonName: string, arg: {content: string, components?: [ActionRowBuilder<ButtonBuilder>], ephemeral?: boolean}) => {
  const sendMsg = msgInButton(interaction, buttonName, arg.content);
  if (interaction.replied) {
    await interaction.followUp({ content: sendMsg, components: arg.components, ephemeral: arg.ephemeral });
  } else {
    await interaction.reply({ content: sendMsg, components: arg.components, ephemeral: arg.ephemeral });
  }
}

export const buttonReplyResult = async (
  interaction: ButtonInteraction<CacheType>,
  result: ResultMsg,
  buttonName: string,
) => {
  if (result.msg === null) {
    return;
  }
  if (result.isOk) {
    await buttonSend(interaction, buttonName, { content: result.msg });
  } else {
    await buttonSend(interaction, buttonName, { content: result.msg, ephemeral: true })
  }
}

export const replyResult = async (
  interaction: ChatInputCommandInteraction<CacheType> | ButtonInteraction<CacheType>,
  result: ResultMsg,
) => {
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
