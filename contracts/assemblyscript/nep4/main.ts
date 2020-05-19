import { context, storage, PersistentMap } from 'near-sdk-as'

const TOTAL_SUPPLY = 't'
const balances = new PersistentMap<string, u64>('b')

// Initialize the token types with respective supplies.
// Requirements:
// * It should initilize at least the first token type and supply of tokens for type.
// * The contract account id should be the first token holder.
export function init(supply: u64): void {
  assert(!storage.contains(TOTAL_SUPPLY), 'Contract has already been initialized')
  storage.set<u64>(TOTAL_SUPPLY, supply)
  balances.set(context.contractName, supply)
}

export function totalSupply(): u64 {
  return storage.getSome<u64>(TOTAL_SUPPLY)
}

export function getBalance(accountId: string): u64 {
  // TODO: returning default not working
  // return balances.get(accountId, 0)
  return balances.getSome(accountId)
}
