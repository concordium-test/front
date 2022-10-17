/* eslint-disable no-console */
import React, { useEffect, useState, useMemo, useCallback } from "react";

import { detectConcordiumProvider } from "@concordium/browser-wallet-api-helpers";
// import PiggyBankV0 from "./myVersion";
import NFT from "./nftmint";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import { Button, Form } from "react-bootstrap";
import Rent from "./rent";

/**
 * Connect to wallet, setup application state context, and render children when the wallet API is ready for use.
 */
// [
//   "cis2_nft.balanceOf",
//   "cis2_nft.mint",
//   "cis2_nft.operatorOf",
//   "cis2_nft.setImplementors",
//   "cis2_nft.supports",
//   "cis2_nft.tokenMetadata",
//   "cis2_nft.transfer",
//   "cis2_nft.updateOperator",
//   "cis2_nft.view"
// ]
export default function Home() {
  const [account, setAccount] = useState();
  const [isConnected, setIsConnected] = useState(false);
  const [tab, setTab] = useState("NFT");

  const handleGetAccount = useCallback((accountAddress) => {
    console.log(accountAddress);
    setAccount(accountAddress);
    setIsConnected(Boolean(accountAddress));
  }, []);

  const handleOnClick = useCallback(
    () =>
      detectConcordiumProvider()
        .then((provider) => provider.connect())
        .then(handleGetAccount),
    []
  );

  useEffect(() => {
    detectConcordiumProvider()
      .then((provider) => {
        // Listen for relevant events from the wallet.
        provider.on("accountChanged", setAccount);
        provider.on("accountDisconnected", () =>
          provider.getMostRecentlySelectedAccount().then(handleGetAccount)
        );
        provider.on("chainChanged", (chain) => console.log(chain));
        // Check if you are already connected
        provider.getMostRecentlySelectedAccount().then(handleGetAccount);
      })
      .catch(() => setIsConnected(false));
  }, []);

  // const stateValue = useMemo(
  //   () => ({ isConnected, account }),
  //   [isConnected, account]
  // );

  return (
    <>
      <Navbar bg="dark" variant="dark">
        <Container>
          <Navbar.Brand href="#home">Rental NFT</Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link href="#mint" onClick={() => setTab("NFT")}>
              Mint
            </Nav.Link>
            <Nav.Link href="#rent" onClick={() => setTab("rent")}>
              Rent
            </Nav.Link>
            <Nav.Link href="#pricing">Pricing</Nav.Link>
          </Nav>
          <Button variant="secondary" onClick={handleOnClick}>
            {account ? account : "Connect"}
          </Button>
        </Container>
      </Navbar>

      <br />

      <main className="piggybank">
        {tab === "NFT" && <NFT account={account} />}
        {tab === "rent" && <Rent account={account} />}
      </main>
    </>
  );
}
// import { useEffect, useState } from "react";
// // import { detectConcordiumProvider } from "@concordium/browser-wallet-api-helpers";
// // import { WalletApi } from '@concordium/browser-wallet-api-helpers';
// async function detectConcordiumProvider(timeout = 5000) {
//   return new Promise((resolve, reject) => {
//     console.log("i am called");
//     if (window.concordium) {
//       resolve(window.concordium);
//     } else {
//       const t = setTimeout(() => {
//         if (window.concordium) {
//           resolve(window.concordium);
//         } else {
//           console.log("here i am reject");
//           reject();
//         }
//       }, timeout);
//       window.addEventListener(
//         "concordium#initialized",
//         () => {
//           if (window.concordium) {
//             clearTimeout(t);
//             resolve(window.concordium);
//           }
//         },
//         { once: true }
//       );
//     }
//   });
// }

// function Home() {
//   const [walletAddress, setWalletaddress] = useState("");
//   //   const callProvider = async () => {

//   //     console.log("here", window);
//   //     const provider = await detectConcordiumProvider();

//   //     console.log("this", provider);
//   //   };
//   useEffect(() => {
//     // callProvider();

//     // console.log(detectConcordiumProvider());
//     detectConcordiumProvider()
//       .then((provider) => {
//         // The API is ready for use.
//         console.log("this");
//         provider
//           .connect()
//           .then((accountAddress) => {
//             setWalletaddress(accountAddress);
//             console.log("contract address", accountAddress);
//             // The wallet is connected to the dApp.
//           })
//           .catch(() =>
//             console.log(
//               "Connection to the Concordium browser wallet was rejected."
//             )
//           );
//       })
//       .catch(() =>
//         console.log("Connection to the Concordium browser wallet timed out.")
//       );
//   }, []);

//   console.log("called");
//   return (
//     <div>
//       <h1>Address : {walletAddress}</h1>
//     </div>
//   );
// }

// export default Home;
