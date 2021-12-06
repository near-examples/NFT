import { workspace, mint_more, nft_total_supply } from './utils'
import { BN } from 'near-workspaces-ava';


workspace.test('Enum total supply', async (test, { root, alice, nft }) => {
  await mint_more(root, nft);

  const total_supply = await nft_total_supply(nft, alice);
  test.deepEqual(total_supply, new BN(4));
});

workspace.test('Enum nft tokens', async (test, { root, nft }) => {
  await mint_more(root, nft);

  // No optional args should return all
  let tokens: any[] = await nft.view('nft_tokens');
  test.is(tokens.length, 4);

  // Start at "1", with no limit arg
  tokens = await nft.view('nft_tokens', { from_index: '1' });
  test.is(tokens.length, 3);
  test.is(tokens[0].token_id, '1');
  test.is(tokens[1].token_id, '2');
  test.is(tokens[2].token_id, '3');

  // Start at "2", with limit 1
  tokens = await nft.view('nft_tokens', { from_index: '2', limit: 1 });
  test.is(tokens.length, 1);
  test.is(tokens[0].token_id, '2');

  // Don't specify from_index, but limit 2
  tokens = await nft.view('nft_tokens', { limit: 2 });
  test.is(tokens.length, 2);
  test.is(tokens[0].token_id, '0');
  test.is(tokens[1].token_id, '1');
});

workspace.test('Enum nft supply for owner', async (test, { root, alice, nft }) => {
  // Get number from account with no NFTs
  let ownerNumTokens: BN = new BN(await nft.view('nft_supply_for_owner', { account_id: alice }));
  test.deepEqual(ownerNumTokens, new BN(0));

  ownerNumTokens = new BN(await nft.view('nft_supply_for_owner', { account_id: root }));
  test.deepEqual(ownerNumTokens, new BN(1));

  await mint_more(root, nft);

  ownerNumTokens = new BN(await nft.view('nft_supply_for_owner', { account_id: root }));
  test.deepEqual(ownerNumTokens, new BN(4));
});


workspace.test('Enum nft tokens for owner', async (test, { root, alice, nft }) => {
  await mint_more(root, nft);

  // Get tokens from account with no NFTs
  let ownerTokens: any[] = await nft.view('nft_tokens_for_owner', { account_id: alice });
  test.deepEqual(ownerTokens.length, 0);

  // Get tokens with no optional args
  ownerTokens = await nft.view('nft_tokens_for_owner', { account_id: root });
  test.deepEqual(ownerTokens.length, 4);

  // With from_index and no limit
  ownerTokens = await nft.view('nft_tokens_for_owner', { account_id: root, from_index: new BN(2) });
  test.deepEqual(ownerTokens.length, 2);
  test.is(ownerTokens[0].token_id, '2');
  test.is(ownerTokens[1].token_id, '3');

  // With from_index and limit 1
  ownerTokens = await nft.view('nft_tokens_for_owner', { account_id: root, from_index: new BN(1), limit: 1 });
  test.deepEqual(ownerTokens.length, 1);
  test.is(ownerTokens[0].token_id, '1');

  // No from_index but limit 3
  ownerTokens = await nft.view('nft_tokens_for_owner', { account_id: root, limit: 3 });
  test.deepEqual(ownerTokens.length, 3);
  test.is(ownerTokens[0].token_id, '0');
  test.is(ownerTokens[1].token_id, '1');
  test.is(ownerTokens[2].token_id, '2');
});