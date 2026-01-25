import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, ChatInputCommandInteraction, Client, ComponentType, EmbedBuilder, GuildMember, User, UserSelectMenuBuilder, UserSelectMenuInteraction } from "discord.js";
import { deleteCmd, historyCmd, insertCmd, listCmd, Refund, refundCmd } from "./command";
import { ableToInterative, buttonReplyResult, buttonSend, GuildMemberGetter, interactiveArg, mentionToMember, msgInButton, replyResult, transDiscordUser } from "./discord-logic";

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
  replyResult(interaction, result)
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

  // ユーザー名取得用
  const members = await GuildMemberGetter.fromGuildId(client, guildId);

  // delete実行
  const result = await deleteCmd(
    guildId, 
    members.getUserNameWithFetch.bind(members),
    index, 
  )

  // メッセージ送信
  replyResult(interaction, result);
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
  const members = await GuildMemberGetter.fromGuildId(client, guildId);

  // history実行
  const result = await historyCmd(
    guildId,
    members.getUserNameWithFetch.bind(members),
    count === null ? undefined : count, 
    user1 === null ? undefined : transDiscordUser(user1), 
    user2 === null ? undefined : transDiscordUser(user2),
  )

  // メッセージ送信
  replyResult(interaction, result);
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
  const members = await GuildMemberGetter.fromGuildId(client, guildId);

  // list実行
  const result = await listCmd(
    guildId,
    members.getUserNameWithFetch.bind(members),
  );

  // メッセージ送信
  replyResult(interaction, result);
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
  const members = await GuildMemberGetter.fromGuildId(client, guildId);

  // list実行
  const result = await listCmd(
    guildId,
    members.getUserNameWithFetch.bind(members),
    interaction.user.id,
  );

  // メッセージ送信
  replyResult(interaction, result);
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
  // ボタンを更新するための値を持つ
  const confirmation: {buttonInteration: ButtonInteraction<CacheType> | undefined} = {buttonInteration: undefined};
  // ボタン操作を待つ関数
  const waitButtonAction = async (refund: Refund) => {
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
  };

  // refundを実行
  const result = await refundCmd(
    guildId,
    waitButtonAction,
    transDiscordUser(user1),
    transDiscordUser(user2),
  )


  // メッセージ送信
  if (result.msg !== null && confirmation.buttonInteration !== undefined) {
    await confirmation.buttonInteration.update({ content: result.msg, components: [] });
  } else {
    replyResult(interaction, result);
  }
};

type Help = {
  description: string,
  detail: string,
}

const getHelp = (commandName: string | null) => {
  const commandList: string[] = [
    "button",
    "insert",
    "delete",
    "list",
    "my-list",
    "refund",
    "help",
  ];
  const helps: Map<string, Help> = new Map([
    ["insert", {
      description: `支払いを追加します。`,
      detail: `\t誰かが誰かの支払いを建て替えた時や、誰かが全員分のまとめ払をした時などに実行してください。
\t支払いのタイトルを追加することもできます。
\t例)Aさんの1000円分の支払いを、Bさんが建て替えた場合、
\t\t支払った人 -> Bさん(メンション)
\t\t返金する人 -> Aさん(メンション)
\t\t金額 -> 1000
\tとしてコマンドを実行してください。`,
    }], 
    ["delete", {
      description: `支払いを削除します。`,
      detail: `\t誤入力のときに使用してください。
\t実行する際には、あらかじめhistoryコマンドを実行し、削除したい支払いの先頭に表示されている番号をこのコマンドに与えてください。
\t支払いを精算する際には、このコマンドではなく、refundコマンドを使用してください。
\t例)historyコマンドの結果が、
\`\`\`
[ id] 　     件名 | 　  支払った人 |   支払われた人 | 　　   金額 | 　              日付
[  2]       test |        user1 |        user2 |     1000円 | 2026-01-23 15:32:54
[  1] (No Title) |        user2 |        user1 |      200円 | 2026-01-23 15:31:58
\`\`\`
\tで、一番上の支払いを削除したい時、
\t\tid -> 2
\tとしてコマンドを実行してください。`
    }], 
    ["list", {
      description: `支払いを合算して、一覧を表示します。`,
      detail: `\tユーザーの間の支払を相殺して、一つにまとめて表示します。支払いが存在しないユーザー間では何も表示されません。`
    }], 
    ["my-list", {
      description: `自分が関係する支払いの一覧を表示します。`,
      detail: `\tユーザーの間の支払を相殺して、一つにまとめて、自分が関係あるものを表示します。`
    }], 
    ["refund", {
      description: `指定のユーザー間の支払いを精算します。`,
      detail: `\tユーザーの間で支払いを精算できるときに実行してください。
\t指定したユーザーの間の支払を相殺して、金額を表示します。その金額の精算が可能なら、「返金する」ボタンを押してください。
\t返金した場合、自動的に支払いが追加され、historyコマンドから確認できるようになります。`
    }], 
    ["button", {
      description: `このBotの機能を、メッセージの送信で操作可能なボタンを表示します。`,
      detail :`\tコマンド操作に不慣れな方がいる場合は、ピン止めしておくと便利です。`
    }], 
    ["help", {
      description: `コマンドのヘルプを表示します。コマンド名を入力して特定のコマンドのヘルプを見ることもできます。`, 
      detail: ``
    }], 
  ]);
  if (commandName === null) {
    return commandList.map((commandName) => {
      const cmdHelp = helps.get(commandName);
      return `${commandName}コマンド: ${cmdHelp === undefined ? "現在、ヘルプ情報がありません。" : cmdHelp.description}`
    }).join("\n\n");
  } else {
    const cmdHelpTmp = helps.get(commandName);
    const cmdHelp = (cmdHelpTmp === undefined && commandName.charAt(0) === "/") ? helps.get(commandName.slice(1, commandName.length)) : cmdHelpTmp;
    if (cmdHelp === undefined) {
      return "現在、ヘルプ情報がありません。";
    } else {
      return `${commandName}コマンド: ${cmdHelp === undefined ? "現在、ヘルプ情報がありません。" : cmdHelp.description}
${cmdHelp.detail}
`;
    }
  }
};

export const helpDiscordCmd = async (
  client: Client<boolean>,
  interaction: ChatInputCommandInteraction<CacheType>
) => {
  const commandName = interaction.options.getString("コマンド名");

  const result = getHelp(commandName);
  await interaction.reply({ content: result })
};

export const buttonDiscordCmd = async (
  client: Client<boolean>,
  interaction: ChatInputCommandInteraction<CacheType>
) => {
  const embed = new EmbedBuilder()
    .setTitle('機能メニュー')
    .setDescription('以下のボタンから操作を選択してください。')
    .addFields(
      { name: '支払いの追加', value: '支払いを追加します。', inline: false },
      { name: '支払いの一覧表示', value: 'これまで追加された支払いを一覧表示します', inline: false },
      { name: '合算した自分の支払いの一覧表示', value: '自分が関係する、合算された支払いを表示します。', inline: false },
      { name: '精算', value: '2人の間で支払いを精算します。', inline: false },
    )
    .setColor(0x0099ff);
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("insert")
      .setLabel("支払いの追加")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("history")
      .setLabel("支払いの一覧表示")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("my-list")
      .setLabel("合算した自分の支払いの一覧表示")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("refund")
      .setLabel("精算")
      .setStyle(ButtonStyle.Success),
  );
  await interaction.reply({
    embeds: [embed],
    components: [buttons]
  })
};

export const insertDiscordInteractiveCmd = async (
  client: Client<boolean>,
  interaction: ButtonInteraction<CacheType>
) => {
  // intaractionがユーザーの入力待ちができるか判定
  if (!ableToInterative(interaction)) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }
  
  // コマンドが実行されたサーバーのIDを取得
  const guildId: string | null = interaction.guildId;
  if (guildId === null) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }

  // ユーザー名取得用
  const members = await GuildMemberGetter.fromGuildId(client, guildId);

  const buttonName = "支払いの追加";
  const interactiveArgThis = async (msg: string) => {
    return await await interactiveArg(interaction, msg, buttonName);
  }

  // 支払った人の入力
  const payerInput: string | undefined = await interactiveArgThis("今回、**実際に支払った人**を、メンションで入力してください。(@に続けて、Discordのユーザー名を入力してください)");
  if (payerInput === undefined) {
    await interaction.followUp({ content: "入力を受け取れませんでした。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }
  // サーバーのメンバーか判定
  const payerMember = await mentionToMember(members, payerInput);
  if (payerMember === undefined) {
    await interaction.followUp({ content: "存在するユーザーをメンション形式で1人入力してください。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }

  // 支払ってもらった人の入力
  // const participantsInput: string | undefined = await interactiveArgThis("今回、**支払いを受けた人**を、メンションで入力してください。複数人入力できます。\n払った人を割り勘に加える場合は、払った人も入力してください。\n(@に続けて、Discordのユーザー名を入力してください。)");
  // if (participantsInput === undefined) {
  //   await interaction.followUp({ content: "入力を受け取れませんでした。\n(コマンドは中断されました。)", ephemeral: true });
  //   return;
  // }
  // // 一人分に分割して、メンバーか判定
  // const participantsInputSplited: string[] = participantsInput?.replace(/\s+/g, "").split(">").slice(0, -1);
  // if (participantsInputSplited.length === 0) {
  //   await interaction.followUp({ content: "存在するユーザーをメンション形式で1人入力してください。\n(コマンドは中断されました。)", ephemeral: true });
  //   return;
  // }
  // const participantMembers: GuildMember[] = [];
  // for (const payer of participantsInputSplited) {
  //   const member = await mentionToMember(members, `${payer}>`);
  //   if (member === undefined) {
  //     await interaction.followUp({ content: "存在するユーザーをメンション形式で入力してください。\n(コマンドは中断されました。)", ephemeral: true });
  //     return;
  //   } else {
  //     participantMembers.push(member);
  //   }
  // }
  // プルダウンに変更
  const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId('users')
      .setPlaceholder('対象のメンバーを選んでください。')
      .setMinValues(1)
      .setMaxValues(10)
  );
  const response = await buttonSend(
    interaction,
    buttonName,
    {
      content: "今回、**支払いを受けた人**を、メンションで入力してください。複数人入力できます。\n払った人を割り勘に加える場合は、払った人も入力してください。",
      components: [row]
    }
  );
  let selectInteraction: UserSelectMenuInteraction<CacheType>;
  try {
    selectInteraction = await response.awaitMessageComponent({
      filter: (msg) => msg.user.id === interaction.user.id,
      time: 180000,
      componentType: ComponentType.UserSelect
    });
  } catch (e) {
    await interaction.followUp({ content: "時間切れです。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }
  const participantMembers = selectInteraction.users.map((v) => v);
  await selectInteraction.update({
    content: `以下のユーザーが選択されました。
${participantMembers.map((v) => v.displayName).join(", ")}`,
    components: []
  })

  // モードを入力
  const splitModeInput: string | undefined = participantMembers.length === 1 ? "1" : await interactiveArgThis("割り勘の対象となる金額を入力する場合「**わ**」を、一人あたりの金額を入力する場合は「**1**」を入力してください。");
  if (splitModeInput === undefined) {
    await interaction.followUp({ content: "入力を受け取れませんでした。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }
  // 判定
  const splitMode = ["わ", "わりかん", "割り勘", "w", "wa", "warikan", "warikann"].includes(splitModeInput) ? true : false;

  // 金額を入力
  const amountInput: string | undefined = await interactiveArgThis(`${splitMode ? "割り勘の対象となる" : "一人あたりの"}**金額**を入力してください。`);
  if (amountInput === undefined) {
    await interaction.followUp({ content: "入力を受け取れませんでした。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }
  // 数字に変換
  const amount = splitMode ? Math.floor(parseInt(amountInput) / participantMembers.length) : parseInt(amountInput);
  if (Number.isNaN(amount)) {
    await interaction.followUp({ content: "数字のみ入力してください。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }

  // タイトルを入力
  const memo: string | undefined = await interactiveArgThis("**件名**を入力してください。");
  if (memo === undefined) {
    await interaction.followUp({ content: "入力してください。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }

  // insert実行
  const result = insertCmd(
    guildId,
    participantMembers.map((participant) => ({
      participant: transDiscordUser(participant),
      payer: transDiscordUser(payerMember),
      amount: amount,
      title: memo
    }))
  );

  // メッセージ送信
  await buttonReplyResult(interaction, result, buttonName);
};

export const deleteDiscordInteractiveCmd = async (
  client: Client<boolean>,
  interaction: ButtonInteraction<CacheType>
) => {
  // intaractionがユーザーの入力待ちができるか判定
  if (!ableToInterative(interaction)) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }
  
  // コマンドが実行されたサーバーのIDを取得
  const guildId: string | null = interaction.guildId;
  if (guildId === null) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }

  const members = await GuildMemberGetter.fromGuildId(client, guildId);

  const historyResult = await historyCmd(guildId, members.getUserNameWithFetch.bind(members))
  if (!historyResult.isOk) {
    if (historyResult.msg !== null) {
      await interaction.reply({ content: historyResult.msg });
    }
    return;
  }
  
  const buttonName = "支払いの削除";
  const interactiveArgThis = async (msg: string) => {
    return await await interactiveArg(interaction, msg, buttonName);
  }

  const indexInput: string | undefined = await interactiveArgThis(`${historyResult.msg}
削除したい項目の先頭の番号を入力してください。
キャンセルしたい場合はCを入力してください。`);
  if (indexInput === undefined) {
    await interaction.followUp({ content: "入力を受け取れませんでした。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  } else if (indexInput === "C") {
    await interaction.followUp({ content: "キャンセルしました。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }

  const index = parseInt(indexInput);
  if (Number.isNaN(index)) {
    await interaction.followUp({ content: "数字のみ入力してください。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }

  const result = await deleteCmd(guildId, members.getUserNameWithFetch.bind(members), index);

  // メッセージ送信
  await buttonReplyResult(interaction, result, buttonName);
};

export const historyDiscordInteractiveCmd = async (
  client: Client<boolean>,
  interaction: ButtonInteraction<CacheType>
) => {
  // コマンドが実行されたサーバーのIDを取得
  const guildId: string | null = interaction.guildId;
  if (guildId === null) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }
  
  const buttonName = "支払いの一覧表示";

  // ユーザー名取得用
  const members = await GuildMemberGetter.fromGuildId(client, guildId);

  // history実行
  const result = await historyCmd(
    guildId, 
    members.getUserNameWithFetch.bind(members)
  )

  // メッセージ送信
  await buttonReplyResult(interaction, result, buttonName)
};

export const listDiscordInteractiveCmd = async (
  client: Client<boolean>,
  interaction: ButtonInteraction<CacheType>
) => {
  // コマンドが実行されたサーバーのIDを取得
  const guildId: string | null = interaction.guildId;
  if (guildId === null) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }

  const buttonName = "合算した支払いの一覧表示";

  // ユーザー名取得用
  const members = await GuildMemberGetter.fromGuildId(client, guildId);

  // list実行
  const result = await listCmd(
    guildId, 
    members.getUserNameWithFetch.bind(members),
  );

  // メッセージ送信
  await buttonReplyResult(interaction, result, buttonName);
};

export const myListDiscordInteractiveCmd = async (
  client: Client<boolean>,
  interaction: ButtonInteraction<CacheType>
) => {
  // コマンドが実行されたサーバーのIDを取得
  const guildId: string | null = interaction.guildId;
  if (guildId === null) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }

  const buttonName = "合算した自分の支払いの一覧表示";

  // ユーザー名取得用
  const members = await GuildMemberGetter.fromGuildId(client, guildId);

  // list実行
  const result = await listCmd(
    guildId, 
    members.getUserNameWithFetch.bind(members),
    interaction.user.id,
  );

  // メッセージ送信
  await buttonReplyResult(interaction, result, buttonName);
};

export const refundDiscordInteractiveCmd = async (
  client: Client<boolean>,
  interaction: ButtonInteraction<CacheType>
) => {
  // intaractionがユーザーの入力待ちができるか判定
  if (!ableToInterative(interaction)) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }

  // コマンドが実行されたサーバーのIDを取得
  const guildId: string | null = interaction.guildId;
  if (guildId === null) {
    await interaction.reply({ content: "このコマンドはサーバー内でのみ使用可能です。", ephemeral: true });
    return;
  }

  // ユーザー名取得用
  const members = await GuildMemberGetter.fromGuildId(client, guildId);

  const buttonName = "精算";
  const interactiveArgThis = async (msg: string) => {
    return await await interactiveArg(interaction, msg, buttonName);
  }

  // 引数を取得
  const usersInput: string | undefined = await interactiveArgThis("精算に関わる人を**2人**、メンションで入力してください。\n(@に続けて、Discordのユーザー名を入力してください")
  // const user1: User = interaction.options.getUser("返金するorされる人1", true);
  // const user2: User = interaction.options.getUser("返金するorされる人2", true);
  if (usersInput === undefined) {
    await interaction.followUp({ content: "入力を受け取れませんでした。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }
  const usersInputSplited = usersInput.replace(/\s+/g, "").split(">").slice(0, -1);
  if (usersInputSplited.length !== 2) {
    await interaction.followUp({ content: "ユーザーを2人入力してください。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }
  const user1: GuildMember | undefined = await mentionToMember(members, `${usersInputSplited[0]}>`);
  const user2: GuildMember | undefined = await mentionToMember(members, `${usersInputSplited[1]}>`);
  if (user1 === undefined || user2 === undefined) {
    await interaction.followUp({ content: "ユーザーを2人入力してください。\n(コマンドは中断されました。)", ephemeral: true });
    return;
  }

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
  // ボタンを更新するための値を持つ
  const confirmation: {buttonInteration: ButtonInteraction<CacheType> | undefined} = {buttonInteration: undefined};
  // ボタン操作を待つ関数
  const waitButtonAction = async (refund: Refund) => {
    const send = interaction.replied ? interaction.followUp : interaction.reply;
    const response = await send.bind(interaction, {
      content: msgInButton(interaction, buttonName, `<@${refund.from}> から <@${refund.to}> へ ${refund.amount}円 返金しますか？`),
      components: [row],
    })();
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
  };

  // refundを実行
  const result = await refundCmd(
    guildId,
    waitButtonAction,
    transDiscordUser(user1),
    transDiscordUser(user2),
  )


  // メッセージ送信
  if (result.msg !== null && confirmation.buttonInteration !== undefined) {
    const msgWithHeader = msgInButton(interaction, buttonName, result.msg);
    await confirmation.buttonInteration.update({ content: msgWithHeader, components: [] });
  } else {
    await buttonReplyResult(interaction, result, buttonName);
  }
};

export const helpDiscordInteractiveCmd = async (
  client: Client<boolean>,
  interaction: ButtonInteraction<CacheType>
) => {
  const buttonName = "ヘルプ"
  const result = getHelp(null);
  await buttonSend(interaction, buttonName, { content: result })
};

export const testDiscordCmd = async (
  client: Client<boolean>,
  interaction: ChatInputCommandInteraction<CacheType>
) => {

};
