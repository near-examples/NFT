// prettier-ignore
import { context, logging, PersistentMap, ContractPromise, u128 } from 'near-sdk-as'
import {
  Swap,
  Status,
  TransferFromArgs,
  OnTransferArgs,
  constructEscrowIdFrom,
} from './models'

type EscrowId = string
type AccountId = string
type TokenId = u64

const escrow = new PersistentMap<EscrowId, Swap>('t')

/**
 * ----------------------------------------------------------------------------
 * (Phase 2) escrow account takes control of tokens in trade
 * ----------------------------------------------------------------------------
 *
 * In this phase, the escrow account reaches in to each of alice and jerry's
 * accounts and pulls out their respective trades into its own account.
 *
 *
 * - corgi::transfer_from({'owner_id':'alice', 'new_owner_id:'escrow', 'token_id': 3})
 *           \
 *            `- callback escrow::on_transfer({'owner_id':'alice', 'token_contract':'corgi', 'token_id': 3})
 *
 *
 * @param owner_id
 * @param token_contract
 * @param token_id
 */
// prettier-ignore
export function fetch_tokens_for_trade(current_owner_id: AccountId, new_owner_id: AccountId, token_contract: AccountId, token_id: TokenId): void {
  logging.log('fetch_tokens_for_trade called')
  // record the intended trade
  const escrowId = constructEscrowIdFrom(current_owner_id, token_contract, token_id )
  const swap = new Swap(current_owner_id, new_owner_id, token_contract, token_id);
  escrow.set(escrowId, swap)

  // prepare arguments for call to transfer_from
  const transferArgs = new TransferFromArgs(current_owner_id, context.contractName, token_id)

  // create promise to call transfer_from
  const promise = ContractPromise.create(token_contract, 'transfer_from',  transferArgs, 0, u128.from(0))

  // prepare arguments for callback to on_transfer
  const onTransferArgs = new OnTransferArgs(current_owner_id, token_contract, token_id)

  // include callback with promise
  let callback = promise.then(
    context.contractName,
    'on_transfer',
    onTransferArgs,
    0
  );

  callback.returnAsResult();
}

// prettier-ignore
export function on_transfer(owner_id: AccountId, token_contract: AccountId, token_id: TokenId): void {
  logging.log('on_transfer called')

  // confirm valid trade in progress
  const escrowId = constructEscrowIdFrom(owner_id, token_contract, token_id)
  assert(escrow.contains(escrowId), 'No record of this trade was found')

  // fetch the trade
  const swap = escrow.getSome(escrowId)

  // switch(swap.status) {
  //   case Status.Started:
  //     // we've just come back from one of our phase 2 calls

  //     break
  //   case Status.InProgress:
  //     // we've just come back from one of our phase 3 calls

  //     break
  //   case Status.Completed:
  //     // we're getting called again after finishing phase 3 for some reason
  //     break
  //   default: 
  //     // const status = Status.Completed.toString()
  //     // assert(false, 'Invalid trade status: ' + status)
  // }

  trade_tokens(swap.owner_id, swap.token_contract, swap.token_id)
}

/**
 * ----------------------------------------------------------------------------
 * (Phase 3) escrow executes transfer to traders
 * ----------------------------------------------------------------------------
 *
 * escrow calls (in one Promise)
 *
 *    - corgi::transfer_from({'owner_id':'escrow', 'new_owner_id:'jerry', 'token_id': 3})
 *               \
 *                `- callback escrow::on_transfer({'owner_id':'jerry', 'token_contract:'corgi', 'token_id': 3})
 *
 *    - sausage::transfer_from({'owner_id':'escrow', 'new_owner_id:'alice', 'token_id': 5})
 *               \
 *                `- callback escrow::on_transfer({'owner_id':'alice', 'token_contract':'sausage', 'token_id': 5})
 */
// prettier-ignore
export function trade_tokens(owner_id: AccountId, token_contract: AccountId, token_id: TokenId): void {
  logging.log('trade_tokens called')
}
