/* eslint-disable no-console */
import React, { useEffect, useState, useContext, useRef } from "react";
import { toBuffer } from "@concordium/web-sdk";
import { detectConcordiumProvider } from "@concordium/browser-wallet-api-helpers";
import {
  deserializeContractState,
  InstanceInfoV0,
  isInstanceInfoV0,
  AccountTransactionType,
  GtuAmount,
  UpdateContractPayload,
} from "@concordium/web-sdk";
// import { smash, deposit, state, CONTRACT_NAME } from "./utils";

import PiggyIcon from "./assets/piggy-bank-solid.svg";
import HammerIcon from "./assets/hammer-solid.svg";

// V1 Module reference on testnet: 12362dd6f12fabd95959cafa27e512805161467b3156c7ccb043318cd2478838
const CONTRACT_INDEX = 1350n; // V1 instance

/** If you want to test smashing the piggy bank,
 * it will be necessary to instantiate your own piggy bank using an account available in the browser wallet,
 * and change this constant to match the index of the instance.
 */
/** Should match the subindex of the instance targeted. */
const CONTRACT_SUB_INDEX = 0n;
const CONTRACT_NAME = "PiggyBank";
async function updateState(setSmashed, setAmount) {
  const provider = await detectConcordiumProvider();
  const res = await provider.getJsonRpcClient().invokeContract({
    method: `${CONTRACT_NAME}.view`,
    contract: { index: CONTRACT_INDEX, subindex: CONTRACT_SUB_INDEX },
  });
  if (!res || res.tag === "failure" || !res.returnValue) {
    throw new Error(`Expected succesful invocation`);
  }
  setSmashed(!!Number(res.returnValue.substring(0, 2)));
  setAmount(toBuffer(res.returnValue.substring(2), "hex").readBigUInt64LE(0));
}

export default function PiggyBank({ account }) {
  //   const { account, isConnected } = useContext(state);
  let isConnected = true;
  const [owner, setOwner] = useState();
  const [smashed, setSmashed] = useState();
  const [amount, setAmount] = useState(0n);
  const input = useRef(null);

  useEffect(() => {
    if (isConnected) {
      // Get piggy bank owner.
      detectConcordiumProvider()
        .then((provider) =>
          provider.getJsonRpcClient().getInstanceInfo({
            index: CONTRACT_INDEX,
            subindex: CONTRACT_SUB_INDEX,
          })
        )
        .then((info) => {
          console.log(info);
          if (info?.name !== `init_${CONTRACT_NAME}`) {
            // Check that we have the expected instance.
            throw new Error(`Expected instance of PiggyBank: ${info?.name}`);
          }

          setOwner(info.owner.address);
        });
    }
  }, [isConnected]);

  // The internal state of the piggy bank, which is either intact or smashed.
  useEffect(() => {
    if (isConnected) {
      updateState(setSmashed, setAmount);
    }
  }, [isConnected]);

  // Disable use if we're not connected or if piggy bank has already been smashed.
  const canUse = isConnected && smashed !== undefined && !smashed;
  const smash = (account, index, subindex = 0n) => {
    detectConcordiumProvider()
      .then((provider) => {
        provider
          .sendTransaction(
            account,
            AccountTransactionType.UpdateSmartContractInstance,
            {
              amount: new GtuAmount(0n), // This feels weird? Why do I need an amount for a non-payable receive?
              contractAddress: {
                index,
                subindex,
              },
              receiveName: `${CONTRACT_NAME}.smash`,
              maxContractExecutionEnergy: 30000n,
            }
          )
          .then((txHash) =>
            console.log(
              `https://testnet.ccdscan.io/?dcount=1&dentity=transaction&dhash=${txHash}`
            )
          )
          .catch(alert);
      })
      .catch(() => {
        throw new Error("Concordium Wallet API not accessible");
      });
  };

  const deposit = (account, index, subindex = 0n, amount = 0) => {
    if (!Number.isInteger(amount) || amount <= 0) {
      return;
    }
    detectConcordiumProvider()
      .then((provider) => {
        provider
          .sendTransaction(
            account,
            AccountTransactionType.UpdateSmartContractInstance,
            {
              amount: new GtuAmount(BigInt(amount)),
              contractAddress: {
                index,
                subindex,
              },
              receiveName: `${CONTRACT_NAME}.insert`,
              maxContractExecutionEnergy: 30000n,
            }
          )
          .then((txHash) =>
            console.log(
              `https://testnet.ccdscan.io/?dcount=1&dentity=transaction&dhash=${txHash}`
            )
          )
          .catch(alert);
      })
      .catch(() => {
        throw new Error("Concordium Wallet API not accessible");
      });
  };

  return (
    <>
      {owner === undefined ? (
        <div>Loading piggy bank...</div>
      ) : (
        <>
          <h1 className="stored">{Number(amount) / 1000000} CCD</h1>
          <div>
            Owned by
            <br />
            {owner}
          </div>
          <br />
          <div>State: {smashed ? "Smashed" : "Intact"}</div>
          <button
            type="button"
            onClick={() => updateState(setSmashed, setAmount)}
          >
            ↻
          </button>
        </>
      )}
      <br />
      <label>
        <div className="container">
          <input
            className="input"
            type="number"
            placeholder="Deposit amount"
            ref={input}
          />
          <button
            className="deposit"
            type="button"
            onClick={() =>
              account &&
              deposit(
                account,
                CONTRACT_INDEX,
                CONTRACT_SUB_INDEX,
                input.current?.valueAsNumber
              )
            }
            disabled={account === undefined || !canUse}
          >
            deposit
          </button>
        </div>
      </label>
      <br />
      <br />
      <button
        className="smash"
        type="button"
        onClick={() =>
          account && smash(account, CONTRACT_INDEX, CONTRACT_SUB_INDEX)
        }
        disabled={account === undefined || account !== owner || !canUse} // The smash button is only active for the contract owner.
      >
        HammerIcon
      </button>
    </>
  );
}

// import React, { useEffect, useState, useMemo, useContext, useRef } from "react";

// import { detectConcordiumProvider } from "@concordium/browser-wallet-api-helpers";
// const CONTRACT_NAME = "PiggyBank";
// const CONTRACT_INDEX = 1350n; // V0 instance
// const CONTRACT_SUB_INDEX = 0n;
// const CONTRACT_SCHEMA = toBuffer(
//   "bca89c02a9f3f927175ee1e4bc561ddc7e1e115900908ea9471ea7391170b797",
//   "base64"
// );

// export default function PiggyBankV0({ account }) {
//   //   const { account, isConnected } = useContext();
//   const [piggybank, setPiggyBank] = useState();
//   const input = useRef(null);

//   const isPiggybankSmashed = (piggyState) => piggyState.Smashed !== undefined;

//   useEffect(() => {
//     // Get piggy bank data.
//     detectConcordiumProvider()
//       .then((provider) =>
//         provider.getJsonRpcClient().getInstanceInfo({
//           index: CONTRACT_INDEX,
//           subindex: CONTRACT_SUB_INDEX,
//         })
//       )
//       .then((info) => {
//         console.log("info", info);
//         if (info?.name !== `init_${CONTRACT_NAME}`) {
//           // Check that we have the expected instance.
//           throw new Error(`Expected instance of PiggyBank: ${info?.name}`);
//         }
//         if (!isInstanceInfoV0(info)) {
//           // Check smart contract version. We expect V0.
//           throw new Error("Expected SC version 0");
//         }

//         setPiggyBank(info);
//       });
//   }, []);

//   const piggyBankState = useMemo(
//     () =>
//       piggybank?.model !== undefined
//         ? deserializeContractState(
//             CONTRACT_NAME,
//             CONTRACT_SCHEMA,
//             piggybank.model
//           )
//         : undefined,
//     [piggybank?.model]
//   );
//   const canUse =
//     piggyBankState !== undefined && !isPiggybankSmashed(piggyBankState);

//   const smash = (account, index, subindex = 0n) => {
//     detectConcordiumProvider()
//       .then((provider) => {
//         provider
//           .sendTransaction(
//             account,
//             AccountTransactionType.UpdateSmartContractInstance,
//             {
//               amount: new GtuAmount(0n), // This feels weird? Why do I need an amount for a non-payable receive?
//               contractAddress: {
//                 index,
//                 subindex,
//               },
//               receiveName: `${CONTRACT_NAME}.smash`,
//               maxContractExecutionEnergy: 30000n,
//             }
//           )
//           .then((txHash) =>
//             console.log(
//               `https://testnet.ccdscan.io/?dcount=1&dentity=transaction&dhash=${txHash}`
//             )
//           )
//           .catch(alert);
//       })
//       .catch(() => {
//         throw new Error("Concordium Wallet API not accessible");
//       });
//   };

//   const deposit = (account, index, subindex = 0n, amount = 0) => {
//     if (!Number.isInteger(amount) || amount <= 0) {
//       return;
//     }
//     detectConcordiumProvider()
//       .then((provider) => {
//         provider
//           .sendTransaction(
//             account,
//             AccountTransactionType.UpdateSmartContractInstance,
//             {
//               amount: new GtuAmount(BigInt(amount)),
//               contractAddress: {
//                 index,
//                 subindex,
//               },
//               receiveName: `${CONTRACT_NAME}.insert`,
//               maxContractExecutionEnergy: 30000n,
//             }
//           )
//           .then((txHash) =>
//             console.log(
//               `https://testnet.ccdscan.io/?dcount=1&dentity=transaction&dhash=${txHash}`
//             )
//           )
//           .catch(alert);
//       })
//       .catch(() => {
//         throw new Error("Concordium Wallet API not accessible");
//       });
//   };
//   return (
//     <>
//       {piggybank === undefined ? (
//         <div>Loading piggy bank...</div>
//       ) : (
//         <>
//           <h1 className="stored">
//             {Number(piggybank?.amount.microGtuAmount) / 1000000} CCD
//           </h1>
//           <div>
//             Owned by
//             <br />
//             {piggybank?.owner.address}
//           </div>
//           <br />
//           <div>
//             State: {isPiggybankSmashed(piggyBankState) ? "Smashed" : "Intact"}
//           </div>
//         </>
//       )}
//       <br />
//       <label>
//         <div className="container">
//           <input
//             className="input"
//             type="number"
//             placeholder="Deposit amount"
//             ref={input}
//           />
//           <button
//             className="deposit"
//             type="button"
//             onClick={() =>
//               account &&
//               deposit(
//                 account,
//                 CONTRACT_INDEX,
//                 CONTRACT_SUB_INDEX,
//                 input.current?.valueAsNumber
//               )
//             }
//             disabled={account === undefined || !canUse}
//           >
//             PiggyIcon
//           </button>
//         </div>
//       </label>
//       <br />
//       <br />
//       <button
//         className="smash"
//         type="button"
//         onClick={() =>
//           account && smash(account, CONTRACT_INDEX, CONTRACT_SUB_INDEX)
//         }
//         disabled={
//           account === undefined ||
//           account !== piggybank?.owner.address ||
//           !canUse
//         } // The smash button is only active for the contract owner.
//       >
//         HammerIcon
//       </button>
//     </>
//   );
// }
