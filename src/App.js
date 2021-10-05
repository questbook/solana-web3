import './App.css';
import { Connection } from "@solana/web3.js";
import * as web3 from '@solana/web3.js';
import { createNewMintAuthority } from './utils/createNewMintAuthority';
import { useEffect, useState } from 'react';
const NETWORK = web3.clusterApiUrl("devnet");
const connection = new Connection(NETWORK);
const decimals = 9

function App() {

  const [provider, setProvider] = useState()


  const mintNewToken = async () =>{
    if(provider && !provider.isConnected){
        provider.connect()
      }
    try{
      const mintResult = await createNewMintAuthority(provider, decimals, connection)
      console.log(mintResult.signature,'--- signature of the transaction---')
      console.log(mintResult.mintAccount,'----mintAccount---')
    }catch(err){

    }
}


  useEffect(() => {
    if (provider) {
        provider.on("connect", async() => {
          console.log("wallet got connected")
          await mintNewToken()
        });
        provider.on("disconnect", () => {
          console.log("Disconnected from wallet");
        });
    }
  }, [provider]);

  useEffect(() => {
    if ("solana" in window && !provider) {
      setProvider(window.solana)
    }
  },[])

  return (
    <div className="App">
      <header className="App-header">
          <button onClick={mintNewToken}>Create new token</button>
      </header>
    </div>
  );
}

export default App;
