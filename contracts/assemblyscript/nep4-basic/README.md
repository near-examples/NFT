Minimal NEP#4 Implementation
============================

This contract implements bare-minimum functionality to satisfy the [NEP#4](https://github.com/nearprotocol/NEPs/pull/4) specification


Notable limitations of this implementation
==========================================

* Anyone can mint tokens (!!) until the supply is maxed out
* You cannot give another account escrow access to a limited set of your tokens; an escrow must be trusted with all of your tokens or none at all
* You cannot name more than one account as an escrow
* No functions to return the maximum or current supply of tokens
* No functions to return metadata such as the name or symbol of this NFT
* No functions (or storage primitives) to find all tokens belonging to a given account
* Usability issues: some functions (`revoke_access`, `transfer`, `get_token_owner`) do not verify that they were given sensible inputs; if given non-existent keys, the errors they throw will not be very useful

Still, if you track some of this information in an off-chain database, these limitations may be acceptable for your needs. In that case, this implementation may help reduce gas and storage costs.


Notable additions that go beyond the specification of NEP#4
===========================================================

`mint_to`: the spec gives no guidance or requirements on how tokens are minted/created/assigned. If this implementation of `mint_to` is close to matching your needs, feel free to ship your NFT with only minor modifications (such as caller verification). If you'd rather go with a strategy such as minting the whole supply of tokens upon deploy of the contract, or something else entirely, you may want to drastically change this behavior.
