#![deny(warnings)]
//TODOs: clean up use stmts (commented out some to clean up unused warnings)

use borsh::{BorshDeserialize, BorshSerialize};
//use near_sdk::collections::Map;
//use near_sdk::json_types::U128;
use near_sdk::{near_bindgen};
//use near_sdk::{env, near_bindgen, AccountId, Balance};

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

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize)]
pub struct NonFungibleToken {
    token_types: Vec<TokenType>,
}

impl Default for NonFungibleToken {
    fn default() -> Self {
        panic!("Fun token should be initialized before usage")
    }
}

#[near_bindgen]
impl NonFungibleToken {
    // Create a new type of token within the same contract with given `data` as metadata/display data and `totalSupply`.
    // Requirements:
    // * token types should be stored in collection ordered by index with index serving as TokenTypeId.
    pub fn mint_token_type(&mut self, data: String, total_supply: u64) -> TokenTypeId {

        // This simple implementation won't work if we allow deleting token types
        let id = self.token_types.len() as u32;
        let new_token_type = TokenType {
            id: id,
            total_supply: total_supply,
            data: data
        };
        self.token_types.push(new_token_type);
        return id;
    }
}

// I think we're going to want to follow the model of the fungible token
// in the sense of creating an Account struct+impl and a
// NonFungibleToken struct+impl with a Map keeping track of who owns what.
// See:
// https://github.com/near/near-sdk-rs/blob/master/examples/fungible-token/src/lib.rs


// use the attribute below for unit tests
#[cfg(test)]
mod tests {
    use super::*;
    // use near_sdk::MockedBlockchain;
    // use near_sdk::{testing_env, VMContext};

    // part of writing unit tests is setting up a mock context
    // in this example, this is only needed for env::log in the contract
    // this is also a useful list to peek at when wondering what's available in env::*
    // fn get_context(input: Vec<u8>, is_view: bool) -> VMContext {
    //     VMContext {
    //         current_account_id: "alice.testnet".to_string(),
    //         signer_account_id: "robert.testnet".to_string(),
    //         signer_account_pk: vec![0, 1, 2],
    //         predecessor_account_id: "jane.testnet".to_string(),
    //         input,
    //         block_index: 0,
    //         block_timestamp: 0,
    //         account_balance: 0,
    //         account_locked_balance: 0,
    //         storage_usage: 0,
    //         attached_deposit: 0,
    //         prepaid_gas: 10u64.pow(18),
    //         random_seed: vec![0, 1, 2],
    //         is_view,
    //         output_data_receivers: vec![],
    //         epoch_height: 19,
    //     }
    // }

    #[test]
    fn passing_test() {
       // let context = get_context(vec![], false);
       // testing_env!(context);

        let mut contract = NonFungibleToken {
            token_types: vec![]
        };
        assert_eq!(0, contract.mint_token_type("new token".to_string(), 1000));
        assert_eq!(1, contract.mint_token_type("other new token".to_string(), 1000));
    }
    
}