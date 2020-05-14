use borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::collections::Map;
use near_sdk::json_types::U128;
use near_sdk::{env, near_bindgen, AccountId, Balance};

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

pub type TokenTypeId = u32;
pub type TokenId = u64;

#[derive(BorshDeserialize, BorshSerialize)]
pub struct Token {
    id: TokenId,
    token_type_id: TokenTypeId,
    data: String
}

#[derive(BorshDeserialize, BorshSerialize)]
pub struct TokenType {
    id: TokenTypeId,
    total_supply: u64,
    data: String
}

// I think we're going to want to follow the model of the fungible token
// in the sense of creating an Account struct+impl and a
// NonFungibleToken struct+impl with a Map keeping track of who owns what.
// See:
// https://github.com/near/near-sdk-rs/blob/master/examples/fungible-token/src/lib.rs
