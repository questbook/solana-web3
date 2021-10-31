import { Authorized, Keypair, PublicKey, StakeProgram, Transaction } from "@solana/web3.js"

/**
 * 
 * @param {*} totalSolToStake : total amount in Lamports to be staked
 * @param {*} provider : wallet the DApp is connected to, it will also act as the authoriser for the new staking account
 * @param {*} connection : connection instance to the Solana Cluster
 * @returns : {
 * newStakingAccountPubKey: public key of the newly created staking account
 * transactionId: transaction id all the transaction which took place
 * }
 */
export const stakeSOL = async (totalSolToStake, provider,connection) => {
    totalSolToStake = totalSolToStake || 1 * 1000000000  //1 SOL in lamports
    if (!provider || (provider && !provider.isConnected)) {
      return "Wallet is not connected, please connect the wallet"

    }

    //TODO: hardcoded validator's voting account from solanaBeach
    // Validators needs to be fetched using Solana RPC call for getProgramAccounts
    const votingAccountToDelegate = new PublicKey('BXKwE3p8gmwwnepGxpgo1bUSU1pLzGZoNUC1dFUcbG3t')

    const newStakingAccount = Keypair.generate() //generate and return the new keypair to make it as a staking account
    //  await PublicKey.createProgramAddress(  //generate new keypair to make it as a staking account from Seed
    //   provider.publicKey,
    //   GREETING_SEED,
    //   programId,
    // );
      const staker = provider.publicKey; //who is going to be authorized owner for staking the amount
      const withdrawer = staker;//who is going to be authorized owner for making other changes to the staking account
      const authorizedStakerInstance = new Authorized(staker, withdrawer); //creating a class for Authorized from the web3 reverse Engineering
      
      //create the new staking account for the newly generated keypair
      const transaction = new Transaction().add(
        // createAccount
          StakeProgram.createAccount({
            fromPubkey: provider.publicKey,
            stakePubkey: newStakingAccount.publicKey,
            authorized: authorizedStakerInstance,
            lamports:totalSolToStake
          })
      );
      transaction.recentBlockhash = (
          await connection.getRecentBlockhash()
        ).blockhash;
    transaction.feePayer = provider.publicKey;
    
    //In the same transaction trying to delegate the amount of SOL but it can be done later too with right staker key
    transaction.add(
        StakeProgram.delegate({
            stakePubkey: newStakingAccount.publicKey,
            authorizedPubkey:staker,
            votePubkey: votingAccountToDelegate
          })
    );

    //****** MOST CRUCIAL STEP ******
    // the transaction needs to be signed partially as web3 creates a intermediate transaction (INTR)while creating the account for staking
    // this INTR needs to be signed explicitly from the publickey of the newly generated keypair public key
    transaction.partialSign(newStakingAccount);

    /**
     * Below are the common steps for any transaction to go through the on-chain program via web3 signing process
     */
    try{
      let signed = await provider.signTransaction(transaction);
      console.log('Got signature, submitting transaction', signed);
      let signature = await connection.sendRawTransaction(signed.serialize());
      console.log(
        'Submitted transaction ' + signature + ', awaiting confirmation'
      );
      await connection.confirmTransaction(signature);
      console.log('Transaction ' + signature + ' confirmed');
      
      return {newStakingAccountPubKey: newStakingAccount.publicKey, transactionId: signature}
    }catch(err){
      console.log(err,'----err----')
    }

}