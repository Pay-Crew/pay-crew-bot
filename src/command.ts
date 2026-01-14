import { CacheType, ChatInputCommandInteraction, Client, User } from "discord.js";
import {
  Transaction,
  readTransactions,
  writeTransactions,
} from "./transaction";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { dateToString, equalWidthFormat } from "./format";

export type ResultMsg = {
  // 成功したかどうか
  isOk: boolean,
  // メッセージ
  msg: string | null
};

const okMsg = (msg: string) => {
  return {
    isOk: true,
    msg
  }
}

const errMsg = (msg: string) => {
  return {
    isOk: false,
    msg
  }
}

export type CmdUser = {
  id: string,
  name: string
};

export const insertCmd = (
  groupId: string,
  participant: CmdUser,
  payer: CmdUser,
  amount: number,
  title: string,
): ResultMsg => {
  // グループのIDからデータを取得
  const transactions: Transaction[] | null = readTransactions(groupId);
  if (transactions === null) {
    return errMsg("データ読み込みの際にエラーが発生しました。");
  }

  // 新データ作成・追加
  const newData: Transaction = {
    participant: participant.id,
    payer: payer.id,
    amount,
    memo: title,
    date: new Date()
  };
  transactions.push(newData);

  // データを書き込み
  writeTransactions(groupId, transactions);

  // メッセージ作成
  const replyText: string = `以下の支払いを追加しました。\n\t返金する人: ${
    participant.name
  }\n\t払った人: ${
    payer.name
  }\n\t金額: ${
    amount
  }\n\tタイトル: ${
    title
  }`;
  return okMsg(replyText);
};

export const deleteCmd = (
  groupId: string,
  index: number,
  getUserName: (id: string) => string
): ResultMsg => {
  // グループのIDからデータ取得
  const transactions: Transaction[] | null = readTransactions(groupId);
  if (transactions === null) {
    return okMsg("データ読み込みの際にエラーが発生しました。")
  }

  // indexのバリデーション
  if (index < 1 || transactions.length < index) {
    return errMsg(`ID: ${index} のデータは見つかりませんでした。（1 〜 ${transactions.length} の範囲で指定してください）`);
  }

  // 削除実行
  const deletedItem: Transaction = transactions.splice(index - 1, 1)[0];

  // 削除後のデータを書き込み
  writeTransactions(groupId, transactions);

  // メッセージ作成
  const replyText: string = `以下の支払いを削除しました。\n\t返金する人: ${
    getUserName(deletedItem.participant)
  }\n\t払った人: ${
    getUserName(deletedItem.payer)
  }\n\t金額: ${
    deletedItem.amount
  }\n\tタイトル: ${
    deletedItem.memo
  }`;
  return okMsg(replyText);
}

export const historyCmd = (
  groupId: string,
  count: number | null,
  user1: CmdUser | null,
  user2: CmdUser | null,
  getUserName: (id: string) => string
) => {
  // データ取得
  const transactions: Transaction[] | null = readTransactions(groupId);
  if (transactions === null) {
    return errMsg("データ読み込みの際にエラーが発生しました。");
  }

  // 引数の受け取り
  const countNonNullable: number = count === null ? 10 : count;

  // Userで検索
  type TransactionWithIndex = {i: number, transaction: Transaction};
  const transactionsFiltered: TransactionWithIndex[] = transactions
    // 1つずらしたindexを保持
    .map((transaction, i) => ({ i: i + 1, transaction }))
    .filter(({i, transaction}) => (
      (user1 === null || transaction.payer === user1.id || transaction.participant === user1.id) &&
      (user2 === null || transaction.payer === user2.id || transaction.participant === user2.id)
    ));

  // 表示個数
  const showCount: number = transactions.length >= countNonNullable
    ? countNonNullable
    : transactions.length;

  // メッセージ作成
  const replyTexts: string[] = [];
  for (const { i, transaction } of transactionsFiltered
    .reverse()
    .slice(0, showCount)) {
    // idからmemberを取得
    const participantName = getUserName(transaction.participant);
    const payerName = getUserName(transaction.payer);
    // 日付をstringに変換
    const dateMsg = dateToString(transaction.date);
    // メッセージを一行追加
    replyTexts.push(
      `[${i}] ${
        equalWidthFormat(transaction.memo, 20, {widthRate: {narrow: 3, wide: 5}, cut: true})
      }: ${
        equalWidthFormat(participantName, 15, {widthRate: {narrow: 3, wide: 5}, cut: true})
      } は ${
        equalWidthFormat(payerName, 15, {widthRate: {narrow: 3, wide: 5}, cut: true})
      } に ${
        equalWidthFormat(`${transaction.amount}`, 8, {widthRate: {narrow: 3, wide: 5}})
      }円 払ってもらった(${dateMsg})\n`
    );
  }
  if (transactions.length > showCount) {
    replyTexts.push(`(他${transactions.length - showCount}件)`);
  }
  const replyText: string = replyTexts.length === 0 ? "見つかりませんでした" : `\`\`\`\n${replyTexts.join("")}\n\`\`\``;
  return okMsg(replyText);
};

type Refund = { from: string; to: string; amount: number };

// ★変更: 引数で guildId を受け取るように変更
const getRefundList = (guildId: string): Refund[] | null => {
  // ★変更
  const transactions: Transaction[] | null = readTransactions(guildId);

  if (transactions === null) {
    return null;
  }

  const memberAmounts: Map<string, number> = new Map<string, number>();
  for (const transaction of transactions) {
    const payerAmount = memberAmounts.get(transaction.payer);
    memberAmounts.set(
      transaction.payer,
      (payerAmount === undefined ? 0 : payerAmount) + transaction.amount
    );

    const participantAmount = memberAmounts.get(transaction.participant);
    memberAmounts.set(
      transaction.participant,
      (participantAmount === undefined ? 0 : participantAmount) -
        transaction.amount
    );
  }

  type MemberAmount = { member: string; amount: number };
  const positiveMembers: MemberAmount[] = [];
  const negativeMembers: MemberAmount[] = [];
  memberAmounts.forEach((v, k) => {
    if (v > 0) {
      positiveMembers.push({ member: k, amount: v });
    } else if (v < 0) {
      negativeMembers.push({ member: k, amount: v });
    }
  });
  positiveMembers.sort((a, b) => b.amount - a.amount);
  negativeMembers.sort((a, b) => b.amount - a.amount);

  const refunds: Refund[] = [];
  let pIndex = 0;
  let nIndex = 0;
  while (pIndex < positiveMembers.length && nIndex < negativeMembers.length) {
    if (positiveMembers[pIndex].amount >= -negativeMembers[nIndex].amount) {
      refunds.push({
        from: negativeMembers[nIndex].member,
        to: positiveMembers[pIndex].member,
        amount: -negativeMembers[nIndex].amount,
      });
      positiveMembers[pIndex].amount -= negativeMembers[nIndex].amount;
      negativeMembers[nIndex].amount = 0;
      nIndex += 1;
    } else {
      refunds.push({
        from: negativeMembers[nIndex].member,
        to: positiveMembers[pIndex].member,
        amount: positiveMembers[pIndex].amount,
      });
      positiveMembers[pIndex].amount = 0;
      negativeMembers[nIndex].amount -= positiveMembers[pIndex].amount;
      pIndex += 1;
    }
  }
  return refunds;
};

export const listCmd = async (
  client: Client<boolean>,
  interaction: ChatInputCommandInteraction<CacheType>
) => {
  // ★追加
  const guildId = interaction.guildId;
  if (!guildId) return;

  // ★変更: 引数を渡す
  const refunds: Refund[] | null = getRefundList(guildId);

  if (refunds === null) {
    await interaction.reply("データ読み込みの際にエラーが発生しました。");
    return;
  }

  // ★変更
  const guild = await client.guilds.fetch(guildId);

  const replyTexts: string[] = [];
  for (const { from, to, amount } of refunds) {
    const fromMember = guild.members.cache.get(from);
    const toMember = guild.members.cache.get(to);
    replyTexts.push(
      `${
        fromMember === undefined ? "(存在しないユーザー)" : fromMember.displayName
      } ---- ${
        amount
      }円 ---> ${
        toMember === undefined ? "(存在しないユーザー)" : toMember.displayName
      }\n`
    );
  }
  const replyText = replyTexts.length === 0 ? "現在、支払いは存在しません" : `現在残っている返金は以下のとおりです\n\`\`\`\n${replyTexts.join("")}\n\`\`\``;
  await interaction.reply({
    content: replyText,
  });
};

export const refundCmd = async (
  client: Client<boolean>,
  interaction: ChatInputCommandInteraction<CacheType>
) => {
  // ★追加
  const guildId = interaction.guildId;
  if (!guildId) return;

  const user1 = interaction.options.getUser("返金するorされる人1", true).id;
  const user2 = interaction.options.getUser("返金するorされる人2", true).id;

  // 2. 現在の清算リストを取得
  // ★変更: 引数を渡す
  const refunds: Refund[] | null = getRefundList(guildId);

  if (refunds == null) {
    await interaction.reply("データ読み込みの際にエラーが発生しました。");
    return;
  }

  // 3. 該当するペアのデータを参照
  const targetRefund = refunds.find(
    (r) => (r.from === user1 && r.to === user2) || (r.from === user2 && r.to === user1)
  );

  if (!targetRefund) {
    await interaction.reply({
      content: "該当する返金データが見つかりませんでした。",
      ephemeral: true,
    });
    return;
  }

  const refundmanId = targetRefund.from;
  const paymentmanId = targetRefund.to;
  const refundAmount = targetRefund.amount;

  // 4. ボタンの作成
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

  const response = await interaction.reply({
    content: `<@${refundmanId}> から <@${paymentmanId}> へ ${refundAmount}円 返金しますか？`,
    components: [row],
  });

  // 5. 3分間の入力待機
  try {
    const confirmation = await response.awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id,
      time: 180_000,
      componentType: ComponentType.Button,
    });

    if (confirmation.customId === "do_refund") {
      // 6. 返金実行
      // ★変更: guildIdを渡す
      const transactions = readTransactions(guildId);
      if (transactions === null) {
        await interaction.reply("データ読み込みの際にエラーが発生しました。");
        return;
      }
      const refundData: Transaction = {
        participant: paymentmanId,
        payer: refundmanId,
        amount: refundAmount,
        memo: "(返金処理による自動入力)",
        date: new Date()
      };
      transactions.push(refundData);
      
      // ★変更: guildIdを渡す
      writeTransactions(guildId, transactions);

      await confirmation.update({
        content: `✅ 返金を記録しました：<@${refundmanId}> ➡️ <@${paymentmanId}> (${refundAmount}円)`,
        components: [],
      });
    } else {
      await confirmation.update({
        content: "返金処理はキャンセルされました（データ変更なし）。",
        components: [],
      });
    }
  } catch (e) {
    await interaction.editReply({
      content: "3分経過したため、返金処理は行われませんでした。",
      components: [],
    });
  }
};