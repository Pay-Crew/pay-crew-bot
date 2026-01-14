import { CacheType, ChatInputCommandInteraction, Client, User } from "discord.js";
import { CmdUser, deleteCmd, historyCmd, insertCmd } from "./command";

const transDiscordUser = (user: User): CmdUser => {
  return {
    id: user.id,
    name: user.displayName
  }
};

export const insertDiscordCmd = async (
  client: Client<boolean>,
  interaction: ChatInputCommandInteraction<CacheType>
) => {
  // コマンドが実行されたサーバーのIDを取得
  const guildId: string | null = interaction.guildId;
  if (guildId === null) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }

  // コマンド引数の受け取り
  const participant: User = interaction.options.getUser("返金する人", true);
  const payer: User = interaction.options.getUser("支払った人", true);
  const amount: number = interaction.options.getInteger("金額", true);
  const title: string | null = interaction.options.getString("件名");

  // insert実行
  const result = insertCmd(
    guildId,
    transDiscordUser(participant),
    transDiscordUser(payer),
    amount,
    title === null ? "(No Title)" : title
  );

  // メッセージ送信
  if (result.msg === null) {
    return;
  }
  if (result.isOk) {
    await interaction.reply(result.msg);
  } else {
    await interaction.reply({ content: result.msg, ephemeral: true })
  }
};

export const deleteDiscordCmd = async (
  client: Client<boolean>,
  interaction: ChatInputCommandInteraction<CacheType>
) => {
  // コマンドが実行されたサーバーのIDを取得
  const guildId: string | null = interaction.guildId;
  if (guildId === null) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }

  // 引数の受け取り
  const index: number = interaction.options.getInteger("id", true);

  // メンバー名取得用に用意
  const guild = await client.guilds.fetch(guildId);

  // delete実行
  const result = deleteCmd(guildId, index, (id) => {
    const member = guild.members.cache.get(id);
    return member === undefined ? "(存在しないユーザー)" : member.displayName
  })

  // メッセージ送信
  if (result.msg === null) {
    return;
  }
  if (result.isOk) {
    await interaction.reply(result.msg);
  } else {
    await interaction.reply({ content: result.msg, ephemeral: true })
  }
};

export const historyDiscordCmd = async (
  client: Client<boolean>,
  interaction: ChatInputCommandInteraction<CacheType>
) => {

  // コマンドが実行されたサーバーのIDを取得
  const guildId: string | null = interaction.guildId;
  if (guildId === null) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }

  // 引数の受け取り
  const count: number | null = interaction.options.getInteger("個数");
  const user1 = interaction.options.getUser("検索するユーザー1");
  const user2 = interaction.options.getUser("検索するユーザー2");

  // ユーザー名取得用
  const guild = await client.guilds.fetch(guildId);

  // history実行
  const result = historyCmd(
    guildId, 
    count, 
    user1 === null ? null : transDiscordUser(user1), 
    user2 === null ? null : transDiscordUser(user2),
    (id) => {
      const member = guild.members.cache.get(id);
      return member === undefined ? "(存在しないユーザー)" : member.displayName
    }
  )

  // メッセージ送信
  if (result.msg === null) {
    return;
  }
  if (result.isOk) {
    await interaction.reply(result.msg);
  } else {
    await interaction.reply({ content: result.msg, ephemeral: true })
  }
};