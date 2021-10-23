import './App.css';
import { Connection, PublicKey } from "@solana/web3.js";
import * as web3 from '@solana/web3.js';
import { createNewMintAuthority } from './utils/createNewMintAuthority';
import { useEffect, useState } from 'react';
import { mintTokenToAssociatedAccount } from './utils/mintTokenToAssociatedAccount';
import { transferCustomToken } from './utils/transferCustomToken';
import { createAssociatedAccountFromMintKeyAndMint } from './utils/createAssociatedAccountFromMintKeyAndMint';
const NETWORK = web3.clusterApiUrl("devnet");
const connection = new Connection(NETWORK);
const decimals = 9

function App() {

  const [provider, setProvider] = useState()
  const [providerPubKey, setProviderPub] = useState()
  const [mintSignature, setMintTransaction] = useState()
  const [tokenSignature, setTokenTransaction] = useState()
  const [tokenSignatureAirdrop , setAirdropTransaction] = useState()

  const mintNewToken = async () =>{
    if(provider && !provider.isConnected){
        provider.connect()
      }
    try{
      const mintResult = await createNewMintAuthority(provider, decimals, connection)
      console.log(mintResult.signature,'--- signature of the transaction---')
      console.log(mintResult.mintAccount,'----mintAccount---')
    }catch(err){
      console.log(err
        )
    }
}

const mintTokenToAssociateAccountHandler = async () =>{
    try{
      const tokensToMint = 1
      const mintPubkey = 'Bw94Agu3j5bT89ZnXPAgvPdC5gWVVLxQpud85QZPv1Eb' //SOLG mint authority
      const associatedAccountPubkey = '8M8HtFqrMyfiVfvzFQPGb8TWRWZEGFxbFakeKaC7eBEz'
      const transactionSignature = await mintTokenToAssociatedAccount(provider, connection, tokensToMint, new PublicKey(mintPubkey), new PublicKey(associatedAccountPubkey), provider)
      setMintTransaction(transactionSignature.signature)
    }catch(err){
      console.log(err)
    }
  
}


const transferTokenToAssociateAccountHandler = async () =>{
    try{
      const tokensToMint = 1
      const fromCustomTokenAccountPubkey = '8M8HtFqrMyfiVfvzFQPGb8TWRWZEGFxbFakeKaC7eBEz' //associated account's public key of the connected wallet
      const toAssociatedAccountPubkey = 'EfhdzcbMiAToWYke12ZqN8PmYmyEgRWdFaSKBEhxXYir' //associated account's public key of the receiver's wallet
      const transactionSignature = await transferCustomToken(provider, connection, tokensToMint, new PublicKey(fromCustomTokenAccountPubkey), new PublicKey(toAssociatedAccountPubkey))
      setTokenTransaction(transactionSignature.signature)
    }catch(err){
      console.log(err)
    }
}

const airdropToUserWallet = async () =>{
  try{
    const tokensToAirdrop = 1
    const mintPubkey = 'Bw94Agu3j5bT89ZnXPAgvPdC5gWVVLxQpud85QZPv1Eb' // mintKey of the token to be minted
    const ownerPubkey = '4deyFHL6LG6NYvceo7q2t9Bz66jSjrg8A1BxJH1wAgie' //receiver's Solana wallet address
    
    const transactionSignature = await createAssociatedAccountFromMintKeyAndMint(connection, provider, new PublicKey(mintPubkey), new PublicKey(ownerPubkey),"",tokensToAirdrop)
    setAirdropTransaction(transactionSignature.transactionSignature)
  }catch(err){
    console.log(err)
  }
}

const connectToWallet = () =>{
  if(!provider && window.solana){
    setProvider(window.solana)
  }
  if(!provider){
    console.log("No provider found")
    return
  }
  if(provider && !provider.isConnected){
    provider.connect()
  }
}


  useEffect(() => {
    if (provider) {
        provider.on("connect", async() => {
          console.log("wallet got connected")
          setProviderPub(provider.publicKey)

        });
        provider.on("disconnect", () => {
          console.log("Disconnected from wallet");
        });
    }
  }, [provider]);

  useEffect(() => {
    if ("solana" in window && !provider) {
      console.log("Phantom wallet present")
      setProvider(window.solana)
    }
  },[])

  return (
    <div className="App">
      <header className="App-header">
          
           <button onClick={connectToWallet}> {providerPubKey ? 'Connected' : 'Connect'} to wallet {providerPubKey ? (providerPubKey).toBase58() : ""}</button>
           {/* <button onClick={mintNewToken}>Create new token</button>
           <button onClick={mintTokenToAssociateAccountHandler}> {mintSignature ? `Minted new token, signature: ${mintSignature}`: 'Mint New Token'} </button>
           <button onClick={transferTokenToAssociateAccountHandler}> {tokenSignature ? `Token transferred, signature: ${tokenSignature}`:'Transfer Token' } </button> */}
           <button onClick={airdropToUserWallet}> {tokenSignatureAirdrop ? `Token airdropped, signature: ${tokenSignatureAirdrop}`:'Airdrop Token' } </button>
      </header>
    </div>
  );
}

export default App;
