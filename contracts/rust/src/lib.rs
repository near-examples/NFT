use borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::collections::Map;
use near_sdk::collections::Set;
use near_sdk::json_types::U128;
use near_sdk::{env, near_bindgen, AccountId, Balance};

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

/// This trait provides the baseline of functions as described at:
/// https://github.com/nearprotocol/NEPs/blob/nep-4/specs/Standards/Tokens/NonFungibleToken.md
pub trait NEP4 {
    // Grant the access to the given `accountId` for the given `tokenId`.
    // Requirements:
    // * The caller of the function (`predecessor_id`) should have access to the token.
    fn grant_access(&mut self, escrow_account_id: String);

    // Revoke the access to the given `accountId` for the given `tokenId`.
    // Requirements:
    // * The caller of the function (`predecessor_id`) should have access to the token.
    fn revoke_access(&mut self, escrow_account_id: String);

    // Transfer the given `tokenId` from the given `accountId`.  Account `newAccountId` becomes the new owner.
    // Requirements:
    // * The caller of the function (`predecessor_id`) should have access to the token.
    fn transfer_from(&mut self, owner_id: String, new_owner_id: String, token_id: TokenId);

    // Transfer the given `tokenId` to the given `accountId`.  Account `accountId` becomes the new owner.
    // Requirements:
    // * The caller of the function (`predecessor_id`) should have access to the token.
    fn transfer(&mut self, new_owner_id: String, token_id: TokenId);

    // Returns `true` or `false` based on caller of the function (`predecessor_id) having access to the token
    fn check_access(&self, token_id: TokenId, owner_id: AccountId) -> bool;

    // Get an individual owner by given `tokenId`.
    fn get_token_owner(&self, token_id: TokenId) -> String;
}

/// The token ID type is also defined in the NEP
pub type TokenId = u64;

pub type AccountIdHash = Vec<u8>;

pub struct Token {
    id: TokenId
}

// Begin implementation
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize)]
pub struct NonFungibleTokenBasic {
    pub token_to_account: Map<TokenId, AccountId>,
    pub account_to_set: Map<AccountId, Set<TokenId>>, // instead of AccountId Vec<u8>?
    pub account_gives_access: Map<AccountIdHash, Set<AccountIdHash>>, // Vec<u8> is sha256 of account, makes it safer and is how fungible token also works
    pub owner_id: AccountId,
}

impl Default for NonFungibleTokenBasic {
    fn default() -> Self {
        panic!("Fun token should be initialized before usage")
    }
}

#[near_bindgen]
impl NonFungibleTokenBasic {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        assert!(env::is_valid_account_id(owner_id.as_bytes()), "Owner's account ID is invalid.");
        assert!(!env::state_exists(), "Already initialized");
        Self {
            token_to_account: Map::new(b"token-belongs-to".to_vec()),
            account_to_set: Map::new(b"account-has-set".to_vec()),
            account_gives_access: Map::new(b"gives-access".to_vec()),
            owner_id,
        }
    }
}

impl NEP4 for NonFungibleTokenBasic {
    fn grant_access(&mut self, escrow_account_id: String) {
        let escrow_hash = env::sha256(escrow_account_id.as_bytes());
        let signer = env::signer_account_id();
        let signer_hash = env::sha256(signer.as_bytes());

        let mut access_list = match self.account_gives_access.get(&signer_hash) {
            Some(existing_list) => {
                existing_list
            },
            None => {
                Set::new(b"new-access-set".to_vec())
            }
        };
        access_list.insert(&escrow_hash);
        self.account_gives_access.insert(&signer_hash, &access_list);
    }

    fn revoke_access(&mut self, escrow_account_id: String) {
        let signer = env::signer_account_id();
        let signer_hash = env::sha256(signer.as_bytes());
        match self.account_gives_access.remove(&signer_hash) {
            Some(_) => env::log(b"Successfully removed access."),
            None => env::panic(b"Access does not exist.")
        }
    }

    fn transfer_from(&mut self, owner_id: String, new_owner_id: String, token_id: TokenId) {

    }

    fn transfer(&mut self, new_owner_id: String, token_id: TokenId) {

    }

    fn check_access(&self, token_id: TokenId, owner_id: AccountId) -> bool {
        true // TODO
    }

    fn get_token_owner(&self, token_id: TokenId) -> String {
        match self.token_to_account.get(&token_id) {
            Some(owner_id) => owner_id,
            None => env::panic(b"No owner of the token ID specified")
        }
    }
}

/// Methods not in the strict scope of the NFT spec (NEP4)
#[near_bindgen]
impl NonFungibleTokenBasic {
    /// Creates a token for owner_id, doesn't use autoincrement, fails if id is taken
    pub fn mint_token(owner_id: String, token_id: TokenId) {
        let new_token = Token {
            id: token_id
        };
    }
}

// use the attribute below for unit tests
#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::MockedBlockchain;
    use near_sdk::{testing_env, VMContext};

    // part of writing unit tests is setting up a mock context
    // in this example, this is only needed for env::log in the contract
    // this is also a useful list to peek at when wondering what's available in env::*
    fn get_context(input: Vec<u8>, is_view: bool) -> VMContext {
        VMContext {
            current_account_id: "alice.testnet".to_string(),
            signer_account_id: "robert.testnet".to_string(),
            signer_account_pk: vec![0, 1, 2],
            predecessor_account_id: "jane.testnet".to_string(),
            input,
            block_index: 0,
            block_timestamp: 0,
            account_balance: 0,
            account_locked_balance: 0,
            storage_usage: 0,
            attached_deposit: 0,
            prepaid_gas: 10u64.pow(18),
            random_seed: vec![0, 1, 2],
            is_view,
            output_data_receivers: vec![],
            epoch_height: 19,
        }
    }

    #[test]
    fn grant_access() {
        let context = get_context(vec![], false);
        testing_env!(context);
        let mut contract = NonFungibleTokenBasic::new("robert.testnet".to_string());
        let length_before = contract.account_gives_access.len();
        assert_eq!(0, length_before);
        contract.grant_access("mike.testnet".to_string());
        contract.grant_access("kevin.testnet".to_string());
        let length_after = contract.account_gives_access.len();
        assert_eq!(1, length_after);
        let signer_hash = env::sha256("robert.testnet".as_bytes());
        let num_grantees = contract.account_gives_access.get(&signer_hash).unwrap();
        assert_eq!(2, num_grantees.len());
    }

    #[test]
    #[should_panic(
        expected = r#"Access does not exist."#
    )]
    fn revoke_access_and_panic() {
        let context = get_context(vec![], false);
        testing_env!(context);
        let mut contract = NonFungibleTokenBasic::new("robert.testnet".to_string());
        contract.revoke_access("kevin.testnet".to_string());
    }

    #[test]
    fn add_revoke_access_and_check() {
        let context = get_context(vec![], false);
        testing_env!(context);
        let mut contract = NonFungibleTokenBasic::new("robert.testnet".to_string());
        contract.grant_access("mike.testnet".to_string());
        contract.revoke_access("mike.testnet".to_string());
        // check access
        // "robert.testnet".to_string()

    }
}