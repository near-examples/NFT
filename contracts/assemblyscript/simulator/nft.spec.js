const sim = require('near-sdk-simulator');

it('should buy a remix, put it up for sale, and another buying it', () => {
        const runtime = new sim.Runtime();
        const contract = runtime.newAccount('contract', 'contracts/assemblyscript/build/release/main.wasm');
        const peter = runtime.newAccount('peter');
        const bob = runtime.newAccount('bob');
        const alice = runtime.newAccount('alice');
        const carol = runtime.newAccount('carol');

        // peter is minting
        let result = peter.call_other('contract', 'mint_to_base64', {
                owner_id: 'peter', supportmixing: true,
                contentbase64: Buffer.from('test').toString('base64')
        }, null, '800000000000000000000');

        const token_id = JSON.parse(result.return_data);
        expect(token_id).toBe(1);

        // bob creates 2 remixes
        result = bob.call_other('contract', 'publish_token_mix',
                { token_id: token_id.toString(), mix: [] });
        expect(result.err).toBe(null);

        result = bob.call_other('contract', 'publish_token_mix',
                { token_id: token_id.toString(), mix: [] });
        expect(result.err).toBe(null);

        // let's view the remixes

        result = contract.view('get_token_mixes', { token_id: token_id.toString() });

        // alice buys the first remix ( fixed price 10 N )
        const first_mix = result.return_data[0];

        let contractBalanceBefore = contract.balance;
        result = alice.call_other('contract', 'buy_mix', { original_token_id: token_id.toString(), mix: first_mix },
                null, '10000000000000000000000000');

        expect(result.result.receipts[0].receiver_id).toBe('peter');
        // 4 N to peter
        expect(result.result.receipts[0].actions[0].Transfer.deposit).toBe(4 * Math.pow(10, 24));
        expect(result.result.receipts[1].receiver_id).toBe('bob');
        // 4 N to bob
        expect(result.result.receipts[1].actions[0].Transfer.deposit).toBe(4 * Math.pow(10, 24));
        // 2 N to contract
        expect(contract.balance - contractBalanceBefore).toBe(2 * Math.pow(10, 24));

        // let's view the remixes

        result = contract.view('get_token_mixes', { token_id: token_id.toString() });

        const mix_token_id = parseInt(result.return_data[0].split(';')[1].split(':')[1]);
        expect(mix_token_id).toBe(2);

        // alice puts it up for sale for 100 N
        result = alice.call_other('contract', 'sell_token',
                { token_id: mix_token_id.toString(), price: '100000000000000000000000000' });
        expect(result.err).toBe(null);

        expect(contract.call('view_remix_content', { token_id: mix_token_id.toString() }).return_data.indexOf('1;')).toBe(0);
        contractBalanceBefore = contract.balance;

        // carol buys it from Alice    
        result = carol.call_other('contract', 'buy_token',
                { token_id: (mix_token_id).toString() }, null, '100000000000000000000000000');
        expect(result.err).toBe(null);

        expect(result.result.receipts[0].receiver_id).toBe('alice');
        // 95% to alice
        expect(result.result.receipts[0].actions[0].Transfer.deposit).toBe(95 * Math.pow(10, 24));

        expect(result.result.receipts[1].receiver_id).toBe('peter');
        // 2% to peter
        expect(result.result.receipts[1].actions[0].Transfer.deposit).toBe(2 * Math.pow(10, 24));
        expect(result.result.receipts[2].receiver_id).toBe('bob');
        // 2% to bob
        expect(result.result.receipts[2].actions[0].Transfer.deposit).toBe(2 * Math.pow(10, 24));
        // 1 % to contract
        expect((contract.balance - contractBalanceBefore) / Math.pow(10, 20)).toBeCloseTo(Math.pow(10, 4));
});

it('should buy contract and transfer funds to beneficiary', () => {
        const runtime = new sim.Runtime();
        const contract = runtime.newAccount('contract', 'contracts/assemblyscript/build/release/main.wasm');
        contract.balance = '900000000000000000000';

        const peter = runtime.newAccount('peter');
        contract.call_other('contract', 'sell_contract_to', {
                sell_to_account_id: 'peter',
                amount: '800000'
        });
        peter.call_other('contract', 'buy_contract', {}, null, '800000');

        const result = peter.call_other('contract', 'transfer_funds', {
                amount: '800000000000000000000'
        });
        expect(result.err).toBe(null);
        expect(contract.balance).toBe('100000000000000800000');
        expect(result.result.receipts[0].receiver_id).toBe('peter');
        expect(result.result.receipts[0].actions[0].Transfer.deposit).toBe(800000000000000000000);
});

it('should upload web4 content', () => {
        const runtime = new sim.Runtime();
        const contract = runtime.newAccount('contract', 'contracts/assemblyscript/build/release/main.wasm');
        contract.balance = '900000000000000000000';

        const result = contract.call_other('contract', 'upload_web_content', {
                filename: '/',
                contentbase64: 'aGVsbG8K'
        });
        expect(result.err).toBe(null);
});
