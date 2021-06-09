import { VMContext, base64, base58, util } from 'near-sdk-as'
import { Context, u128 } from 'near-sdk-core';
import { sha256HashInit, sha256HashUpdate, sha256HashFinal } from '../../../../node_modules/wasm-crypto/assembly/crypto';

// explicitly import functions required by spec
import {
  grant_access,
  revoke_access,
  transfer,
  transfer_from,
  check_access,
  get_token_owner,
  LISTEN_REQUEST_TIMEOUT,
} from '../main'

// wrap all other functions in `nonSpec` variable, to make it clear when
// tests are using functionality that isn't defined by the spec
import * as nonSpec from '../main'

const alice = 'alice'
const bob = 'bob'
const carol = 'carol'

const content = 'AAECAw==';

const mintprice = u128.fromString('800000000000000000000');

let currentTokenId: u64;
let currentMix: string;
let currentListenRequestPassword: string;

describe('grant_access', () => {
  it('grants access to the given account_id for all the tokens that account has', () => {
    // Alice has a token
    VMContext.setAttached_deposit(mintprice);
    const aliceToken = nonSpec.mint_to_base64(alice, content)

    // Alice calls `grant_access` to make Bob her escrow
    VMContext.setPredecessor_account_id(alice)
    grant_access(bob)

    // Bob checks if Alice has done so
    VMContext.setPredecessor_account_id(bob)
    expect(check_access(alice)).toBe(true)
  })
})

describe('revoke_access', () => {
  it('revokes access to the given `accountId` for the given `tokenId`', () => {
    // Prevent error `InconsistentStateError(IntegerOverflow)` thrown by near-sdk-rs
    VMContext.setStorage_usage(100)
    VMContext.setAttached_deposit(mintprice);
    // Alice has a token
    const aliceToken = nonSpec.mint_to_base64(alice, content)

    // Alice makes Bob her escrow
    VMContext.setPredecessor_account_id(alice)
    grant_access(bob)

    // Bob checks if he has access to Alice's account
    VMContext.setPredecessor_account_id(bob)
    expect(check_access(alice)).toBe(true)

    // Alice revokes Bob's access
    VMContext.setPredecessor_account_id(alice)
    revoke_access(bob)

    // Bob checks again
    VMContext.setPredecessor_account_id(bob)
    expect(check_access(alice)).toBe(false)
  })
})

describe('transfer_from', () => {
  it('allows owner to transfer given `token_id` to given `owner_id`', () => {
    // Alice has a token
    VMContext.setAttached_deposit(mintprice);
    const aliceToken = nonSpec.mint_to_base64(alice, content)
    expect(get_token_owner(aliceToken)).toBe(alice)
    expect(get_token_owner(aliceToken)).not.toBe(bob)

    // Alice transfers her token to Bob
    VMContext.setPredecessor_account_id(alice)
    transfer_from(alice, bob, aliceToken)

    // it works!
    expect(get_token_owner(aliceToken)).toBe(bob)
    expect(get_token_owner(aliceToken)).not.toBe(alice)

    VMContext.setPredecessor_account_id(bob)
  })

  it('allows escrow to transfer given `token_id` to given `new_owner_id` if `owner_id` matches', () => {
    // Alice grants access to Bob
    VMContext.setPredecessor_account_id(alice)
    grant_access(bob)

    // Alice has a token
    VMContext.setAttached_deposit(mintprice);
    const aliceToken = nonSpec.mint_to_base64(alice, content)
    expect(get_token_owner(aliceToken)).toBe(alice)
    expect(get_token_owner(aliceToken)).not.toBe(bob)

    // Bob transfers to himself
    VMContext.setPredecessor_account_id(bob)
    transfer_from(alice, bob, aliceToken)

    // it works!
    expect(get_token_owner(aliceToken)).toBe(bob)
    expect(get_token_owner(aliceToken)).not.toBe(alice)
  })

  it('prevents escrow from transferring given `token_id` to given `new_owner_id if `owner_id` does not match`', () => {
    expect(() => {
      // Alice grants access to Bob
      VMContext.setPredecessor_account_id(alice)
      grant_access(bob)

      // Alice has a token
      VMContext.setAttached_deposit(mintprice);
      const aliceToken = nonSpec.mint_to_base64(alice, content)
      expect(get_token_owner(aliceToken)).toBe(alice)
      expect(get_token_owner(aliceToken)).not.toBe(bob)

      // Bob attempts to transfer and has access, but owner_id is wrong
      VMContext.setPredecessor_account_id(bob)
      VMContext.setAttached_deposit(u128.from(100))
      transfer_from(bob, carol, aliceToken)
    }).toThrow(nonSpec.ERROR_OWNER_ID_DOES_NOT_MATCH_EXPECTATION)
  })

  it('prevents anyone else from transferring the token', () => {
    expect(() => {
      // Alice has a token
      VMContext.setAttached_deposit(mintprice);
      const aliceToken = nonSpec.mint_to_base64(alice, content)

      // Bob tries to transfer it to himself
      VMContext.setPredecessor_account_id(bob)
      VMContext.setAttached_deposit(u128.from(100))
      transfer_from(alice, bob, aliceToken)
    }).toThrow(nonSpec.ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION)
  })
})

describe('transfer', () => {
  it('allows owner to transfer given `token_id` to given `owner_id`', () => {
    // Alice has a token
    VMContext.setAttached_deposit(mintprice);
    const aliceToken = nonSpec.mint_to_base64(alice, content)
    expect(get_token_owner(aliceToken)).toBe(alice)
    expect(get_token_owner(aliceToken)).not.toBe(bob)

    // Alice transfers her token to Bob
    VMContext.setPredecessor_account_id(alice)
    transfer(bob, aliceToken)

    // it works!
    expect(get_token_owner(aliceToken)).toBe(bob)
    expect(get_token_owner(aliceToken)).not.toBe(alice)
  })

  it('prevents escrow from using transfer. Escrow can only use transfer_from', () => {
    expect(() => {
      // Alice grants access to Bob
      VMContext.setPredecessor_account_id(alice)
      grant_access(bob)

      // Alice has a token
      VMContext.setAttached_deposit(mintprice);
      const aliceToken = nonSpec.mint_to_base64(alice, content)
      expect(get_token_owner(aliceToken)).toBe(alice)
      expect(get_token_owner(aliceToken)).not.toBe(bob)

      // Bob attempts to transfer and has access, but owner_id is wrong
      VMContext.setPredecessor_account_id(bob)
      transfer(carol, aliceToken)
    }).toThrow(nonSpec.ERROR_TOKEN_NOT_OWNED_BY_CALLER)
  })

  it('prevents anyone else from transferring the token', () => {
    expect(() => {
      // Alice grants access to Bob
      VMContext.setPredecessor_account_id(alice)

      // Alice has a token
      VMContext.setAttached_deposit(mintprice);
      const aliceToken = nonSpec.mint_to_base64(alice, content)
      expect(get_token_owner(aliceToken)).toBe(alice)
      expect(get_token_owner(aliceToken)).not.toBe(bob)

      // Bob attempts to transfer and has access, but owner_id is wrong
      VMContext.setPredecessor_account_id(bob)
      transfer(carol, aliceToken)
    }).toThrow(nonSpec.ERROR_TOKEN_NOT_OWNED_BY_CALLER)
  })
})


describe('check_access', () => {
  it('returns true if caller of the function has access to the token', () => {
    // Alice has a token
    VMContext.setAttached_deposit(mintprice);
    const aliceToken = nonSpec.mint_to_base64(alice, content)

    // Alice grants access to Bob
    VMContext.setPredecessor_account_id(alice)
    grant_access(bob)

    // Bob checks if he has access
    VMContext.setPredecessor_account_id(bob)
    expect(check_access(alice)).toBe(true)
  })

  it('returns false if caller of function does not have access', () => {
    // Alice has a token
    VMContext.setAttached_deposit(mintprice);
    const aliceToken = nonSpec.mint_to_base64(alice, content)

    // Bob checks if he has access
    VMContext.setPredecessor_account_id(alice)
    expect(check_access(bob)).toBe(false)
  })
})

describe('get_token_owner', () => {
  it('returns accountId of owner of given `tokenId`', () => {
    // Alice and Bob both have tokens
    VMContext.setAttached_deposit(mintprice);
    const aliceToken = nonSpec.mint_to_base64(alice, content)
    const bobToken = nonSpec.mint_to_base64(bob, content)

    // Alice owns her own token
    expect(get_token_owner(aliceToken)).toBe(alice)
    expect(get_token_owner(aliceToken)).not.toBe(bob)

    // Bob owns his own token
    expect(get_token_owner(bobToken)).toBe(bob)
    expect(get_token_owner(bobToken)).not.toBe(alice)
  })
})

describe('nonSpec interface', () => {
  it('should throw if we attempt to mint more than the MAX_SUPPLY', () => {
    VMContext.setAttached_deposit(mintprice);
    // we can mint up to MAX_SUPPLY tokens
    expect(() => {
      let limit = nonSpec.MAX_SUPPLY
      while (limit-- > 0) {
        nonSpec.mint_to_base64(alice, content)
      }
    }).not.toThrow()

    // minting one more than the max throws an error
    expect(() => {
      nonSpec.mint_to_base64(alice, content)
    }).toThrow(nonSpec.ERROR_MAXIMUM_TOKEN_LIMIT_REACHED)
  })
  it('owner should get free listening', () => {
    VMContext.setAttached_deposit(mintprice);
    const tokenId = nonSpec.mint_to_base64(alice, content)
    VMContext.setPredecessor_account_id(alice)

    const listenRequestPassword = 'abcd1234';
    const hashstate = sha256HashInit();
    sha256HashUpdate(hashstate, Uint8Array.wrap(String.UTF8.encode(listenRequestPassword)))
    nonSpec.request_listening(tokenId, base64.encode(sha256HashFinal(hashstate)))

    expect(base64.encode(nonSpec.get_token_content_base64(tokenId, alice, listenRequestPassword))).toStrictEqual(content);
  })
  it('should get legacy content', () => {
    const mintprice = u128.fromString('8000000000000000000000000');
    VMContext.setAttached_deposit(mintprice);
    const tokenId = nonSpec.mint_to(alice, content)
    VMContext.setPredecessor_account_id(alice)
    expect(nonSpec.get_token_content(tokenId)).toStrictEqual(content);
  })
  it('should not be allowed to get content', () => {
    expect(() => {
      VMContext.setAttached_deposit(mintprice);
      const tokenId = nonSpec.mint_to_base64(alice, content)
      VMContext.setPredecessor_account_id(bob)
      nonSpec.get_token_content(tokenId)
    }).toThrow(nonSpec.ERROR_TOKEN_NOT_OWNED_BY_CALLER)
  })
  it('should fail to view price for token not for sale', () => {
    expect(() => {
      VMContext.setAttached_deposit(mintprice);
      const tokenId = nonSpec.mint_to_base64(alice, content)
      nonSpec.view_price(tokenId);
    }).toThrow(nonSpec.ERROR_TOKEN_NOT_FOR_SALE);
  })
  it('should buy legacy content', () => {
    const mintprice = u128.fromString('8000000000000000000000000');
    VMContext.setAttached_deposit(mintprice);
    const tokenId = nonSpec.mint_to(alice, content)
    VMContext.setPredecessor_account_id(alice)
    expect(nonSpec.get_token_content(tokenId)).toStrictEqual(content);
    const price = u128.from(200)
    nonSpec.sell_token(tokenId, price)
    
    VMContext.setPredecessor_account_id(bob)
    VMContext.setAttached_deposit(price)
    nonSpec.buy_token(tokenId)

    expect(get_token_owner(tokenId)).toStrictEqual(bob)
  })
  it('should sell, view price and buy token', () => {
    VMContext.setAttached_deposit(mintprice);
    const tokenId = nonSpec.mint_to_base64(carol, content)
    const price = u128.from(200);
    VMContext.setPredecessor_account_id(carol)

    nonSpec.sell_token(tokenId, price)

    const viewedPrice: u128 = nonSpec.view_price(tokenId);
    expect(viewedPrice).toStrictEqual(price);

    VMContext.setPredecessor_account_id(bob)
    VMContext.setAttached_deposit(price)

    expect(get_token_owner(tokenId)).toStrictEqual(carol)
    nonSpec.buy_token(tokenId)

    VMContext.setPredecessor_account_id(carol)
    expect(get_token_owner(tokenId)).toStrictEqual(bob)
  });
  it('should not be allowed to get content if no listening credit', () => {
    expect(() => {
      VMContext.setAttached_deposit(mintprice);
      VMContext.setPredecessor_account_id(alice)
      const tokenId = nonSpec.mint_to_base64(alice, content)
      VMContext.setPredecessor_account_id(bob)
      expect(base64.encode(nonSpec.get_token_content_base64(tokenId, bob, 'abcd1234'))).toStrictEqual(content)
    }).toThrow()
  })
  it('should not be allowed to get content if not paying for listening', () => {
    expect(() => {
      VMContext.setAttached_deposit(mintprice);
      VMContext.setPredecessor_account_id(alice)
      const tokenId = nonSpec.mint_to_base64(alice, content)
      VMContext.setPredecessor_account_id(bob)
      expect(base64.encode(nonSpec.get_token_content_base64(tokenId, bob, 'abd124'))).toStrictEqual(content)
    }).toThrow()
  })
  it('should be allowed to get content if bought listening credit', () => {
    VMContext.setAttached_deposit(mintprice);
    VMContext.setPredecessor_account_id(alice)
    const tokenId = nonSpec.mint_to_base64(alice, content)
    VMContext.setPredecessor_account_id(bob)
    expect(nonSpec.view_listening_credit(alice)).toBe(0)
    expect(nonSpec.view_listening_credit(bob)).toBe(0)
    VMContext.setAttached_deposit(nonSpec.LISTEN_PRICE)
    nonSpec.buy_listening_credit()
    expect(nonSpec.view_listening_credit(bob)).toBe(1)
    const listenRequestPassword = 'abcd1234'
    const hashstate = sha256HashInit()
    sha256HashUpdate(hashstate, Uint8Array.wrap(String.UTF8.encode(listenRequestPassword)))
    nonSpec.request_listening(tokenId, base64.encode(sha256HashFinal(hashstate)))
    expect(base64.encode(nonSpec.get_token_content_base64(tokenId, bob, listenRequestPassword))).toStrictEqual(content)
    expect(nonSpec.view_listening_credit(bob)).toBe(0)
    expect(nonSpec.view_listening_credit(alice)).toBe(1)
  })
  it('should transfer listening credit', () => {
    VMContext.setAttached_deposit(mintprice);
    expect(nonSpec.view_listening_credit(alice)).toBe(0)
    expect(nonSpec.view_listening_credit(bob)).toBe(0)
    VMContext.setAttached_deposit(nonSpec.LISTEN_PRICE * u128.from(10))
    VMContext.setPredecessor_account_id(alice)
    nonSpec.buy_listening_credit()
    expect(nonSpec.view_listening_credit(alice)).toBe(10)
    nonSpec.transfer_listening_credit(bob, 5)
    expect(nonSpec.view_listening_credit(bob)).toBe(5)
    expect(nonSpec.view_listening_credit(alice)).toBe(5)
    expect(() => {
      VMContext.setPredecessor_account_id(alice)
      nonSpec.transfer_listening_credit(bob, 6)
    }).toThrow(nonSpec.ERROR_LISTENING_CREDIT_NOT_ENOUGH)
  })
  it('should not be allowed to steal credits', () => {
    VMContext.setAttached_deposit(mintprice);
    expect(nonSpec.view_listening_credit(alice)).toBe(0)
    expect(nonSpec.view_listening_credit(bob)).toBe(0)
    VMContext.setAttached_deposit(nonSpec.LISTEN_PRICE * u128.from(10))
    VMContext.setPredecessor_account_id(alice)
    nonSpec.buy_listening_credit()
    expect(nonSpec.view_listening_credit(alice)).toBe(10)
    nonSpec.transfer_listening_credit(bob, 5)
    expect(nonSpec.view_listening_credit(bob)).toBe(5)
    expect(nonSpec.view_listening_credit(alice)).toBe(5)
    expect(() => {
      VMContext.setPredecessor_account_id(alice)
      nonSpec.transfer_listening_credit(bob, -1)
    }).toThrow(nonSpec.ERROR_LISTENING_CREDIT_TRANSFER_AMOUNT_NEGATIVE)
  })
  it('should request listening for base and remix token in the same call', () => {
    VMContext.setAttached_deposit(mintprice);
    VMContext.setPredecessor_account_id(alice)
    const tokenId = nonSpec.mint_to_base64(alice, content, true)

    VMContext.setPredecessor_account_id(carol)
    const mixcontent: u8[] = [66, 33, 22];
    nonSpec.publish_token_mix(tokenId, mixcontent)
    let mixes = nonSpec.get_token_mixes(tokenId)
    expect(mixes.length).toBe(1)
    const mix = mixes[0]

    VMContext.setAttached_deposit(u128.fromString('10000000000000000000000000'))
    nonSpec.buy_mix(tokenId, mixes[0])

    mixes = nonSpec.get_token_mixes(tokenId)

    const remixNFTid = parseInt(mixes[0].split(';')[1].split(':')[1]) as u64

    VMContext.setPredecessor_account_id(bob)
    expect(nonSpec.view_listening_credit(bob)).toBe(0)

    VMContext.setAttached_deposit(nonSpec.LISTEN_PRICE * u128.from(2))
    nonSpec.buy_listening_credit()
    expect(nonSpec.view_listening_credit(bob)).toBe(2)
    const listenRequestPassword = 'abcd1234'
    currentListenRequestPassword = listenRequestPassword

    currentTokenId = remixNFTid
    expect(() => {
      nonSpec.get_remix_token_content(currentTokenId, bob, currentListenRequestPassword)
    }).toThrow()

    const hashstate = sha256HashInit()
    sha256HashUpdate(hashstate, Uint8Array.wrap(String.UTF8.encode(listenRequestPassword)))

    expect(nonSpec.view_listening_credit(alice)).toBe(0)
    expect(nonSpec.view_listening_credit(carol)).toBe(0)
    nonSpec.request_listening(tokenId, base64.encode(sha256HashFinal(hashstate)), remixNFTid)
    expect(nonSpec.view_listening_credit(bob)).toBe(0)
    expect(nonSpec.view_listening_credit(carol)).toBe(1)
    expect(nonSpec.view_listening_credit(alice)).toBe(1)

    expect(() => {
      nonSpec.get_remix_token_content(currentTokenId, bob, currentListenRequestPassword)
    }).not.toThrow()

    expect(base64.encode(nonSpec.get_token_content_base64(tokenId, bob, listenRequestPassword))).toStrictEqual(content)
    expect(nonSpec.get_remix_token_content(remixNFTid, bob, listenRequestPassword)).toBe(`${tokenId};${mix}`)
  })
  it('listening request should only last 5 minutes', () => {
    VMContext.setAttached_deposit(mintprice);
    VMContext.setPredecessor_account_id(alice)
    currentTokenId = nonSpec.mint_to_base64(alice, content)
    VMContext.setPredecessor_account_id(bob)
    VMContext.setAttached_deposit(nonSpec.LISTEN_PRICE)
    nonSpec.buy_listening_credit()

    const listenRequestPassword = 'abcd1234';
    const hashstate = sha256HashInit();
    sha256HashUpdate(hashstate, Uint8Array.wrap(String.UTF8.encode(listenRequestPassword)))
    nonSpec.request_listening(currentTokenId, base64.encode(sha256HashFinal(hashstate)))

    expect(base64.encode(nonSpec.get_token_content_base64(currentTokenId, bob, listenRequestPassword))).toStrictEqual(content)

    VMContext.setBlock_timestamp(Context.blockTimestamp + 1)
    expect(base64.encode(nonSpec.get_token_content_base64(currentTokenId, bob, listenRequestPassword))).toStrictEqual(content)

    expect(() => {
      VMContext.setBlock_timestamp(Context.blockTimestamp + LISTEN_REQUEST_TIMEOUT)
      nonSpec.get_token_content_base64(currentTokenId, bob, 'abcd1234')
    }).toThrow()
  })
  it('should be possible to mint 20kb', () => {
    const largecontent = new Uint8Array(20 * 1024)
    for (let n = 0; n < largecontent.length; n++) {
      largecontent[n] = n & 0xff
    }

    const largecontentb64 = base64.encode(largecontent)
    VMContext.setAttached_deposit(u128.fromString('100000000000000000000') * u128.fromI32(largecontentb64.length))

    const aliceToken = nonSpec.mint_to_base64(alice, largecontentb64)

    VMContext.setPredecessor_account_id(alice)
    const listenRequestPassword = 'abcd1234';
    const hashstate = sha256HashInit();
    sha256HashUpdate(hashstate, Uint8Array.wrap(String.UTF8.encode(listenRequestPassword)))
    nonSpec.request_listening(aliceToken, base64.encode(sha256HashFinal(hashstate)))

    expect(nonSpec.get_token_content_base64(aliceToken, 'alice', listenRequestPassword)).toStrictEqual(largecontent)
  })
  it('should be possible to view token for free', () => {
    VMContext.setAttached_deposit(mintprice);
    const tokenId = nonSpec.mint_to_base64(alice, content)
    VMContext.setPredecessor_account_id(bob)
    const result = nonSpec.view_token_content_base64(tokenId)
    expect(result).toStrictEqual(content)
  })
  it('should not be possible to publish a token mix if token does not support it', () => {
    expect(() => {
      VMContext.setAttached_deposit(mintprice);
      const tokenId = nonSpec.mint_to_base64(alice, content)
      VMContext.setPredecessor_account_id(bob)
      nonSpec.publish_token_mix(tokenId, [55, 33, 21])
    }).toThrow()
  })
  it('should be possible to publish a token mix', () => {
    VMContext.setAttached_deposit(mintprice);
    const tokenId = nonSpec.mint_to_base64(alice, content, true)
    VMContext.setPredecessor_account_id(bob)
    nonSpec.publish_token_mix(tokenId, [55, 33, 21])
    const mixes = nonSpec.get_token_mixes(tokenId)
    expect(mixes.length).toBe(1)
  })
  it('oldest mix should be replaced if there are already ' + nonSpec.MAX_MIXES_PER_TOKEN.toString() + ' mixes', () => {
    VMContext.setAttached_deposit(mintprice);

    const tokenId = nonSpec.mint_to_base64(alice, content, true)
    VMContext.setPredecessor_account_id(bob)
    for (let n = 0; n < nonSpec.MAX_MIXES_PER_TOKEN * 2; n++) {
      const blocktimestamp = n;
      VMContext.setBlock_timestamp(blocktimestamp);
      nonSpec.publish_token_mix(tokenId, [n as u8, (n + 1) as u8])

      const mixes = nonSpec.get_token_mixes(tokenId)
      expect(mixes.length).toBeLessThanOrEqual(nonSpec.MAX_MIXES_PER_TOKEN);
      if (mixes.length < nonSpec.MAX_MIXES_PER_TOKEN) {
        expect(mixes.length).toBe(n + 1, 'mixes length should be ' + (n + 1).toString());
      }
      expect(mixes[n % nonSpec.MAX_MIXES_PER_TOKEN]).toBe(bob + ';' + blocktimestamp.toString() + ';' + n.toString() + ',' + (n + 1).toString() + '', 'mix content [0] should be ' + n.toString());

      if (n > 0) {
        expect(mixes[(n - 1) % nonSpec.MAX_MIXES_PER_TOKEN]).toBe(bob + ';' + (blocktimestamp - 1).toString() + ';' + (n - 1).toString() + ',' + (n).toString(), 'mix content [1] should be ' + n.toString());
      }
    }
  })
  it('should be possible to buy a token mix', () => {
    VMContext.setAttached_deposit(mintprice);
    const tokenId = nonSpec.mint_to_base64(alice, content, true)
    VMContext.setPredecessor_account_id(bob)
    nonSpec.publish_token_mix(tokenId, [55, 33, 21])
    const mixes = nonSpec.get_token_mixes(tokenId)
    expect(mixes.length).toBe(1)
    VMContext.setPredecessor_account_id(carol)
    VMContext.setCurrent_account_id(carol)
    VMContext.setAttached_deposit(u128.fromString('10000000000000000000000000'))
    nonSpec.buy_mix(tokenId, mixes[0])
  })
  it('should not be possible to publish over a mix that is sold', () => {
    VMContext.setAttached_deposit(mintprice);

    const tokenId = nonSpec.mint_to_base64(alice, content, true)
    expect(tokenId).toBe(1)

    VMContext.setPredecessor_account_id(bob)
    for (let n = 0; n < nonSpec.MAX_MIXES_PER_TOKEN * 2; n++) {
      const blocktimestamp = n;
      VMContext.setBlock_timestamp(blocktimestamp);
      if (n < nonSpec.MAX_MIXES_PER_TOKEN) {
        nonSpec.publish_token_mix(tokenId, [n as u8, (n + 1) as u8])
      } else {
        expect(() => {
          nonSpec.publish_token_mix(1, [1, 2])
        }).toThrow()
      }

      const mixes = nonSpec.get_token_mixes(tokenId)

      if (n < nonSpec.MAX_MIXES_PER_TOKEN) {
        expect(mixes[n % nonSpec.MAX_MIXES_PER_TOKEN]).toBe(bob + ';' + blocktimestamp.toString() + ';' + n.toString() + ',' + (n + 1).toString() + '', 'mix content [' + n.toString() + '] should be ' + n.toString())
        VMContext.setAttached_deposit(u128.fromString('10000000000000000000000000'))
        nonSpec.buy_mix(tokenId, mixes[n])
      } else {
        expect(mixes[n % nonSpec.MAX_MIXES_PER_TOKEN]).toBe(bob + ';nft:' + (tokenId + ((n % nonSpec.MAX_MIXES_PER_TOKEN) + 1)).toString(), 'mix content [' + n.toString() + '] should be an NFT with id ' + (tokenId + n - nonSpec.MAX_MIXES_PER_TOKEN).toString())
      }
    }
  })
  it('should not be possible to mint a mix twice', () => {
    VMContext.setAttached_deposit(mintprice);
    currentTokenId = nonSpec.mint_to_base64(alice, content, true)
    VMContext.setPredecessor_account_id(bob)
    nonSpec.publish_token_mix(currentTokenId, [55, 33, 21])
    const mixes = nonSpec.get_token_mixes(currentTokenId)
    expect(mixes.length).toBe(1)
    currentMix = mixes[0]

    VMContext.setPredecessor_account_id(carol)
    VMContext.setAttached_deposit(u128.fromString('10000000000000000000000000'))
    nonSpec.buy_mix(currentTokenId, mixes[0])

    expect(() => {
      nonSpec.buy_mix(currentTokenId, currentMix)
    }).toThrow()
  })
  it('should be possible to buy a token that was a remix', () => {
    VMContext.setAttached_deposit(mintprice);
    const originalTokenId = nonSpec.mint_to_base64(alice, content, true)
    VMContext.setPredecessor_account_id(bob)
    nonSpec.publish_token_mix(currentTokenId, [55, 33, 21])
    let mixes = nonSpec.get_token_mixes(currentTokenId)
    expect(mixes.length).toBe(1)
    const mix = mixes[0]

    VMContext.setPredecessor_account_id(carol)
    VMContext.setAttached_deposit(u128.fromString('10000000000000000000000000'))
    nonSpec.buy_mix(currentTokenId, mixes[0])

    mixes = nonSpec.get_token_mixes(currentTokenId)
    const remixNFTid = parseInt(mixes[0].split(';')[1].split(':')[1]) as u64
    nonSpec.sell_token(remixNFTid, u128.fromString('20000000000000000000000000'))

    VMContext.setPredecessor_account_id(alice)
    VMContext.setAttached_deposit(u128.fromString('20000000000000000000000000'))
    nonSpec.buy_token(remixNFTid)

    const remixNFTContent = nonSpec.view_remix_content(remixNFTid)
    expect(remixNFTContent).toBe(originalTokenId.toString() + ';' + mix);
  })
  it('should be possible to publish a token mix with base64 encoded content', () => {
    VMContext.setAttached_deposit(mintprice);
    const tokenId = nonSpec.mint_to_base64(alice, content, true)
    VMContext.setPredecessor_account_id(bob)
    nonSpec.publish_token_mix_base64(tokenId, base64.encode(new Uint8Array(nonSpec.MAX_MIX_BYTES_BASE64)))
    const mixes = nonSpec.get_token_mixes(tokenId)
    expect(mixes.length).toBe(1)
  })
  it('should be fail if trying to publish a token mix with non base64 encoded string', () => {
    VMContext.setAttached_deposit(mintprice);

    expect(() => {
      const tokenId = nonSpec.mint_to_base64(alice, content, true)
      VMContext.setPredecessor_account_id(bob)
      nonSpec.publish_token_mix_base64(tokenId, 'abcdefg');
    }).toThrow();
  })
  it('should be possible to sell the contract', () => {
    VMContext.setCurrent_account_id(alice);
    VMContext.setPredecessor_account_id(alice);
    nonSpec.sell_contract_to(bob, u128.fromString('2000'))
    VMContext.setPredecessor_account_id(bob)
    VMContext.setAttached_deposit(u128.fromString('2000'))
    nonSpec.buy_contract()
  });
  it('should only be possible for the selected buyer to buy the contract', () => {
    VMContext.setCurrent_account_id(alice);
    VMContext.setPredecessor_account_id(alice);
    nonSpec.sell_contract_to(bob, u128.fromString('2000'))
    VMContext.setPredecessor_account_id(carol)
    VMContext.setAttached_deposit(u128.fromI32(2000))
    expect(() => {
      nonSpec.buy_contract()
    }).toThrow()
  });
  it('should be possible to re-sell the contract', () => {
    VMContext.setCurrent_account_id(alice);
    VMContext.setPredecessor_account_id(alice);
    nonSpec.sell_contract_to(bob, u128.fromString('2000'))
    VMContext.setPredecessor_account_id(bob)
    VMContext.setAttached_deposit(u128.fromI32(2000))
    nonSpec.buy_contract()
    VMContext.setPredecessor_account_id(bob)
    nonSpec.sell_contract_to(carol, u128.fromString('3000'))
    VMContext.setPredecessor_account_id(carol)
    VMContext.setAttached_deposit(u128.fromI32(3000))
    nonSpec.buy_contract()
  });
  it('should not be possible for others to sell the contract', () => {
    VMContext.setCurrent_account_id(alice)
    VMContext.setPredecessor_account_id(bob)
    expect(() => {
      nonSpec.sell_contract_to(bob, u128.fromString('4000'))
    }).toThrow()
  });
  it('should not be possible for others to resell the contract', () => {
    VMContext.setCurrent_account_id(alice);
    VMContext.setPredecessor_account_id(alice);
    nonSpec.sell_contract_to(bob, u128.fromString('2000'))
    VMContext.setPredecessor_account_id(bob)
    VMContext.setAttached_deposit(u128.fromI32(2000))
    nonSpec.buy_contract()
    VMContext.setPredecessor_account_id(bob)
    nonSpec.sell_contract_to(carol, u128.fromString('3000'))
    VMContext.setPredecessor_account_id(carol)
    expect(() => {
      nonSpec.sell_contract_to(bob, u128.fromString('3000'))
    }).toThrow()
  });
  it('should only be possible for beneficiary to transfer funds', () => {
    VMContext.setCurrent_account_id(alice)
    VMContext.setAccount_balance(u128.fromI64(999999999999));
    VMContext.setPredecessor_account_id(bob)
    expect(() => {
      nonSpec.transfer_funds(u128.fromI64(200000000000))
    }).toThrow()

    VMContext.setPredecessor_account_id(alice)
    expect(() => {
      nonSpec.transfer_funds(mintprice)
    }).toThrow()
    nonSpec.sell_contract_to(bob, u128.fromString('2000'))

    VMContext.setPredecessor_account_id(bob)
    VMContext.setAttached_deposit(u128.fromI64(2000))
    nonSpec.buy_contract()
    const transferAmount = 100000;
    const accountBalanceBefore = Context.accountBalance.toI64();
    nonSpec.transfer_funds(u128.fromI64(transferAmount))
    expect(Context.accountBalance.toI64()).toBe(accountBalanceBefore - transferAmount);

    VMContext.setPredecessor_account_id(carol)
    expect(() => {
      nonSpec.transfer_funds(mintprice)
    }).toThrow()
  });
});

describe('web4', () => {
  it('should be possible to upload and get web4 content', () => {
    VMContext.setCurrent_account_id('web4');
    VMContext.setPredecessor_account_id('web4');
    const content = 'Hello';
    nonSpec.upload_web_content('/index.html', base64.encode(util.stringToBytes(content)));
    const response = nonSpec.web4_get({ path: '/index.html', accountId: null, params: new Map(), preloads: new Map(), query: new Map() });
    expect(response.body).toStrictEqual(util.stringToBytes(content));
  });
});