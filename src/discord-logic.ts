import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, CacheType, ChatInputCommandInteraction, Client, GatewayRateLimitError, Guild, GuildBasedChannel, GuildMember, InteractionReplyOptions, InteractionResponse, Message, User, UserSelectMenuBuilder } from "discord.js";
import { type CmdUser, type ResultMsg } from "./command";

// idからメンバーの詳細を取得する関数を提供する
// インスタンス一つに付き、fetchは最大1回しか行われない
export class GuildMemberGetter {
  private guild: Guild;
  private fetched: boolean = false;

  // メンバーの所属するサーバーを与えて構成
  constructor(guild: Guild) {
    this.guild = guild;
  }

  // clientとギルドidから構成
  public static async fromGuildId(client: Client, guildId: string): Promise<GuildMemberGetter> {
    return new GuildMemberGetter(await client.guilds.fetch(guildId));
  }

  // メンバーの詳細を取得するメソッド
  // fetchを行いすぎると起こるGatewayRateLimitErrorを抑制するため、メンバーの取得はこれを介する
  public async getUserWithFetch(id: string): Promise<GuildMember | undefined> {
    // キャッシュから取得
    const member = this.guild.members.cache.get(id);
    // キャッシュに存在すれば、それを返す
    if (member !== undefined) {
      return member;
    };
    // fetch済なら、存在しないメンバーとみなし、undefinedを返す
    if (this.fetched) {
      return undefined;
    };
    // キャッシュに存在せず、未fetchならfetchする
    try {
      await this.guild.members.fetch();
    } catch (e) {
      // GatewayRateLimitErrorだけは捕まえる
      if (e instanceof GatewayRateLimitError) {
      console.warn(`Waring: GatewayRateLimitError
\tguildId: ${this.guild.id}
`);
      } else {
        throw e;
      }
    };
    // fetch済とする
    this.fetched = true;
    return this.guild.members.cache.get(id);
  };

  // メンバー名を取得するメソッド
  // 存在しないメンバーなら、"(存在しないユーザー)"を返す
  public async getUserNameWithFetch(id: string): Promise<string> {
    const member = await this.getUserWithFetch(id);
    return member === undefined ? "(存在しないユーザー)" : member.displayName;
  };
}

// メンションの形式のstringからメンバーを取得
// メンションの形式とは、「<@${id}>」の形を表す
// メンションの形式でなければundefinedを返す
export const mentionToMember = async (members: GuildMemberGetter, mention: string): Promise<GuildMember | undefined> => {
  // メンションの形式か判定
  if (mention.charAt(0) === "<" && mention.charAt(1) === "@" && mention.charAt(mention.length - 1) === ">") {
    // id部分からメンバーを取得
    const t = await members.getUserWithFetch(mention.slice(2, mention.length - 1));
    return t;
  } else {
    // メンションの形式でないならundefinedを返す
    return undefined;
  }
};

// discord.jsのUser型やGuildMember型からcommand.tsのCmdUser型に変換する
export const transDiscordUser = (user: User | GuildMember): CmdUser => {
  return {
    id: user.id,
    name: user.displayName
  }
};

// インタラクティブに入力を取得する関数
// interactionにbuttonNameを与えた時のみ、buttonNameが必要
export const interactiveArg: {
  (interaction: ChatInputCommandInteraction<CacheType> & { channel: GuildBasedChannel }, msg: string): Promise<string | undefined>;
  (interaction: ButtonInteraction<CacheType> & { channel: GuildBasedChannel }, msg: string, buttonName: string): Promise<string | undefined>;
} = async (
  interaction: (ChatInputCommandInteraction<CacheType> | ButtonInteraction<CacheType>) & { channel: GuildBasedChannel },
  msg: string,
  buttonName?: string,
): Promise<string | undefined> => {
  // チャンネルを取得
  const channel = interaction.channel;

  // 送信
  if (interaction instanceof ChatInputCommandInteraction) {
    await cbSend(interaction, { content: msg })
  } else {
    if (buttonName === undefined) {
      console.warn("Warning: If interaction is ButtonInteraction, buttonName is required.");
    }
    await cbSend(interaction, { content: msg }, buttonName === undefined ? "(未定義)" : buttonName);
  }
  const payersCollect = await channel.awaitMessages({
    filter: (msg) => (msg.author.id === interaction.user.id),
    max: 1,
    time: 30000,
    errors: ['time'],
  })
    .then((v) => v)
    .catch((_) => undefined);
  if (payersCollect === undefined) {
    await interaction.followUp({ content: "時間切れです。\n(コマンドは中断されました。)", ephemeral: true });
    return undefined;
  }
  return payersCollect.first()?.content;
};

// インタラクティブに入力を取得できるかを判定する型ガード
export const ableToInterative = (
  interaction: ChatInputCommandInteraction<CacheType> | ButtonInteraction<CacheType>
): interaction is (ChatInputCommandInteraction<CacheType> | ButtonInteraction<CacheType>) & { channel: GuildBasedChannel } => {
  return interaction.channel !== null && interaction.inGuild();
};

// ボタンにおけるメッセージで、ボタン名や実行ユーザーアドを表示するためにメッセージにヘッダを追加する関数
const msgInButton = (
  interaction: ButtonInteraction<CacheType>, 
  msg: string, 
  buttonName: string
): string => {
  return `[ 「**${buttonName}**」を「**${interaction.user.displayName}**」が実行中 ]

${msg}`
}

// コマンドやボタンで、メッセージを送る関数
// 一回目はreply、二回目以降はfollowUpを呼ぶ
// ボタンにおけるメッセージではヘッダを付与する
export const cbSend: {
  (interaction: ChatInputCommandInteraction<CacheType>, arg: InteractionReplyOptions & { content: string }): Promise<InteractionResponse<boolean> | Message<boolean>>;
  (interaction: ButtonInteraction<CacheType>, arg: InteractionReplyOptions & { content: string }, buttonName: string): Promise<InteractionResponse<boolean> | Message<boolean>>;
} = async (
  interaction: ChatInputCommandInteraction<CacheType> | ButtonInteraction<CacheType>, 
  arg: InteractionReplyOptions & { content: string }, 
  buttonName?: string
): Promise<InteractionResponse<boolean> | Message<boolean>> => {
  // 関数オーバーロードに反する呼び出しをチェック
  if (interaction instanceof ButtonInteraction && buttonName === undefined) {
    console.warn("Warning: If interaction is ButtonInteraction, buttonName is required.");
  }
  // ボタンにおけるメッセージにヘッダを付与
  const sendMsg: string = interaction instanceof ChatInputCommandInteraction ? arg.content : msgInButton(interaction, arg.content, buttonName === undefined ? "(未定義)" : buttonName);
  // interactionにとって1度目の呼び出しなのか判定
  if (interaction.replied) {
    return await interaction.followUp({ content: sendMsg, components: arg.components, ephemeral: arg.ephemeral });
  } else {
    return await interaction.reply({ content: sendMsg, components: arg.components, ephemeral: arg.ephemeral });
  }
};

// コマンドやボタンで、メッセージを送る関数
// 一回目はreply、二回目以降はfollowUpを呼ぶ
// ボタンにおけるメッセージではヘッダを付与する
export const cbReplyResult: {
  (interaction: ChatInputCommandInteraction<CacheType>, result: ResultMsg): Promise<InteractionResponse<boolean> | Message<boolean> | null>;
  (interaction: ButtonInteraction<CacheType>, result: ResultMsg, buttonName: string): Promise<InteractionResponse<boolean> | Message<boolean> | null>;
} = async (
  interaction: ChatInputCommandInteraction<CacheType> | ButtonInteraction<CacheType>, 
  result: ResultMsg,
  buttonName?: string,
): Promise<InteractionResponse<boolean> | Message<boolean> | null> => {
  // 関数オーバーロードに反する呼び出しをチェック
  if (interaction instanceof ButtonInteraction && buttonName === undefined) {
    console.warn("Warning: If interaction is ButtonInteraction, buttonName is required.");
  }
  // メッセージが何もない場合は何もしない
  if (result.msg === null) {
    return null;
  }
  // cbSendを呼ぶ
  if (interaction instanceof ChatInputCommandInteraction) {
    return await cbSend(interaction, { content: result.msg, ephemeral: result.isOk ? false : true });
  } else {
    return await cbSend(interaction, { content: result.msg, ephemeral: result.isOk ? false : true }, buttonName === undefined ? "(未定義)" : buttonName);
  }
}