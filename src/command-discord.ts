import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CacheType, ChatInputCommandInteraction, Client, ComponentType, Guild, User } from "discord.js";
import { CmdUser, deleteCmd, historyCmd, insertCmd, listCmd, myListCmd, refundCmd } from "./command";

const transDiscordUser = (user: User): CmdUser => {
  return {
    id: user.id,
    name: user.displayName
  }
};

const getUserNameWithAllFetch = async (guild: Guild, id: string) => {
  let member = guild.members.cache.get(id);
  if (member === undefined) {
    await guild.members.fetch();
    member = guild.members.cache.get(id);
  }
  return member === undefined ? "(存在しないユーザー)" : member.displayName
};

const getUserNameWithEachFetch = async (guild: Guild, id: string) => {
  let member = guild.members.cache.get(id);
  if (member === undefined) {
    await guild.members.fetch(id);
    member = guild.members.cache.get(id);
  }
  return member === undefined ? "(存在しないユーザー)" : member.displayName
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
  const result = await deleteCmd(
    guildId, 
    index, 
    async (id) => {
      return await getUserNameWithEachFetch(guild, id);
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
  const result = await historyCmd(
    guildId, 
    count, 
    user1 === null ? null : transDiscordUser(user1), 
    user2 === null ? null : transDiscordUser(user2),
    async (id) => {
      return await getUserNameWithAllFetch(guild, id);
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

export const listDiscordCmd = async (
  client: Client<boolean>,
  interaction: ChatInputCommandInteraction<CacheType>
) => {
  // コマンドが実行されたサーバーのIDを取得
  const guildId: string | null = interaction.guildId;
  if (guildId === null) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }

  // ユーザー名取得用
  const guild = await client.guilds.fetch(guildId);

  // list実行
  const result = await listCmd(
    guildId, 
    async (id) => {
      return await getUserNameWithAllFetch(guild, id);
    }
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

export const myListDiscordCmd = async (
  client: Client<boolean>,
  interaction: ChatInputCommandInteraction<CacheType>
) => {
  // コマンドが実行されたサーバーのIDを取得
  const guildId: string | null = interaction.guildId;
  if (guildId === null) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }

  // ユーザー名取得用
  const guild = await client.guilds.fetch(guildId);

  // list実行
  const result = await myListCmd(
    guildId, 
    interaction.user.id,
    async (id) => {
      return await getUserNameWithAllFetch(guild, id);
    }
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

export const refundDiscordCmd = async (
  client: Client<boolean>,
  interaction: ChatInputCommandInteraction<CacheType>
) => {
  // コマンドが実行されたサーバーのIDを取得
  const guildId: string | null = interaction.guildId;
  if (guildId === null) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }

  // コマンドの引数を取得
  const user1: User = interaction.options.getUser("返金するorされる人1", true);
  const user2: User = interaction.options.getUser("返金するorされる人2", true);

  // ボタンの作成
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("do_refund")
      .setLabel("返金する")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("cancel_refund")
      .setLabel("やっぱしない")
      .setStyle(ButtonStyle.Secondary)
  );

  // ユーザー名取得用
  const guild = await client.guilds.fetch(guildId);

  // refundを実行
  const result = await refundCmd(
    guildId,
    transDiscordUser(user1),
    transDiscordUser(user2),
    async (refund) => {
      const response = await interaction.reply({
        content: `<@${refund.from}> から <@${refund.to}> へ ${refund.amount}円 返金しますか？`,
        components: [row],
      });
      try {
        const confirmation = await response.awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id,
          time: 180_000,
          componentType: ComponentType.Button,
        });
        if (confirmation.customId === "do_refund") {
          return true;
        } else {
          await confirmation.update({
            content: "返金処理はキャンセルされました（データ変更なし）。",
            components: [],
          });
          return false;
        }
      } catch (e) {
        await interaction.editReply({
          content: "3分経過したため、返金処理は行われませんでした。",
          components: [],
        });
        return false;
      }
    },
    async (id) => {
      return await getUserNameWithEachFetch(guild, id);
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