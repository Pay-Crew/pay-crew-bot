// コマンドの処理(discordに依存しない部分)
import {
  Transaction,
  readTransactions,
  writeTransactions,
} from "./transaction";
import { dateToString, equalWidthFormat } from "./format";

export type ResultMsg = {
  // 処理が成功したかどうか
  isOk: boolean,
  // メッセージ
  msg: string | null
};

const okMsg = (msg?: string) => {
  return {
    isOk: true,
    msg: msg === undefined ? null : msg
  }
}

const errMsg = (msg?: string) => {
  return {
    isOk: false,
    msg: msg === undefined ? null : msg
  }
}

export type CmdUser = {
  id: string,
  name: string
};

// データの追加
export const insertCmd = (
  // グループのid(discordの場合はguildId)
  groupId: string,
  // 建て替えてもらった人
  participant: CmdUser,
  // 実際に払った人
  payer: CmdUser,
  // 金額
  amount: number,
  // タイトル
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

// データの削除(誤入力などを削除するため)
export const deleteCmd = async (
  // グループのid(discordの場合はguildId)
  groupId: string,
  // 削除したい支払いのindex(1-indexで算出したもの)
  index: number,
  // ユーザー名を取得する関数
  getUserName: (id: string) => Promise<string>
): Promise<ResultMsg> => {
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
    await getUserName(deletedItem.participant)
  }\n\t払った人: ${
    await getUserName(deletedItem.payer)
  }\n\t金額: ${
    deletedItem.amount
  }\n\tタイトル: ${
    deletedItem.memo
  }`;
  return okMsg(replyText);
}

// データの一覧
export const historyCmd = async (
  // グループのid(discordの場合はguildId)
  groupId: string,
  // 表示件数
  count: number | null,
  // 検索したいユーザー1
  user1: CmdUser | null,
  // 検索したいユーザー2
  user2: CmdUser | null,
  // ユーザー名を取得する関数
  getUserName: (id: string) => Promise<string>
): Promise<ResultMsg> => {
  // グループのIDからデータを取得
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
    const participantName = await getUserName(transaction.participant);
    const payerName = await getUserName(transaction.payer);
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

// // ★変更: 引数で guildId を受け取るように変更
// const getRefundList = (guildId: string): Refund[] | null => {
//   // ★変更
//   const transactions: Transaction[] | null = readTransactions(guildId);

//   if (transactions === null) {
//     return null;
//   }

//   const memberAmounts: Map<string, number> = new Map<string, number>();
//   for (const transaction of transactions) {
//     const payerAmount = memberAmounts.get(transaction.payer);
//     memberAmounts.set(
//       transaction.payer,
//       (payerAmount === undefined ? 0 : payerAmount) + transaction.amount
//     );

//     const participantAmount = memberAmounts.get(transaction.participant);
//     memberAmounts.set(
//       transaction.participant,
//       (participantAmount === undefined ? 0 : participantAmount) -
//         transaction.amount
//     );
//   }

//   type MemberAmount = { member: string; amount: number };
//   const positiveMembers: MemberAmount[] = [];
//   const negativeMembers: MemberAmount[] = [];
//   memberAmounts.forEach((v, k) => {
//     if (v > 0) {
//       positiveMembers.push({ member: k, amount: v });
//     } else if (v < 0) {
//       negativeMembers.push({ member: k, amount: v });
//     }
//   });
//   positiveMembers.sort((a, b) => b.amount - a.amount);
//   negativeMembers.sort((a, b) => b.amount - a.amount);

//   const refunds: Refund[] = [];
//   let pIndex = 0;
//   let nIndex = 0;
//   while (pIndex < positiveMembers.length && nIndex < negativeMembers.length) {
//     if (positiveMembers[pIndex].amount >= -negativeMembers[nIndex].amount) {
//       refunds.push({
//         from: negativeMembers[nIndex].member,
//         to: positiveMembers[pIndex].member,
//         amount: -negativeMembers[nIndex].amount,
//       });
//       positiveMembers[pIndex].amount -= negativeMembers[nIndex].amount;
//       negativeMembers[nIndex].amount = 0;
//       nIndex += 1;
//     } else {
//       refunds.push({
//         from: negativeMembers[nIndex].member,
//         to: positiveMembers[pIndex].member,
//         amount: positiveMembers[pIndex].amount,
//       });
//       positiveMembers[pIndex].amount = 0;
//       negativeMembers[nIndex].amount -= positiveMembers[pIndex].amount;
//       pIndex += 1;
//     }
//   }
//   return refunds;
// };

// 簡易相殺版
const getRefundList = (guildId: string): Refund[] | null => {
  // データの取得
  const transactions: Transaction[] | null = readTransactions(guildId);
  if (transactions === null) {
    return null;
  }

  // participantIdとpayerIdからrefundsMap用のkeyを生成
  const getKey = (participantId: string, payerId: string): string => {
    return `${participantId}>${payerId}`
  }

  // 有向グラフとして集約
  const refundsMap: Map<string, number> = new Map<string, number>();
  for (const transaction of transactions) {
    const tmpAmount = refundsMap.get(getKey(transaction.participant, transaction.payer));
    refundsMap.set(
      getKey(transaction.participant, transaction.payer),
      transaction.amount + (tmpAmount === undefined ? 0 : tmpAmount)
    )
  }

  // 2つの方向を相殺しながらArrayにする
  const refundsAlready: Set<string> = new Set();
  const refunds: Refund[] = [];
  for (const [key, amount] of refundsMap) {
    // keyからparticipantIdとpayerIdを取得、逆向きの支払いのkeyを取得
    const [participantId, payerId]: string[] = key.split(">");
    const reverseKey: string = getKey(participantId, payerId);
    
    // 逆向きをすでに処理していたら飛ばす
    if (refundsAlready.has(reverseKey)) {
      continue;
    }
    refundsAlready.add(key);

    // 逆向きの支払いの金額を取得、相殺
    const reverseAmount: number | undefined = refundsMap.get(reverseKey);
    if (reverseAmount === undefined || amount > reverseAmount) {
      refunds.push({
        from: participantId,
        to: payerId,
        amount: amount - (reverseAmount === undefined ? 0 : reverseAmount)
      });
    } else {
      refunds.push({
        from: payerId,
        to: participantId,
        amount: reverseAmount - amount
      });
    }
  }
  return refunds;
};

// 合算済み支払いの一覧
export const listCmd = async (
  // グループのid(discordの場合はguildId)
  groupId: string,
  // ユーザー名を取得する関数
  getUserName: (id: string) => Promise<string>,
) => {
  // グループのIDから返金を算出
  const refunds: Refund[] | null = getRefundList(groupId);
  if (refunds === null) {
    return errMsg("データ読み込みの際にエラーが発生しました。");
  }

  const replyTexts: string[] = [];
  for (const { from, to, amount } of refunds) {
    const fromMember: string = await getUserName(from);
    const toMember: string = await getUserName(to);
    replyTexts.push(
      `${
        fromMember
      } ---- ${
        amount
      }円 ---> ${ 
        toMember
      }\n`
    );
  }
  const replyText = replyTexts.length === 0 ? "現在、支払いは存在しません" : `現在残っている返金は以下のとおりです\n\`\`\`\n${replyTexts.join("")}\n\`\`\``;
  return okMsg(replyText);
};

// 自分が関係する合算済み支払いの一覧
export const myListCmd = async (
  // グループのid(discordの場合はguildId)
  groupId: string,
  // 自分(このコマンドを実行した人)
  user: string,
  // ユーザー名を取得する関数
  getUserName: (id: string) => Promise<string>,
) => {
  // グループのIDから返金を算出
  const refunds: Refund[] | null = getRefundList(groupId);
  if (refunds === null) {
    return errMsg("データ読み込みの際にエラーが発生しました。");
  }

  const replyTexts: string[] = [];
  for (const { from, to, amount } of refunds) {
    if (from !== user && to !== user) {
      continue;
    }
    const fromMember: string = await getUserName(from);
    const toMember: string = await getUserName(to);
    replyTexts.push(
      `${
        fromMember
      } ---- ${
        amount
      }円 ---> ${ 
        toMember
      }\n`
    );
  }
  const replyText = replyTexts.length === 0 ? "現在、支払いは存在しません" : `現在残っている返金は以下のとおりです\n\`\`\`\n${replyTexts.join("")}\n\`\`\``;
  return okMsg(replyText);
};

// 精算
export const refundCmd = async (
  // グループのid(discordの場合はguildId)
  groupId: string, 
  // 精算するユーザー1
  user1: CmdUser,
  // 精算するユーザー2
  user2: CmdUser,
  // 生産するかどうかの確認をする関数
  ask: (refund: Refund) => Promise<boolean>,
  // ユーザー名を取得する関数
  getUserName: (id: string) => Promise<string>,
) => {
  // グループのIDから返金を算出
  const refunds: Refund[] | null = getRefundList(groupId);
  if (refunds == null) {
    return errMsg("データ読み込みの際にエラーが発生しました。");
  }

  // 該当するペアのデータを参照
  const targetRefund: Refund | undefined = refunds.find((r) => (r.from === user1.id && r.to === user2.id) || (r.from === user2.id && r.to === user1.id));
  if (targetRefund === undefined) {
    return errMsg("該当する返金データが見つかりませんでした。");
  }
  const {from, to, amount}: Refund = targetRefund;

  // 待機
  const askResult = await ask(targetRefund);
  if (!askResult) {
    return errMsg();
  }

  // グループのIDからデータを取得
  const transactions = readTransactions(groupId);
  if (transactions === null) {
    return errMsg("データ読み込みの際にエラーが発生しました。");
  }

  // データ追加
  const refundData: Transaction = {
    participant: to,
    payer: from,
    amount: amount,
    memo: "(返金処理による自動入力)",
    date: new Date()
  };
  transactions.push(refundData);
  
  // 書き込み
  writeTransactions(groupId, transactions);

  return okMsg(`返金を記録しました：${
    await getUserName(from)
  } ---> ${
    await getUserName(to)
  } (${
    amount
  }円)`)
};