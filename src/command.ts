// discordなど媒体に依存しない、このアプリの中核部分の処理となるコマンド群

import {
  Transaction,
  readTransactions,
  writeTransactions,
} from "./transaction";
import { dateToString, equalWidthFormat } from "./format";

// コマンドの結果を表す型
// ここで定義されるコマンドは、この型を返す
export class ResultMsgOption<T> {
  private _isOk: boolean;
  private _msg: string | null;
  private _option: T;

  constructor(isOk: boolean, msg: string | null, option: T) {
    this._isOk = isOk;
    this._msg = msg;
    this._option = option;
  }

  public static okMsgOption<T>(option: T, msg?: string) {
    return new ResultMsgOption<T>(
      true, 
      msg === undefined ? null : msg, 
      option,
    )
  }

  public static errMsgOption<T>(option: T, msg?: string) {
    return new ResultMsgOption<T>(
      false, 
      msg === undefined ? null : msg,
      option
    )
  }

  public get isOk(): boolean {
    return this._isOk;
  }

  public get msg(): string | null {
    return this._msg;
  }

  public get option(): T {
    return this._option;
  }
}

// コマンドの結果を表す型(追加の返り値: なし)
export class ResultMsg extends ResultMsgOption<null> {
  constructor(isOk: boolean, msg: string | null) {
    super(isOk, msg, null);
  }

  public static okMsg(msg?: string) {
    return new ResultMsg(
      true, 
      msg === undefined ? null : msg
    )
  }

  public static errMsg(msg?: string) {
    return new ResultMsg(
      false, 
      msg === undefined ? null : msg
    )
  }
}

// 汎用的に(discordなどに依存せずに)ユーザーを表す型
export type CmdUser = {
  id: string,
  name: string
};

// データの追加
export const insertCmd = (
  // グループのid(discordの場合はguildId)
  groupId: string,
  // 追加するデータ
  // participantとpayerが同じデータは、実際には追加されない
  datas: {
    // 建て替えてもらった人
    participant: CmdUser,
    // 実際に払った人
    payer: CmdUser,
    // 金額
    amount: number,
    // タイトル
    title: string,
  }[]
): ResultMsg => {
  // グループのIDからデータを取得
  const transactions: Transaction[] | null = readTransactions(groupId);
  if (transactions === null) {
    console.error(`Error: Failed to parse json file.
\tgorupId: ${groupId}
`);
    return ResultMsg.errMsg("データ読み込みの際にエラーが発生しました。");
  }

  // 追加するデータ一覧
  const newDatas: {
    participant: string,
    payer: string,
    amount: number,
    memo: string,
    date: Date
  }[] = [];

  // 追加するデータの形に変形
  const now = new Date();
  for (const data of datas) {
    // participantとpayerが同じデータは、追加しない
    if (data.participant.id === data.payer.id) {
      continue;
    }
    // 新データ作成・追加
    const newData: Transaction = {
      participant: data.participant.id,
      payer: data.payer.id,
      amount: data.amount,
      memo: data.title,
      date: now
    };
    // 追加したデータ一覧に追加
    newDatas.push(newData);
    // データに追加
    transactions.push(newData);
  }

  // datasの長さが0の場合、すべてのデータでparticipantとpayerが同じ場合
  if (newDatas.length === 0) {
    return ResultMsg.errMsg("追加するデータはありませんでした。")
  }

  // データを書き込み
  writeTransactions(groupId, transactions);

  // コンソールに出力
  console.info(`Info: Succeed in inserting the data below.
\tgroupId: ${groupId}

${
  newDatas
    .map((newData) => (`\tparticipant: ${newData.participant}
\tpayer: ${newData.payer}
\tamount: ${newData.amount}
\tmemo: ${newData.memo}
\tdate: ${newData.date}
`))
    .join("\n")
}
`);

  // メッセージ作成
  const replyText: string = `以下の支払いを追加しました。
${
  datas
    .filter((data) => data.participant.id !== data.payer.id)
    .map((data) => (`\t返金する人: ${data.participant.name}
\t払った人: ${data.payer.name}
\t金額: ${data.amount}
\tタイトル: ${data.title}
`))
    .join("\n")
}
`;
  return ResultMsg.okMsg(replyText);
};

// データの削除(誤入力などを削除するため)
export const deleteCmd = async (
  // グループのid(discordの場合はguildId)
  groupId: string,
  // ユーザー名を取得する関数
  getUserName: (id: string) => Promise<string>,
  // 削除したい支払いのindex(1-indexで算出したもの)
  id: number,
): Promise<ResultMsg> => {
  // グループのIDからデータ取得
  const transactions: Transaction[] | null = readTransactions(groupId);
  if (transactions === null) {
    console.error(`Error: Failed to parse json file.
\tgorupId: ${groupId}
`);
    return ResultMsg.errMsg("データ読み込みの際にエラーが発生しました。")
  }

  // idのバリデーション
  if (id < 1 || transactions.length < id) {
    console.warn(`Warning: The id is out of range.
\tgroupId: ${groupId}
\tid: ${id}
\tlen: ${transactions.length}
`);
    return ResultMsg.errMsg(`ID: ${id} のデータは見つかりませんでした。（1 〜 ${transactions.length} の範囲で指定してください）`);
  }

  // 削除実行
  const deletedItem: Transaction = transactions.splice(id - 1, 1)[0];

  // 削除後のデータを書き込み
  writeTransactions(groupId, transactions);

  // コンソールに出力
  console.info(`Info: Succeed in deleting the data below
\tgroupId: ${groupId}
\tparticipant: ${deletedItem.participant}
\tpayer: ${deletedItem.payer}
\tamount: ${deletedItem.amount}
\tmemo: ${deletedItem.memo}
\tdate: ${deletedItem.date}
`)

  // メッセージ作成
  const replyText: string = `以下の支払いを削除しました。(他の項目のidが変更されている場合があります。)
\t返金する人: ${await getUserName(deletedItem.participant)}
\t払った人: ${await getUserName(deletedItem.payer)}
\t金額: ${deletedItem.amount}
\tタイトル: ${deletedItem.memo}`;
  return ResultMsg.okMsg(replyText);
}

// データの一覧
export const historyCmd = async (
  // グループのid(discordの場合はguildId)
  groupId: string,
  // ユーザー名を取得する関数
  getUserName: (id: string) => Promise<string>,
  // 表示件数
  count: number = 10,
  // 検索したいユーザー1
  user1?: CmdUser | undefined,
  // 検索したいユーザー2
  user2?: CmdUser | undefined,
): Promise<ResultMsg> => {
  // グループのIDからデータを取得
  const transactions: Transaction[] | null = readTransactions(groupId);
  if (transactions === null) {
    console.error(`Error: Failed to parse json file.
\tgorupId: ${groupId}
`);
    return ResultMsg.errMsg("データ読み込みの際にエラーが発生しました。");
  }

  // Userで検索
  type TransactionWithIndex = {i: number, transaction: Transaction};
  const transactionsFiltered: TransactionWithIndex[] = transactions
    // 1つずらしたindexを保持
    .map((transaction, i) => ({ i: i + 1, transaction }))
    .filter(({transaction}) => (
      (user1 === undefined || transaction.payer === user1.id || transaction.participant === user1.id) &&
      (user2 === undefined || transaction.payer === user2.id || transaction.participant === user2.id)
    ));

  // 表示個数
  const showCount: number = transactions.length >= count
    ? count
    : transactions.length;
  
  // コンソールに出力
  console.info(`Info: Succeed in make the historys message.
\tgroupId: ${groupId}
`)

  // メッセージ作成
  // メッセージのヘッダ
  const replyTexts: string[] = [
    `[${
        equalWidthFormat("id", 3, {widthRate: {narrow: 3, wide: 5}})
      }] ${
        equalWidthFormat("件名", 10, {widthRate: {narrow: 3, wide: 5}, cut: true})
      } | ${
        equalWidthFormat("支払った人", 12, {widthRate: {narrow: 3, wide: 5}, cut: true})
      } | ${
        equalWidthFormat("支払われた人", 12, {widthRate: {narrow: 3, wide: 5}, cut: true})
      } | 　${
        equalWidthFormat("金額", 8, {widthRate: {narrow: 3, wide: 5}})
      } | ${
        equalWidthFormat("日付", 19, {widthRate: {narrow: 3, wide: 5}})
      }\n`
  ];
  for (const { i, transaction } of transactionsFiltered
    .reverse()
    .slice(0, showCount)) {
    // idから名前を取得
    const participantName = await getUserName(transaction.participant);
    const payerName = await getUserName(transaction.payer);
    // 日付をstringに変換
    const dateMsg = dateToString(transaction.date);
    // メッセージを一行追加
    replyTexts.push(
      `[${
        equalWidthFormat(`${i}`, 3, {widthRate: {narrow: 3, wide: 5}})
      }] ${
        equalWidthFormat(transaction.memo, 10, {widthRate: {narrow: 3, wide: 5}, cut: true})
      } | ${
        equalWidthFormat(participantName, 12, {widthRate: {narrow: 3, wide: 5}, cut: true})
      } | ${
        equalWidthFormat(payerName, 12, {widthRate: {narrow: 3, wide: 5}, cut: true})
      } | ${
        equalWidthFormat(`${transaction.amount}`, 8, {widthRate: {narrow: 3, wide: 5}})
      }円 | ${dateMsg}\n`
    );
  }
  if (transactionsFiltered.length > showCount) {
    replyTexts.push(`(他${transactionsFiltered.length - showCount}件)`);
  }
  const replyText: string = replyTexts.length === 0 ? "見つかりませんでした" : `\`\`\`\n${replyTexts.join("")}\n\`\`\``;
  return ResultMsg.okMsg(replyText);
};

export type Refund = { from: string; to: string; amount: number };

// 合算した一覧
// 簡易相殺版
const getRefundList = (guildId: string): Refund[] | null => {
  // データの取得
  const transactions: Transaction[] | null = readTransactions(guildId);
  if (transactions === null) {
    return null;
  }

  // participantIdとpayerIdからrefundsMap用のkeyを生成する関数
  const getKey = (participantId: string, payerId: string): string => {
    return `${participantId}>${payerId}`
  }

  // 支払いの向きを区別して集約
  const refundsMap: Map<string, {amount: number, counted: boolean}> = new Map<string, {amount: number, counted: boolean}>();
  for (const transaction of transactions) {
    const mapAmount = refundsMap.get(getKey(transaction.participant, transaction.payer))?.amount;
    refundsMap.set(
      getKey(transaction.participant, transaction.payer),
      {amount: transaction.amount + (mapAmount === undefined ? 0 : mapAmount), counted: false},
    )
  }

  // 2つの方向を相殺しながらArrayにする
  const refunds: Refund[] = [];
  for (const [key, {amount, counted}] of refundsMap) {
    // keyからparticipantIdとpayerIdを取得、逆向きの支払いのkeyを取得
    const [participantId, payerId]: string[] = key.split(">");
    const reverseKey: string = getKey(payerId, participantId);
    
    // 逆向きをすでに処理していたら飛ばす
    if (counted) {
      continue;
    }

    // 逆向きの支払いの金額を取得、相殺
    const reverseData: {amount: number, counted: boolean} | undefined = refundsMap.get(reverseKey);
    if (reverseData === undefined) {
      refunds.push({
        from: participantId,
        to: payerId,
        amount: amount
      });
    } else {
      reverseData.counted = true;
      if (reverseData.amount < amount) {
        refunds.push({
          from: participantId,
          to: payerId,
          amount: amount - reverseData.amount
        });
      } else if (reverseData.amount === amount) {
        // nothing
      } else {
        refunds.push({
          from: payerId,
          to: participantId,
          amount: reverseData.amount - amount
        });
      }
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
  // 絞り込むユーザー
  user?: string | undefined,
): Promise<ResultMsg> => {
  // グループのIDから返金を算出
  const refunds: Refund[] | null = getRefundList(groupId);
  if (refunds === null) {
    console.error(`Error: Failed to parse json file.
\tgorupId: ${groupId}
`);
    return ResultMsg.errMsg("データ読み込みの際にエラーが発生しました。");
  }

  // コンソールに出力
  console.info(`Info: Succeed in make the list message.
\tgroupId: ${groupId}
`)

  // メッセージ作成
  const replyTexts: string[] = [];
  for (const { from, to, amount } of refunds) {
    if (user !== undefined && from !== user && to !== user) {
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
  return ResultMsg.okMsg(replyText);
};

// 精算
export const refundCmd = async (
  // グループのid(discordの場合はguildId)
  groupId: string, 
  // 精算するかどうかの確認をする関数
  ask: (refund: Refund) => Promise<boolean>,
  // 精算するユーザー1
  user1: CmdUser,
  // 精算するユーザー2
  user2: CmdUser,
): Promise<ResultMsg> => {
  // グループのIDから返金を算出
  const refunds: Refund[] | null = getRefundList(groupId);
  if (refunds == null) {
    console.error(`Error: Failed to parse json file.
\tgorupId: ${groupId}
`);
    return ResultMsg.errMsg("データ読み込みの際にエラーが発生しました。");
  }

  // 該当するペアのデータを参照
  let user1IsFromUser = true;
  let targetRefund: Refund | undefined = refunds.find((r) => (r.from === user1.id && r.to === user2.id));
  if (targetRefund === undefined) {
    user1IsFromUser = false;
    targetRefund = refunds.find((r) => (r.from === user2.id && r.to === user1.id));
    if (targetRefund === undefined || targetRefund.amount === 0) {
      console.info(`Info: There is no refund.
  \tgorupId: ${groupId}
  `);
      return ResultMsg.errMsg("該当する返金データが見つかりませんでした。");
    }
  }
  const {from, to, amount}: Refund = targetRefund;

  // 実際に返金するかの返信を待機
  const askResult = await ask(targetRefund);
  if (!askResult) {
    console.info(`Info: Canceled the refund.
\tgorupId: ${groupId}
`);
    return ResultMsg.errMsg();
  }

  // グループのIDからデータを取得
  const transactions = readTransactions(groupId);
  if (transactions === null) {
    console.error(`Error: Failed to parse json file.
\tgorupId: ${groupId}
`);
    return ResultMsg.errMsg("データ読み込みの際にエラーが発生しました。");
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

  // コンソールに出力
  console.info(`Info: Succeed in refunding.
\tgorupId: ${groupId}
`);

  // メッセージ作成
  return ResultMsg.okMsg(`返金を記録しました：${
    user1IsFromUser ? user1.name : user2.name
  } ---> ${
    user1IsFromUser ? user2.name : user1.name
  } (${
    amount
  }円)`)
};