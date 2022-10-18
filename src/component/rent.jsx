/* eslint-disable no-console */
import React, { useEffect, useState, useContext, useRef } from "react";
import { toBuffer, TransactionStatusEnum } from "@concordium/web-sdk";
import { Buffer } from "buffer";
import { detectConcordiumProvider } from "@concordium/browser-wallet-api-helpers";
import {
  deserializeContractState,
  InstanceInfoV0,
  isInstanceInfoV0,
  AccountTransactionType,
  GtuAmount,
  UpdateContractPayload,
  AccountAddress,
  serializeInitContractParameters,
  InvokeContractResult,
  serializeUpdateContractParameters,
} from "@concordium/web-sdk";
import Spinner from "react-bootstrap/Spinner";

import { RAW_SCHEMA } from "./constant";
import Button from "react-bootstrap/Button";
import { Alert, Card, Col, Form, ListGroup, Modal, Row } from "react-bootstrap";

// import { smash, deposit, state, CONTRACT_NAME } from "./utils";

// import PiggyIcon from "./assets/piggy-bank-solid.svg";
// import HammerIcon from "./assets/hammer-solid.svg";
// import { atob } from "buffer";
// import { stringify } from "querystring";

// V1 Module reference on testnet: 12362dd6f12fabd95959cafa27e512805161467b3156c7ccb043318cd2478838
const CONTRACT_INDEX = 1454n; // V1 instance

/** If you want to test smashing the piggy bank,
 * it will be necessary to instantiate your own piggy bank using an account available in the browser wallet,
 * and change this constant to match the index of the instance.
 */
/** Should match the subindex of the instance targeted. */
const CONTRACT_SUB_INDEX = 0n;
const CONTRACT_NAME = "cis2_nft";
// async function updateState(setSmashed, setAmount) {
//   const provider = await detectConcordiumProvider();
//   const res = await provider.getJsonRpcClient().invokeContract({
//     method: `${CONTRACT_NAME}.view`,
//     contract: { index: CONTRACT_INDEX, subindex: CONTRACT_SUB_INDEX },
//   });
//   if (!res || res.tag === "failure" || !res.returnValue) {
//     throw new Error(`Expected succesful invocation`);
//   }
//   console.log("response", res);
//   setSmashed(!!Number(res.returnValue.substring(0, 2)));
//   //   setAmount(toBuffer(res.returnValue.substring(2), "hex").readBigUInt64LE(0));
// }

// let obj = {
//   owner: {
//     Enum: [
//       {
//         Account: ["<AccountAddress>"],
//       },
//       {
//         Contract: [
//           {
//             index: "<UInt64>",
//             subindex: "<UInt64>",
//           },
//         ],
//       },
//     ],
//   },
//   tokens: ["<String with lowercase hex>"],
// };

// const newo = {
//   Enum: [
//     {
//       Account: ["2wkBET2rRgE8pahuaczxKbmv7ciehqsne57F9gtzf1PVdr2VP3"],
//     },
//     {
//       Contract: [
//         {
//           index: "1356",
//           subindex: "0",
//         },
//       ],
//     },
//   ],
// };

const obj = {
  owner: {
    Enum: [
      {
        Account: ["<AccountAddress>"],
      },
      {
        Contract: [
          {
            index: "<UInt64>",
            subindex: "<UInt64>",
          },
        ],
      },
    ],
  },
  tokens: ["<String with lowercase hex>"],
};

const statusMSG = {
  warning: "Transaction is processing !",
  danger: "Transaction failed !",
  success: "Transaction is Successfull !",
};

export default function Rent({ account }) {
  //   const { account, isConnected } = useContext(state);
  let isConnected = true;
  const [owner, setOwner] = useState();
  const [smashed, setSmashed] = useState();
  const [amount, setAmount] = useState(0n);
  const input = useRef(null);
  const [myNFTs, setMyNFTs] = useState(null);
  const [alertModal, setAlertModal] = useState(false);
  const [txnStatus, setTxnStatus] = useState("");
  const [lendModal, setLendModal] = useState(false);
  const [recieverAddress, setRecieverAddress] = useState("");
  const getBalanceOf = async (account) => {
    let myIds = [];
    Promise.all(
      [...Array(13).keys()].map(async (ele) => {
        let tokenID = "0000000" + (ele + 1);
        const stext = tokenID.length;
        tokenID = tokenID.substring(stext - 8, stext);
        const userInput = [
          {
            address: {
              Account: [account],
            },
            token_id: tokenID,
          },
        ];
        const inputParams = serializeUpdateContractParameters(
          CONTRACT_NAME,
          "balanceOf",
          userInput,
          toBuffer(RAW_SCHEMA, "base64")
        );
        const provider = await detectConcordiumProvider();
        const res = await provider.getJsonRpcClient().invokeContract({
          contract: { index: CONTRACT_INDEX, subindex: CONTRACT_SUB_INDEX },
          method: `${CONTRACT_NAME}.balanceOf`,
          parameter: inputParams,
        });
        console.log(res);
        if (res.tag === "success" && res.returnValue === "010001") {
          myIds.push(tokenID);
        }
      })
    ).then((values) => {
      setMyNFTs(myIds); // [3, 1337, "foo"]
    });
  };
  const viewfunc = async (account) => {
    const provider = await detectConcordiumProvider();
    const res = await provider.getJsonRpcClient().invokeContract({
      method: `${CONTRACT_NAME}.view`,
      contract: { index: CONTRACT_INDEX, subindex: CONTRACT_SUB_INDEX },
    });
    if (!res || res.tag === "failure" || !res.returnValue) {
      throw new Error(`Expected succesful invocation`);
    }
    console.log("viewFunct", res);
  };

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
          viewfunc();

          setOwner(info.owner.address);
        });
    }
  }, [isConnected]);

  // The internal state of the piggy bank, which is either intact or smashed.
  useEffect(() => {
    if (isConnected) {
      if (account) getBalanceOf(account);
      //   updateState(setSmashed, setAmount);
    }
  }, [isConnected]);

  const transfer = async (account, index, subindex = 0n) => {
    try {
      const provider = await detectConcordiumProvider();
      const txnHash = await provider.sendTransaction(
        account,
        AccountTransactionType.UpdateSmartContractInstance,
        {
          amount: new GtuAmount(0n), // This feels weird? Why do I need an amount for a non-payable receive?
          contractAddress: {
            index,
            subindex,
          },
          receiveName: `${CONTRACT_NAME}.transfer`,
          maxContractExecutionEnergy: 30000n,
          parameter: toBuffer(""),
        },
        [
          {
            from: { Account: [account] },
            to: {
              Account: [recieverAddress],
            },
            token_id: "00000003",
            amount: "1",
            data: "",
          },
        ],
        "//8CAQAAAAgAAABjaXMyX25mdAAJAAAACQAAAGJhbGFuY2VPZgYQARQAAgAAAAgAAAB0b2tlbl9pZB0ABwAAAGFkZHJlc3MVAgAAAAcAAABBY2NvdW50AQEAAAALCAAAAENvbnRyYWN0AQEAAAAMEAEbJQAAABUEAAAADgAAAEludmFsaWRUb2tlbklkAhEAAABJbnN1ZmZpY2llbnRGdW5kcwIMAAAAVW5hdXRob3JpemVkAgYAAABDdXN0b20BAQAAABUFAAAACwAAAFBhcnNlUGFyYW1zAgcAAABMb2dGdWxsAgwAAABMb2dNYWxmb3JtZWQCFAAAAFRva2VuSWRBbHJlYWR5RXhpc3RzAhMAAABJbnZva2VDb250cmFjdEVycm9yAgQAAABtaW50BBQAAgAAAAUAAABvd25lchUCAAAABwAAAEFjY291bnQBAQAAAAsIAAAAQ29udHJhY3QBAQAAAAwGAAAAdG9rZW5zEQAdABUEAAAADgAAAEludmFsaWRUb2tlbklkAhEAAABJbnN1ZmZpY2llbnRGdW5kcwIMAAAAVW5hdXRob3JpemVkAgYAAABDdXN0b20BAQAAABUFAAAACwAAAFBhcnNlUGFyYW1zAgcAAABMb2dGdWxsAgwAAABMb2dNYWxmb3JtZWQCFAAAAFRva2VuSWRBbHJlYWR5RXhpc3RzAhMAAABJbnZva2VDb250cmFjdEVycm9yAgoAAABvcGVyYXRvck9mBhABFAACAAAABQAAAG93bmVyFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADAcAAABhZGRyZXNzFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADBABARUEAAAADgAAAEludmFsaWRUb2tlbklkAhEAAABJbnN1ZmZpY2llbnRGdW5kcwIMAAAAVW5hdXRob3JpemVkAgYAAABDdXN0b20BAQAAABUFAAAACwAAAFBhcnNlUGFyYW1zAgcAAABMb2dGdWxsAgwAAABMb2dNYWxmb3JtZWQCFAAAAFRva2VuSWRBbHJlYWR5RXhpc3RzAhMAAABJbnZva2VDb250cmFjdEVycm9yAg8AAABzZXRJbXBsZW1lbnRvcnMEFAACAAAAAgAAAGlkFgAMAAAAaW1wbGVtZW50b3JzEAIMFQQAAAAOAAAASW52YWxpZFRva2VuSWQCEQAAAEluc3VmZmljaWVudEZ1bmRzAgwAAABVbmF1dGhvcml6ZWQCBgAAAEN1c3RvbQEBAAAAFQUAAAALAAAAUGFyc2VQYXJhbXMCBwAAAExvZ0Z1bGwCDAAAAExvZ01hbGZvcm1lZAIUAAAAVG9rZW5JZEFscmVhZHlFeGlzdHMCEwAAAEludm9rZUNvbnRyYWN0RXJyb3ICCAAAAHN1cHBvcnRzBhABFgAQARUDAAAACQAAAE5vU3VwcG9ydAIHAAAAU3VwcG9ydAIJAAAAU3VwcG9ydEJ5AQEAAAAQAAwVBAAAAA4AAABJbnZhbGlkVG9rZW5JZAIRAAAASW5zdWZmaWNpZW50RnVuZHMCDAAAAFVuYXV0aG9yaXplZAIGAAAAQ3VzdG9tAQEAAAAVBQAAAAsAAABQYXJzZVBhcmFtcwIHAAAATG9nRnVsbAIMAAAATG9nTWFsZm9ybWVkAhQAAABUb2tlbklkQWxyZWFkeUV4aXN0cwITAAAASW52b2tlQ29udHJhY3RFcnJvcgINAAAAdG9rZW5NZXRhZGF0YQYQAR0AEAEUAAIAAAADAAAAdXJsFgEEAAAAaGFzaBUCAAAABAAAAE5vbmUCBAAAAFNvbWUBAQAAABMgAAAAAhUEAAAADgAAAEludmFsaWRUb2tlbklkAhEAAABJbnN1ZmZpY2llbnRGdW5kcwIMAAAAVW5hdXRob3JpemVkAgYAAABDdXN0b20BAQAAABUFAAAACwAAAFBhcnNlUGFyYW1zAgcAAABMb2dGdWxsAgwAAABMb2dNYWxmb3JtZWQCFAAAAFRva2VuSWRBbHJlYWR5RXhpc3RzAhMAAABJbnZva2VDb250cmFjdEVycm9yAggAAAB0cmFuc2ZlcgQQARQABQAAAAgAAAB0b2tlbl9pZB0ABgAAAGFtb3VudBslAAAABAAAAGZyb20VAgAAAAcAAABBY2NvdW50AQEAAAALCAAAAENvbnRyYWN0AQEAAAAMAgAAAHRvFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAECAAAADBYBBAAAAGRhdGEdARUEAAAADgAAAEludmFsaWRUb2tlbklkAhEAAABJbnN1ZmZpY2llbnRGdW5kcwIMAAAAVW5hdXRob3JpemVkAgYAAABDdXN0b20BAQAAABUFAAAACwAAAFBhcnNlUGFyYW1zAgcAAABMb2dGdWxsAgwAAABMb2dNYWxmb3JtZWQCFAAAAFRva2VuSWRBbHJlYWR5RXhpc3RzAhMAAABJbnZva2VDb250cmFjdEVycm9yAg4AAAB1cGRhdGVPcGVyYXRvcgQQARQAAgAAAAYAAAB1cGRhdGUVAgAAAAYAAABSZW1vdmUCAwAAAEFkZAIIAAAAb3BlcmF0b3IVAgAAAAcAAABBY2NvdW50AQEAAAALCAAAAENvbnRyYWN0AQEAAAAMFQQAAAAOAAAASW52YWxpZFRva2VuSWQCEQAAAEluc3VmZmljaWVudEZ1bmRzAgwAAABVbmF1dGhvcml6ZWQCBgAAAEN1c3RvbQEBAAAAFQUAAAALAAAAUGFyc2VQYXJhbXMCBwAAAExvZ0Z1bGwCDAAAAExvZ01hbGZvcm1lZAIUAAAAVG9rZW5JZEFscmVhZHlFeGlzdHMCEwAAAEludm9rZUNvbnRyYWN0RXJyb3ICBAAAAHZpZXcBFAACAAAABQAAAHN0YXRlEAIPFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADBQAAgAAAAwAAABvd25lZF90b2tlbnMQAh0ACQAAAG9wZXJhdG9ycxACFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADAoAAABhbGxfdG9rZW5zEAIdAA==",
        1
      );
      console.log("txnhash", txnHash);
    } catch (err) {
      console.log("this is err", err);
    }
  };

  const lendNFT = async (account, index, subindex = 0n) => {
    console.log("this", recieverAddress);
    try {
      const provider = await detectConcordiumProvider();
      provider
        .sendTransaction(
          account,
          AccountTransactionType.UpdateSmartContractInstance,
          {
            amount: new GtuAmount(10000000n), // This feels weird? Why do I need an amount for a non-payable receive?
            contractAddress: {
              index,
              subindex,
            },
            receiveName: `${CONTRACT_NAME}.rent`,
            maxContractExecutionEnergy: 50000n,
            parameter: toBuffer(""),
          },

          {
            _from: {
              Account: ["3d71NUkw1F1dCR7tgtEkBUEtZqEmcXbmoizpWcMcr761hgwj6m"],
            },
            _to: {
              Account: [recieverAddress],
            },
            _interestRate: "00000001",
            _loanCompleteTime: "2022-10-17T12:50:15+00:00",
            _maxLoanAmount: "1",
            _tokenId: "00000012",
            collateral_amount: 1,
            receiver_addr: "3d71NUkw1F1dCR7tgtEkBUEtZqEmcXbmoizpWcMcr761hgwj6m",
          },

          RAW_SCHEMA,
          1
        )
        .then((txHash) => {
          setTxnStatus("warning");
          setAlertModal(true);
          setTimeout(function listen() {
            provider
              .getJsonRpcClient()
              .getTransactionStatus(txHash)
              .then((status) => {
                if (
                  status &&
                  status.status === TransactionStatusEnum.Finalized &&
                  status.outcomes
                ) {
                  const outcome = Object.values(status.outcomes)[0];
                  if (outcome.result.outcome === "success") {
                    setTxnStatus("success");
                    setAlertModal(true);
                    getBalanceOf(account);
                    console.log(outcome);
                  } else {
                    setTxnStatus("danger");
                    setAlertModal(true);
                  }
                  // return Index
                } else {
                  setTimeout(listen, 3000);
                }
              });
          }, 3000);
        })
        .catch((e) => alert(e.message));
      // console.log("txnhash", txnHash);
    } catch (err) {
      console.log("this is err", err);
    }

    // }
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
    <Card>
      <Card>
        <ListGroup variant="flush">
          {myNFTs == null ? (
            <Spinner animation="border" />
          ) : myNFTs.length == 0 ? (
            "No NFTs to rent !"
          ) : (
            myNFTs.map((id, key) => (
              <ListGroup.Item>
                <Row>
                  <Col>
                    {key + 1} : {id}
                  </Col>
                  <Col>
                    <Button
                      style={{ width: "18rem" }}
                      variant="dark"
                      // size="lg"
                      onClick={() => setLendModal(id)}
                    >
                      Lend
                    </Button>
                  </Col>
                </Row>
              </ListGroup.Item>
            ))
          )}
        </ListGroup>
        <Modal show={alertModal} onHide={() => setAlertModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Alert</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert key={txnStatus} variant={txnStatus}>
              {statusMSG[txnStatus]}
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setAlertModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
        <Modal show={lendModal} onHide={() => setLendModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Alert</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Form>
              <Form.Group
                className="mb-3"
                controlId="exampleForm.ControlInput1"
              >
                <Form.Label>Address</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="address"
                  autoFocus
                  onChange={(e) => setRecieverAddress(e.target.value)}
                />
              </Form.Group>
            </Form>
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() =>
                account &&
                lendNFT(
                  account,
                  CONTRACT_INDEX,
                  CONTRACT_SUB_INDEX,
                  input.current?.valueAsNumber
                )
              }
            >
              Lend
            </Button>
            <Button variant="secondary" onClick={() => setLendModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Card>
    </Card>
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
