import * as splToken from '@solana/spl-token'
import {Transaction} from '@solana/web3.js';
import { programIds } from './programIds';

/**
 * @remarks 
 * A utility function to create the associative account
 * @param {*} connection // connection to the cluster
 * @param {*} payer // payer of the transaction, if any takes place
 * @param {*} mintPubKey // public key of the mint authority, with whom the associative accounts needs to be mapped
 * @param {*} ownerPubkey // owner public key, most of the time minPubkey will be same
 * @param {*} associatedTokenPubkey // the account which needs to be mapped/created as an associative account
 * @returns 
 */
export const createAssociateAccountFromMintKey = async (connection, payer, mintPubkey, ownerPubkey, associatedTokenPubkey) => {  

    const transaction = new Transaction().add(
      splToken.Token.createAssociatedTokenAccountInstruction(
        programIds.associatedToken,
        programIds.token,
        mintPubkey,
        associatedTokenPubkey,
        ownerPubkey,
        payer.publicKey
      )
    );
    transaction.feePayer = payerPubkey;
    console.log('Getting recent blockhash');
    transaction.recentBlockhash = (
      await connection.getRecentBlockhash()
    ).blockhash;
    let signed = await payer.signTransaction(transaction);
    let signature = await connection.sendRawTransaction(signed.serialize());
    let confirmed = await connection.confirmTransaction(signature);
    
    return {status: true, signature: confirmed, associatedTokenPubkey};
}