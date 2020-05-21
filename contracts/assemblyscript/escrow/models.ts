import { PersistentMap } from 'near-sdk-as'

type EscrowId = string
type AccountId = string
type TokenId = u64

export enum Status {
  Started,
  InProgress,
  Completed,
}

@nearBindgen
export class Swap {
  public id: EscrowId
  public status: Status
  constructor(
    public owner_id: AccountId,
    public new_owner_id: AccountId,
    public token_contract: AccountId,
    public token_id: TokenId
  ) {
    this.status = Status.Started
    this.id = constructEscrowIdFrom(owner_id, token_contract, token_id)
  }
}

@nearBindgen
export class TransferFromArgs {
  constructor(
    public owner_id: AccountId,
    public new_owner_id: AccountId,
    public token_id: TokenId
  ) {}
}

@nearBindgen
export class OnTransferArgs {
  constructor(
    public owner_id: AccountId,
    public token_contract: AccountId,
    public token_id: TokenId
  ) {}
}

export function constructEscrowIdFrom(
  owner: AccountId,
  token: AccountId,
  id: TokenId
): EscrowId {
  return owner + ':' + token + ':' + id.toString()
}
