import assert from "assert";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path"; // パス結合用にpathモジュールを使用推奨
import { transactionTrans } from "./transaction-trans";

// データを保存するディレクトリを指定
const STORAGE_DIR = "./data";

export type TransactionJson = {
  payer: string;
  participant: string;
  amount: number;
  memo: string;
  date: string
};

export type Transaction = {
  payer: string;
  participant: string;
  amount: number;
  memo: string;
  date: Date
};

// --- 型ガード関数群 (変更なし) ---
const isTransaction = (data: any): data is Transaction => {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.payer === "string" &&
    typeof data.participant === "string" &&
    typeof data.amount === "number" &&
    !Number.isNaN(data.amount) &&
    typeof data.memo === "string" &&
    data.date instanceof Date
  );
}

const isTransactionJson = (data: any): data is TransactionJson => {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.payer === "string" &&
    typeof data.participant === "string" &&
    typeof data.amount === "number" &&
    !Number.isNaN(data.amount) &&
    typeof data.memo === "string" &&
    typeof data.date === "string"
  );
}

const isTransactionJsonArray = (data: any): data is TransactionJson[] => {
  return Array.isArray(data) && data.every((item) => isTransactionJson(item));
}
// ------------------------------

const transactionArrayParse = (data: any): Transaction[] | null => {
  if (isTransactionJsonArray(data)) {
    return data.map((v) => ({
      payer: v.payer,
      participant: v.participant,
      amount: v.amount,
      memo: v.memo,
      date: new Date(v.date),
    }));
  } else {
    // 既存データ等の変換処理
    return transactionTrans(data);
  }
}

// ヘルパー関数: サーバーIDに基づいたファイルパスを生成
const getFilePath = (guildId: string): string => {
  return join(STORAGE_DIR, `${guildId}.json`);
};

// 変更点: 引数に guildId を追加
export const readTransactions = (guildId: string): Transaction[] | null => {
  const filePath = getFilePath(guildId);

  // ファイルが存在しない場合（そのサーバーで初めて使う場合など）は空配列を返す
  if (!existsSync(filePath)) {
    return [];
  }

  const fileContent = readFileSync(filePath, "utf8");
  const transactions = transactionArrayParse(JSON.parse(fileContent));
  
  // パース失敗時の安全策（必要であれば assert のままにするか、空配列を返すか選択）
  // if (transactions === null) {
  //     console.error(`Failed to parse transactions for guild: ${guildId}`);
  //     return [];
  // }
  
  return transactions;
}

// 変更点: 引数に guildId を追加
export const writeTransactions = (guildId: string, transactions: Transaction[]) => {
  // 保存ディレクトリがない場合は作成する
  if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true });
  }

  const filePath = getFilePath(guildId);
  writeFileSync(filePath, JSON.stringify(transactions, undefined, 2));
}