export async function loadNFTHistory(TOKEN_ID) {
    let offset = '';

    const nfttransactions = [];
    while (true) {
        const accountHistory = await (await fetch(`https://helper.mainnet.near.org/account/psalomo.near/activity?offset=${offset}&limit=100`)).json();
        
        nfttransactions.push(...accountHistory.filter(tx => tx.action_kind === 'FUNCTION_CALL' && (
                    tx.args.method_name.indexOf('buy') > -1
                ) 
            && JSON.parse(atob(tx.args.args_base64)).token_id === TOKEN_ID
            ));
        
        nfttransactions.push(...accountHistory.filter(tx =>
                tx.action_kind === 'FUNCTION_CALL' &&
                tx.args.method_name.indexOf('mint') > -1
            ) 
        );
        if (accountHistory.length === 0) {
            break;
        }
        offset = accountHistory[accountHistory.length -1].block_timestamp
    }   
    console.log(nfttransactions);
}