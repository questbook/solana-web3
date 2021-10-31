import './App.css';
import { Connection, PublicKey } from "@solana/web3.js";
import * as web3 from '@solana/web3.js';
import { createNewMintAuthority } from './utils/createNewMintAuthority';
import { useEffect, useState } from 'react';
import { mintTokenToAssociatedAccount } from './utils/mintTokenToAssociatedAccount';
import { transferCustomToken } from './utils/transferCustomToken';
import { createAssociatedAccountFromMintKeyAndMint } from './utils/createAssociatedAccountFromMintKeyAndMint';
import nftImage from './nftImage.png'
import { Creator, dataURLtoFile, mintNFT } from './utils/nftCreation';
import domToImage from 'dom-to-image';
import { programIds } from './utils/programIds';
import { burn } from './utils/nftBurn';
import { stakeSOL } from './utils/stakeSOL';

const NETWORK = web3.clusterApiUrl("devnet");
const connection = new Connection(NETWORK);
const decimals = 9

function App() {

  const [provider, setProvider] = useState()
  const [providerPubKey, setProviderPub] = useState()
  const [mintSignature, setMintTransaction] = useState()
  const [tokenSignature, setTokenTransaction] = useState()
  const [tokenSignatureAirdrop , setAirdropTransaction] = useState()
  const [nftDetails, setNftDetails] = useState({})
  const [nftBurnSignature, setNftBurnSignature] = useState()

  const [stakeSOLDetails, setStakeSOLDetails ] = useState({})

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

const convertDOMtoBase64 = async () => {
  const node = document.getElementById('nftImage');
  return domToImage.toPng(node);
};


const mintNewNFT = async () =>{
  try{
    const img = await convertDOMtoBase64();
    const templateImage = dataURLtoFile(img, 'My_NFT.png');
    const ownerPublicKey = new PublicKey(provider.publicKey).toBase58();
    const selfCreator = new Creator({
      address: ownerPublicKey,
      verified: true,
      share: 100,
    });
    const metadata = {
      name: `SOLG_NFT`,
      symbol: 'MNFT',
      creators: [selfCreator],
      description: '',
      sellerFeeBasisPoints: 0,
      image: templateImage.name,
      animation_url: '',
      external_url: '',
      properties: {
        files: [templateImage],
        category: 'image',
      },
    };

    const _nft = await mintNFT(
      connection,
      provider,
      {},
      [templateImage],
      metadata,
      1000000000
    );
    setNftDetails(_nft)
  }catch(err){
    console.log(err)
  }
}


const burnNFT = async () =>{
  const account = new PublicKey(nftDetails.account); //account address where the NFT is being minted
    const owner = provider;
    const multiSigners = [];
    const amount = 1;
    const connectionParam = connection;
    const programId = programIds.token; //second wallet in sol chain
    const publicKey = new PublicKey( nftDetails.mintKey); //nftMintKey you will receive while creating the NFT
    const payer = provider;
    const burnResult = await burn(
      account,
      owner,
      multiSigners,
      amount,
      connectionParam,
      programId,
      publicKey,
      payer
    );
    setNftBurnSignature(burnResult)
}


/**
 * Stake SOL function invocation
 */
const stakeSOLHandler = async () => {
  try{
      const totalSolToStake = 1 * web3.LAMPORTS_PER_SOL; // in SOL
      const result = await stakeSOL(totalSolToStake, provider, connection)
      setStakeSOLDetails(result)
  }catch(err){
    console.log(err,'---stake error---')
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
           <button onClick={transferTokenToAssociateAccountHandler}> {tokenSignature ? `Token transferred, signature: ${tokenSignature}`:'Transfer Token' } </button> 
           <button onClick={airdropToUserWallet}> {tokenSignatureAirdrop ? `Token airdropped, signature: ${tokenSignatureAirdrop}`:'Airdrop Token' } </button>*/}
           
           {/* <br></br>
           <img src={nftImage} style={{width:"200px"}} id="nftImage"></img>
          <button onClick={mintNewNFT}> {nftDetails && nftDetails.mintKey ? `NFT created, mintkey: ${nftDetails.mintKey}`:'Create NFT' } </button>
          <button onClick={burnNFT}> {nftBurnSignature ? `NFT burnt, signature: ${nftBurnSignature}`:'Burn NFT' } </button> */}
          <button onClick={stakeSOLHandler}> {stakeSOLDetails && stakeSOLDetails.newStakingAccountPubKey? `Staked SOL acccount: ${stakeSOLDetails.newStakingAccountPubKey}` : `Stake SOL` } </button>
      </header>
    </div>
  );
}

export default App;
