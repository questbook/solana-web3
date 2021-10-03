import * as BufferLayout from 'buffer-layout';
import { SystemProgram, Transaction, PublicKey, Account, TransactionInstruction } from '@solana/web3.js';
import { SYSVAR_RENT_PUBKEY } from '@solana/web3.js';

const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);
const programIds = {
    token: TOKEN_PROGRAM_ID,
}
const MINT_LAYOUT = BufferLayout.struct([
  BufferLayout.blob(44),
  BufferLayout.u8('decimals'),
  BufferLayout.blob(37),
]);

const LAYOUT = BufferLayout.union(BufferLayout.u8('instruction'));
LAYOUT.addVariant(
  0,
  BufferLayout.struct([
    BufferLayout.u8('decimals'),
    BufferLayout.blob(32, 'mintAuthority'),
    BufferLayout.u8('freezeAuthorityOption'),
    BufferLayout.blob(32, 'freezeAuthority'),
  ]),
  'initializeMint',
);
LAYOUT.addVariant(1, BufferLayout.struct([]), 'initializeAccount');
LAYOUT.addVariant(
  7,
  BufferLayout.struct([BufferLayout.nu64('amount')]),
  'mintTo',
);
LAYOUT.addVariant(
  8,
  BufferLayout.struct([BufferLayout.nu64('amount')]),
  'burn',
);
LAYOUT.addVariant(9, BufferLayout.struct([]), 'closeAccount');
LAYOUT.addVariant(
  12,
  BufferLayout.struct([BufferLayout.nu64('amount'), BufferLayout.u8('decimals')]),
  'transferChecked',
);

export const createNewMintAuthority = async (wallet, decimals=9, connection) =>{
  let mint = new Account();
   const signature = await createAndInitializeMint({
      connection,
      owner: wallet,
      mint,
      decimals,
    })
    
    await connection.confirmTransaction(signature);
    return {signature, mintAccount: mint};
}

async function createAndInitializeMint({
  connection,
  owner, // Wallet for paying fees and allowed to mint new tokens
  mint, // Account to hold token information
  decimals
}) {
  let transaction = new Transaction();
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: owner.publicKey, //the owner account with which we want to map the mint key
      newAccountPubkey: mint.publicKey, // the mint keypair's public key, which will be used as token address
      lamports: await connection.getMinimumBalanceForRentExemption(
        MINT_LAYOUT.span,
      ), // Important: To create the account and make it rent free, minimum number of lamports are given by getMinimumBalanceForRentExemption utility function
      space: MINT_LAYOUT.span, //Important: It is the minimum space which will be held by the mint acount
      programId: programIds.token, // This is the ID of the on-chain program of token, this on-chain contains all the interfaces to create the new token
    }),
  );
  transaction.add(
    initializeMint({
      mint: mint.publicKey, // the mint's keypair public which will be converted to a token address
      decimals, //decimals represents the denomination we want to have in the token
      mintAuthority: owner.publicKey, // mintAuthority is the owner of this mint account who can perform actions like minting or burning of tokens
    }),
  );
  let signers = [mint];
  return signAndSendTransaction(connection, transaction, owner, signers);
}

function initializeMint({
  mint,
  decimals,
  mintAuthority,
  freezeAuthority,
}) {
  let keys = [
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      initializeMint: {
        decimals,
        mintAuthority: mintAuthority.toBuffer(),
        freezeAuthorityOption: !!freezeAuthority,
        freezeAuthority: (freezeAuthority || PublicKey.default).toBuffer(),
      },
    }),
    programId: programIds.token,
  });
}

async function signAndSendTransaction(
  connection,
  transaction,
  wallet,
  signers,
  skipPreflight = false,
) {
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash('max')
  ).blockhash; // As solana works on proof of history, hence every transaction in the solana blockchain requires the latest blockhash to be associated
              // Without the getRecentBlockhash, the validators will not be able to verify the transaction
  transaction.setSigners(
    // fee payed by the wallet owner
    wallet.publicKey,
    ...signers.map((s) => s.publicKey), // we will add all the intermediate signers required for the transaction, in our case mint keypair is also required.
                                        // Hence we have added the mint signer from the signers array.
  );

    if (signers.length > 0) {  //Any intermediate signer required in the transaction, requires to partially sign the transaction before the final transaction.
      transaction.partialSign(...signers);
    }


  transaction = await wallet.signTransaction(transaction);
  const rawTransaction = transaction.serialize();  //Serialization is the process of converting an object into a stream of bytes, 
                                                  //which can be used by on-chain programs to again de-serialize it to read the instructions 
                                                  //and perform actions on it.
  return await connection.sendRawTransaction(rawTransaction, {
    skipPreflight,  //preflight transaction check checks for the available methods before sending the transaction, which involves a very little latency
    //that is why skipPreflight is generally kept false, to save the network bandwidth. 
    preflightCommitment: 'single', 
    //For preflight checks and transaction processing, 
    //Solana nodes choose which bank state to query based on a commitment requirement set by the client. 
    //The commitment describes how finalized a block is at that point in time. When querying the ledger state, 
    //it's recommended to use lower levels of commitment to report progress and higher levels to ensure the state will not be rolled back.
    //For processing many dependent transactions in series, it's recommended to use "confirmed" commitment, 
    //which balances speed with rollback safety. For total safety, it's recommended to use"finalized" commitment.
  });
}

const instructionMaxSpan = Math.max(
  ...Object.values(LAYOUT.registry).map((r) => r.span),
);

function encodeTokenInstructionData(instruction) {
  let b = Buffer.alloc(instructionMaxSpan);
  let span = LAYOUT.encode(instruction, b);
  return b.slice(0, span);
}