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