#!/bin/bash
echo ==== Quick Deploy ====
TEXT=$(printf 'y\n' | near dev-deploy --wasmFile res/non_fungible_token.wasm)
if [[ ! "$TEXT" =~ .*"Done deploying to".* ]]; then 
    echo -e "\033[0;31m FAIL \033[0m"
    exit 1 
else 
    echo -e "\033[0;32m SUCCESS \033[0m"
fi

echo ==== Set dev account env variable ====
source neardev/dev-account.env
TEXT=$(echo $CONTRACT_NAME)
if [[ ! "$TEXT" =~ .*"dev-".* ]]; then 
    echo -e "\033[0;31m FAIL \033[0m"
    exit 1 
else 
    echo -e "\033[0;32m SUCCESS \033[0m"
fi

echo ==== Initialize contract using the new method ====
TEXT=$(near call $CONTRACT_NAME new_default_meta '{"owner_id": "'$CONTRACT_NAME'"}' --accountId $CONTRACT_NAME)
if [[ ! "$TEXT" =~ .*"To see the transaction in the transaction explorer".* ]]; then 
    echo -e "\033[0;31m FAIL \033[0m"
    exit 1 
else 
    echo -e "\033[0;32m SUCCESS \033[0m"
fi

echo ==== View contract metadata ====
TEXT=$(near view $CONTRACT_NAME nft_metadata)
if [[ ! "$TEXT" =~ .*"Example NEAR non-fungible token".* ]]; then 
    echo -e "\033[0;31m FAIL \033[0m"
    exit 1 
else 
    echo -e "\033[0;32m SUCCESS \033[0m"
fi

echo ==== Mint NFT ==== 
TEXT=$(near call $CONTRACT_NAME nft_mint '{"token_id": "0", "receiver_id": "'$CONTRACT_NAME'", "token_metadata": { "title": "Olympus Mons", "description": "Tallest mountain in charted solar system", "media": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Olympus_Mons_alt.jpg/1024px-Olympus_Mons_alt.jpg", "copies": 1}}' --accountId $CONTRACT_NAME --deposit 0.1)
if [[ ! "$TEXT" =~ .*"To see the transaction in the transaction explorer, please open this url in your browser".* ]]; then
    echo -e "\033[0;31m FAIL \033[0m"
    exit 1 
else 
    echo -e "\033[0;32m SUCCESS \033[0m"
fi

echo ==== Create Sub Account ====
TEXT=$(near create-account alice.$CONTRACT_NAME --masterAccount $CONTRACT_NAME --initialBalance 10)
if [[ ! "$TEXT" =~ .*"Account alice.$CONTRACT_NAME for network".* ]]; then
    echo -e "\033[0;31m FAIL \033[0m"
    exit 1 
else 
    echo -e "\033[0;32m SUCCESS \033[0m"
fi

echo ==== Check Sub Account for Tokens ====
TEXT=$(near view $CONTRACT_NAME nft_tokens_for_owner '{"account_id": "'alice.$CONTRACT_NAME'"}')
if [[ ! "$TEXT" =~ .*"[]".* ]]; then
    echo -e "\033[0;31m FAIL \033[0m"
    exit 1 
else 
    echo -e "\033[0;32m SUCCESS \033[0m"
fi

echo ==== Transfer NFT ====
TEXT=$(near call $CONTRACT_NAME nft_transfer '{"token_id": "0", "receiver_id": "alice.'$CONTRACT_NAME'", "memo": "transfer ownership"}' --accountId $CONTRACT_NAME --depositYocto 1)
if [[ ! "$TEXT" =~ .*"To see the transaction in the transaction explorer, please open this url in your browser".* ]]; then
    echo -e "\033[0;31m FAIL \033[0m"
    exit 1 
else 
    echo -e "\033[0;32m SUCCESS \033[0m"
fi
