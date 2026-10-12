// IndexedDB persistence: question banks + per-bank answer state.
// Everything (answers, history, banks) survives page refreshes and browser restarts.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { BankRecord } from './types'

interface McqDB extends DBSchema {
  banks: {
    key: string
    value: BankRecord
    indexes: { 'by-updated': number }
  }
}

let dbPromise: Promise<IDBPDatabase<McqDB>> | null = null

function getDB(): Promise<IDBPDatabase<McqDB>> {
  if (!dbPromise) {
    dbPromise = openDB<McqDB>('mcq-practice', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('banks')) {
          const store = db.createObjectStore('banks', { keyPath: 'id' })
          store.createIndex('by-updated', 'updatedAt')
        }
      },
    })
  }
  return dbPromise
}

export async function listBanks(): Promise<BankRecord[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('banks', 'by-updated')
  return all.reverse() // newest first
}

export async function getBank(id: string): Promise<BankRecord | undefined> {
  const db = await getDB()
  return db.get('banks', id)
}

export async function putBank(bank: BankRecord): Promise<void> {
  bank.updatedAt = Date.now()
  const db = await getDB()
  await db.put('banks', bank)
}

export async function deleteBank(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('banks', id)
}
