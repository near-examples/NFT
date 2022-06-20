/*!
A stub contract that implements nft_on_transfer for simulation testing nft_transfer_call.
*/
use near_contract_standards::non_fungible_token::core::NonFungibleTokenReceiver;
use near_contract_standards::non_fungible_token::TokenId;
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{
    env, ext_contract, log, near_bindgen, AccountId, PanicOnDefault,
    PromiseOrValue,
};
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct TokenReceiver {
    non_fungible_token_account_id: AccountId,
}

// Defining cross-contract interface. This allows to create a new promise.
#[ext_contract(ext_self)]
pub trait ValueReturnTrait {
    fn ok_go(&self, return_it: bool) -> PromiseOrValue<bool>;
}

#[near_bindgen]
impl TokenReceiver {
    #[init]
    pub fn new(non_fungible_token_account_id: AccountId) -> Self {
        Self { non_fungible_token_account_id: non_fungible_token_account_id.into() }
    }
}

#[near_bindgen]
impl NonFungibleTokenReceiver for TokenReceiver {
    /// Returns true if token should be returned to `sender_id`
    /// Four supported `msg`s:
    /// * "return-it-now" - immediately return `true`
    /// * "keep-it-now" - immediately return `false`
    /// * "return-it-later" - make cross-contract call which resolves with `true`
    /// * "keep-it-later" - make cross-contract call which resolves with `false`
    /// Otherwise panics, which should also return token to `sender_id`
    fn nft_on_transfer(
        &mut self,
        sender_id: AccountId,
        previous_owner_id: AccountId,
        token_id: TokenId,
        msg: String,
    ) -> PromiseOrValue<bool> {
        // Verifying that we were called by non-fungible token contract that we expect.
        assert_eq!(
            &env::predecessor_account_id(),
            &self.non_fungible_token_account_id,
            "Only supports the one non-fungible token contract"
        );
        log!(
            "in nft_on_transfer; sender_id={}, previous_owner_id={}, token_id={}, msg={}",
            &sender_id,
            &previous_owner_id,
            &token_id,
            msg
        );
        match msg.as_str() {
            "return-it-now" => PromiseOrValue::Value(true),
            "return-it-later" => {
                // Call ok_go with no attached deposit and all unspent GAS (weight of 1)
                Self::ext(env::current_account_id())
                    .ok_go(true).into()
            }
            "keep-it-now" => PromiseOrValue::Value(false),
            "keep-it-later" => {
                // Call ok_go with no attached deposit and all unspent GAS (weight of 1)
                Self::ext(env::current_account_id())
                    .ok_go(false).into()
            }
            _ => env::panic_str("unsupported msg"),
        }
    }
}

#[near_bindgen]
impl ValueReturnTrait for TokenReceiver {
    fn ok_go(&self, return_it: bool) -> PromiseOrValue<bool> {
        log!("in ok_go, return_it={}", return_it);
        PromiseOrValue::Value(return_it)
    }
}