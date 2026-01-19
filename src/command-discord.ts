import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, ChatInputCommandInteraction, Client, ComponentType, Guild, GuildBasedChannel, GuildMember, Interaction, LabelBuilder, ModalBuilder, PartialDMChannel, TextBasedChannel, TextChannel, TextInputBuilder, TextInputStyle, User } from "discord.js";
import { deleteCmd, historyCmd, insertCmd, listCmd, myListCmd, refundCmd } from "./command";
import { getUserNameWithAllFetch, getUserNameWithEachFetch, getUserWithEachFetch, transDiscordUser } from "./discord-logic";

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
    [{
      participant: transDiscordUser(participant),
      payer: transDiscordUser(payer),
      amount,
      title: title === null ? "(No Title)" : title
    }]
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
    getUserNameWithEachFetch.bind({}, guild),
    index, 
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
    getUserNameWithAllFetch.bind({}, guild),
    count === null ? undefined : count, 
    user1 === null ? undefined : transDiscordUser(user1), 
    user2 === null ? undefined : transDiscordUser(user2),
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
    getUserNameWithAllFetch.bind({}, guild),
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
    getUserNameWithAllFetch.bind({}, guild),
    interaction.user.id,
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
      .setCustomId("__innerDoRefund")
      .setLabel("返金する")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("__innerCancelRefund")
      .setLabel("やっぱしない")
      .setStyle(ButtonStyle.Secondary)
  );

  // ユーザー名取得用
  const guild = await client.guilds.fetch(guildId);

  const confirmation: {buttonInteration: ButtonInteraction<CacheType> | undefined} = {buttonInteration: undefined};

  // refundを実行
  const result = await refundCmd(
    guildId,
    async (refund) => {
      const response = await interaction.reply({
        content: `<@${refund.from}> から <@${refund.to}> へ ${refund.amount}円 返金しますか？`,
        components: [row],
      });
      try {
        confirmation.buttonInteration = await response.awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id,
          time: 180000,
          componentType: ComponentType.Button,
        });
      } catch (e) {
        await interaction.editReply({
          content: "3分経過したため、返金処理は行われませんでした。",
          components: [],
        });
        return false;
      }
      if (confirmation.buttonInteration.customId === "__innerDoRefund") {
        return true;
      } else {
        await confirmation.buttonInteration.update({
          content: "返金処理はキャンセルされました（データ変更なし）。",
          components: [],
        });
        return false;
      }
    },
    getUserNameWithAllFetch.bind({}, guild),
    transDiscordUser(user1),
    transDiscordUser(user2),
  )


  // メッセージ送信
  if (result.msg === null) {
    return;
  } else {
    if (confirmation.buttonInteration !== undefined) {
      await confirmation.buttonInteration.update({ content: result.msg, components: [] });
    } else if (!interaction.replied) {
      if (result.isOk) {
        await interaction.reply({ content: result.msg });
      } else {
        await interaction.reply({ content: result.msg, ephemeral: true });
      }
    }
  }
};

const help = (commandName: string | null) => {
  const commandList: string[] = [
    "insert",
    "delete",
    "list",
    "my-list",
    "refund",
    "help"
  ];
  const helps: Map<string, string> = new Map([
    ["insert", `支払いを追加します。誰かが誰かの支払いを建て替えた時や、誰かが全員分のまとめ払をした時などに実行してください。
支払いのタイトルを追加することもできます。
例)Aさんの1000円分の支払いをBさんが建て替えた場合、
  支払った人 -> Bさん
  返金する人 -> Aさん
  金額 -> 1000
としてコマンドを実行してください。`], 
    ["delete", `支払いを削除します。誤入力のときに使用してください。
実行する際には、あらかじめhistoryコマンドを実行し、削除したい支払いの先頭に表示されている番号をこのコマンドに与えてください。
支払いを精算する際には、このコマンドではなく、refundコマンドを使用してください。
例)historyコマンドの結果が、
\`\`\`
[2]           (No Title):           User1 は           User2 に      100円 払ってもらった(2026-01-01 00:00:00)
[1]           (No Title):           User2 は           User3 に     1000円 払ってもらった(2026-01-01 00:00:00)
\`\`\`
で、一番上の支払いを削除したい時、
  id -> 2
としてコマンドを実行してください。`], 
    ["list", `支払いを合算して、一覧を表示します。
ユーザーの間の支払を相殺して、一つにまとめて表示します。支払いが存在しないユーザー間では何も表示されません。`], 
    ["my-list", `自分が関係する支払いの一覧を表示します。
ユーザーの間の支払を相殺して、一つにまとめて、自分が関係あるものを表示します。`], 
    ["refund", `指定のユーザー間の支払いを精算します。ユーザーの間で支払いを精算できるときに実行してください。
指定したユーザーの間の支払を相殺して、金額を表示します。その金額の精算が可能なら、「返金する」ボタンを押してください。
返金した場合、自動的に支払いが追加され、historyコマンドから確認できるようになります。`], 
    ["help", `コマンドのヘルプを表示します。このコマンドです。
コマンド名を入力して特定のコマンドのヘルプを見ることもできます。`], 
  ]);
  if (commandName === null) {
    return commandList.map((v) => `${v}コマンド\n\t${helps.get(v)!.split("\n").join("\n\t")}`).join("\n\n");
  } else {
    const description = helps.get(commandName);
    if (description === undefined) {
      return "現在、この名前のコマンドは存在しません。";
    } else {
      return description;
    }
  }
};

export const helpDiscordCmd = async (
  client: Client<boolean>,
  interaction: ChatInputCommandInteraction<CacheType>
) => {
  const commandName = interaction.options.getString("コマンド名");

  const result = help(commandName);
  await interaction.reply({ content: result, ephemeral: true })
}

export const buttonDiscordCmd = async (
  client: Client<boolean>,
  interaction: ChatInputCommandInteraction<CacheType>
) => {
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("insert")
      .setLabel("支払いの追加")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("delete")
      .setLabel("支払いの削除")
      .setStyle(ButtonStyle.Success),
  );
  await interaction.reply({
    content: "操作ボタン",
    components: [buttons],
  });
}

const mentionToMember = async (guild: Guild, mention: string) => {
  if (mention.charAt(0) === "<" && mention.charAt(1) === "@" && mention.charAt(mention.length - 1) === ">") {
    return await getUserWithEachFetch(guild, mention.slice(2, mention.length - 1));
  } else {

  }
}

const interactiveArg = async (
  interaction: ButtonInteraction<CacheType> & { channel: GuildBasedChannel },
  msg: string
) => {
  const channel = interaction.channel;

  let argInput: string | undefined = undefined;
  await interaction.reply({ content: msg });
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
}

const ableToInterative = (interaction: ButtonInteraction<CacheType>): interaction is ButtonInteraction<CacheType> & { channel: GuildBasedChannel } => {
  return interaction.channel !== null && interaction.inGuild();
}

export const insertDiscordInteractiveCmd = async (
  client: Client<boolean>,
  interaction: ButtonInteraction<CacheType>
) => {
  // intaractionがユーザーの入力待ちができるか判定
  if (!ableToInterative(interaction)) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }
  const channel = interaction.channel;
  
  // コマンドが実行されたサーバーのIDを取得
  const guildId: string | null = interaction.guildId;
  if (guildId === null) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }

  // ユーザー名取得用
  const guild = await client.guilds.fetch(guildId);

  // 支払った人の入力
  const participantInput: string | undefined = await interactiveArg(interaction, "今回、**実際に支払った人**を、メンションで入力してください。\n(@に続けて、Discordのユーザー名を入力してください)");
  if (participantInput === undefined) {
    await interaction.followUp({ content: "入力を受け取れませんでした。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }
  // サーバーのメンバーか判定
  const participantMember = await mentionToMember(guild, participantInput);
  if (participantMember === undefined) {
    await interaction.followUp({ content: "存在するユーザーをメンション形式で1人入力してください。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }

  // 支払ってもらった人の入力
  const payersInput: string | undefined = await interactiveArg(interaction, "今回、**建て替えを受けた人**を、メンションで入力してください。複数人入力できます。\n(@に続けて、Discordのユーザー名を入力してください。)");
  if (payersInput === undefined) {
    await interaction.followUp({ content: "入力を受け取れませんでした。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }
  // 一人分に分割して、メンバーか判定
  const payersInputSplited: string[] = payersInput?.replace(/\s+/g, "").split(">").slice(0, -1);
  const payerMembers: GuildMember[] = [];
  for (const payer of payersInputSplited) {
    const member = await mentionToMember(guild, `${payer}>`);
    if (member === undefined) {
      await interaction.followUp({ content: "存在するユーザーをメンション形式で入力してください。\n(コマンドは中断されました。)", ephemeral: true });
      return;
    } else {
      payerMembers.push(member);
    }
  }

  // 金額を入力
  const amountInput: string | undefined = await interactiveArg(interaction, "**金額**を入力してください。");
  if (amountInput === undefined) {
    await interaction.followUp({ content: "入力を受け取れませんでした。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }
  // 数字に変換
  const amount = parseInt(amountInput);
  if (Number.isNaN(amount)) {
    await interaction.followUp({ content: "数字のみ入力してください。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }

  // タイトルを入力
  const memo: string | undefined = await interactiveArg(interaction, "**件名**を入力してください。");
  if (memo === undefined) {
    await interaction.followUp({ content: "入力してください。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }

  // insert実行
  const result = insertCmd(
    guildId,
    payerMembers.map((payer) => ({
      participant: transDiscordUser(participantMember),
      payer: transDiscordUser(payer),
      amount: amount,
      title: memo
    }))
  );

  // メッセージ送信
  if (result.msg === null) {
    return;
  }
  if (result.isOk) {
    await interaction.followUp(result.msg);
  } else {
    await interaction.followUp({ content: result.msg, ephemeral: true })
  }
}

export const deleteDiscordInteractiveCmd = async (
  client: Client<boolean>,
  interaction: ButtonInteraction<CacheType>
) => {
  // intaractionがユーザーの入力待ちができるか判定
  if (!ableToInterative(interaction)) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }
  const channel = interaction.channel;
  
  // コマンドが実行されたサーバーのIDを取得
  const guildId: string | null = interaction.guildId;
  if (guildId === null) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }

  const guild = await client.guilds.fetch(guildId)

  const historyResult = await historyCmd(guildId, getUserNameWithAllFetch.bind({}, guild))
  if (!historyResult.isOk) {
    if (historyResult.msg !== null) {
      await interaction.reply({ content: historyResult.msg });
    }
    return;
  }

  const indexInput: string | undefined = await interactiveArg(interaction, `${historyResult.msg}
削除したい項目の先頭の番号を入力してください。
キャンセルしたい場合はCを入力してください。`);
  if (indexInput === undefined) {
    await interaction.followUp({ content: "入力を受け取れませんでした。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }

  const index = parseInt(indexInput);
  if (Number.isNaN(index)) {
    await interaction.followUp({ content: "数字のみ入力してください。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }

  const result = await deleteCmd(guildId, getUserNameWithEachFetch.bind({}, guild), index);

  // メッセージ送信
  if (result.msg === null) {
    return;
  }
  if (result.isOk) {
    await interaction.followUp(result.msg);
  } else {
    await interaction.followUp({ content: result.msg, ephemeral: true })
  }
}

export const testDiscordCmd = async (
  client: Client<boolean>,
  interaction: ChatInputCommandInteraction<CacheType>
) => {

};
