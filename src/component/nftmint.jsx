/* eslint-disable no-console */
import React, { useEffect, useState, useRef } from "react";
import { toBuffer, TransactionStatusEnum } from "@concordium/web-sdk";
import { Buffer } from "buffer";
import { detectConcordiumProvider } from "@concordium/browser-wallet-api-helpers";
import {
  deserializeContractState,
  InstanceInfoV0,
  isInstanceInfoV0,
  AccountTransactionType,
  GtuAmount,
  deserializeTransaction,
  UpdateContractPayload,
  AccountAddress,
  serializeInitContractParameters,
  InvokeContractResult,
  serializeUpdateContractParameters,
} from "@concordium/web-sdk";
import * as leb from "@thi.ng/leb128";
import Alert from "react-bootstrap/Alert";

import { RAW_SCHEMA } from "./constant";
import Button from "react-bootstrap/Button";
import { Card, Col, ListGroup, Modal, Row } from "react-bootstrap";
import Spinner from "react-bootstrap/Spinner";

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

const statusMSG = {
  warning: "Transaction is processing !",
  danger: "Transaction failed !",
  success: "Transaction is Successfull !",
};

export default function NFT({ account }) {
  //   const { account, isConnected } = useContext(state);
  let isConnected = true;
  const [owner, setOwner] = useState();
  const [smashed, setSmashed] = useState();
  const [amount, setAmount] = useState(0n);
  const [myNFTs, setMyNFTs] = useState(null);
  const [view, setView] = useState();
  const [nId, setnId] = useState();
  const input = useRef(null);
  const [alertModal, setAlertModal] = useState(false);
  const [txnStatus, setTxnStatus] = useState("");

  // const serializeBalanceParameter = (tokenIndex, accountAddress) => {
  //   const queries = Buffer.alloc(2);
  //   queries.writeUInt16LE(1, 0); // 1 query

  //   const token = Buffer.from(tokenIndex, "hex");
  //   const tokenLength = Buffer.alloc(1);
  //   tokenLength.writeUInt8(token.length, 0);

  //   const addressType = Buffer.alloc(1); // Account address type
  //   const address = new AccountAddress(accountAddress).decodedAddress;

  //   return Buffer.concat([queries, tokenLength, token, addressType, address]);
  // };

  // const getTokenUrl = (id, index, subindex = 0n) => {
  //   return new Promise((resolve) => {
  //     const param = serializeUpdateContractParameters(
  //       CONTRACT_NAME,
  //       "tokenMetadata",
  //       [id],
  //       toBuffer(RAW_SCHEMA, "base64")
  //     );
  //     detectConcordiumProvider().then((provider) => {
  //       provider
  //         .getJsonRpcClient()
  //         .invokeContract({
  //           contract: { index, subindex },
  //           method: "CIS2-NFT.tokenMetadata",
  //           parameter: param,
  //         })
  //         .then((returnValue) => {
  //           console.log("text", returnValue);
  //           if (
  //             returnValue &&
  //             returnValue.tag === "success" &&
  //             returnValue.returnValue
  //           ) {
  //             const bufferStream = toBuffer(returnValue.returnValue, "hex");
  //             const length = bufferStream.readUInt16LE(2);
  //             const url = bufferStream.slice(4, 4 + length).toString("utf8");
  //             resolve(url);
  //           } else {
  //             console.log(id);
  //           }
  //         });
  //     });
  //   });
  // };

  const getIT = (id) => {
    return new Promise(async (resolve, reject) => {
      let tokenID = "0000000" + (id + 1);
      const stext = tokenID.length;
      tokenID = tokenID.substring(stext - 8, stext);
      console.log(tokenID);
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
        Buffer.from(RAW_SCHEMA, "base64")
      );
      const provider = await detectConcordiumProvider();

      const res = await provider.getJsonRpcClient().invokeContract({
        contract: { index: CONTRACT_INDEX, subindex: CONTRACT_SUB_INDEX },
        method: `${CONTRACT_NAME}.balanceOf`,
        parameter: inputParams,
      });
      console.log(res);
      if (res.tag === "success") {
        id++;
        resolve({ res: res, tokenID: tokenID });
      } else {
        resolve({ res: null, tokenID: tokenID });
      }
    });
  };

  const getBalanceOf = async (account) => {
    let myIds = [];
    let kRun = true;
    let id = 0;
    new Promise(async (resolve, reject) => {
      while (kRun) {
        const ans = await getIT(id);
        if (ans.res) {
          id++;
          if (ans.res.returnValue === "010001") {
            myIds.push(ans.tokenID);
          }
        } else {
          kRun = false;
          console.log("tokenId", ans.tokenID);
          setnId(ans.tokenID);
          setMyNFTs(myIds);
        }
      }
    }).then((values) => {
      setMyNFTs(myIds); // [3, 1337, "foo"]
    });

    // Promise.all(
    //   [...Array(13).keys()].map(async (ele) => {
    //     let tokenID = "0000000" + (ele + 1);
    //     const stext = tokenID.length;
    //     tokenID = tokenID.substring(stext - 8, stext);
    //     console.log(tokenID);
    //     const userInput = [
    //       {
    //         address: {
    //           Account: [account],
    //         },
    //         token_id: tokenID,
    //       },
    //     ];
    //     const inputParams = serializeUpdateContractParameters(
    //       CONTRACT_NAME,
    //       "balanceOf",
    //       userInput,
    //       Buffer.from(RAW_SCHEMA, "base64")
    //     );
    //     const provider = await detectConcordiumProvider();

    //     const res = await provider.getJsonRpcClient().invokeContract({
    //       contract: { index: CONTRACT_INDEX, subindex: CONTRACT_SUB_INDEX },
    //       method: `${CONTRACT_NAME}.balanceOf`,
    //       parameter: inputParams,
    //     });

    //     if (res.tag === "success" && res.returnValue === "010001") {
    //       myIds.push(tokenID);
    //     }
    //   })
    // ).then((values) => {
    //   setMyNFTs(myIds); // [3, 1337, "foo"]
    // });
  };
  // const viewMinted = async () => {
  //   // "cis2_nft.viewMinted"
  //   const inputParams = serializeUpdateContractParameters(
  //     CONTRACT_NAME,
  //     "balanceOf",
  //     {},
  //     Buffer.from(RAW_SCHEMA, "base64")
  //   );
  //   const provider = await detectConcordiumProvider();
  //   const res = await provider.getJsonRpcClient().invokeContract({
  //     contract: { index: CONTRACT_INDEX, subindex: CONTRACT_SUB_INDEX },
  //     method: `${CONTRACT_NAME}.viewMinted`,
  //     parameter: inputParams,
  //   });
  //   const buf = Buffer.from(res.returnValue, "hex");
  //   // const amount = uleb128.decode(buf.slice(2))
  //   console.log("view minted", buf, res);
  //   if (!res || res.tag === "failure" || !res.returnValue) {
  //     throw new Error(`Expected succesful invocation`);
  //   }
  //   // setView(res);
  // };
  const viewfunc = async (account) => {
    const provider = await detectConcordiumProvider();
    const res = await provider.getJsonRpcClient().invokeContract({
      contract: { index: CONTRACT_INDEX, subindex: CONTRACT_SUB_INDEX },
      method: `${CONTRACT_NAME}.view`,
    });
    if (!res || res.tag === "failure" || !res.returnValue) {
      throw new Error(`Expected succesful invocation`);
    }
    console.log("view 1", res.returnValue, res.returnValue.substring(0, 2));
    console.log(
      "view 2",
      toBuffer(res.returnValue.substring(2), "hex").readBigUInt64LE(0)
    );
    setView(res);
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

          // viewfunc();
          // viewMinted();
          // getTokenUrl("00000003", 1430n, 0n);

          // setOwner(info.owner.address);
        });
    }
  }, [isConnected]);
  useEffect(() => {
    if (account) getBalanceOf(account);
  }, [account]);
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
              Account: ["2zPi3226K4kMwas9NsgK5cc5TtwZzkVjphJWyarNBdQ8wAtBsK"],
            },
            token_id: "00000003",
            amount: "1",
            data: "",
          },
        ],
        RAW_SCHEMA,
        1
      );
      console.log("txnhash", txnHash);
    } catch (err) {
      console.log("this is err", err);
    }
  };

  const mintNFT = async (account, index, subindex = 0n) => {
    console.log("this");
    try {
      const provider = await detectConcordiumProvider();
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
            receiveName: `${CONTRACT_NAME}.mint`,
            maxContractExecutionEnergy: 30000n,
            parameter: toBuffer(""),
          },
          {
            owner: {
              Account: [account],
            },
            tokens: [nId],
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
                    getBalanceOf(account);
                    setTxnStatus("success");
                    setAlertModal(true);

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
  };

  async function updateStateWCCDBalanceAccount(account) {
    const accountAddressBytes = new AccountAddress(account).decodedAddress;
    let hexString = "";
    accountAddressBytes.forEach((byte) => {
      hexString += `0${(byte & 0xff).toString(16)}`.slice(-2); // eslint-disable-line no-bitwise
    });
    const userInput = [
      {
        address: {
          Account: [account],
        },
        token_id: "00000005",
      },
    ];
    // Adding '00' because enum 0 (an `Account`) was selected instead of enum 1 (an `ContractAddress`).
    // const inputParams = toBuffer(`00${hexString}`, "hex");
    const inputParams = serializeUpdateContractParameters(
      CONTRACT_NAME,
      "balanceOf",
      userInput,
      Buffer.from(RAW_SCHEMA, "base64")
    );
    console.log("hex", hexString, inputParams);
    const provider = await detectConcordiumProvider();
    const res = await provider.getJsonRpcClient().invokeContract({
      method: `${CONTRACT_NAME}.balanceOf`,
      contract: { index: CONTRACT_INDEX, subindex: 0n },
      parameter: inputParams,
    });
    console.log(res);
    if (!res || res.tag === "failure" || !res.returnValue) {
      throw new Error(`Expected succesful invocation`);
    }
    console.log("erss", res?.returnValue);
    console.log(
      "myoutput",
      BigInt(leb.decodeULEB128(toBuffer(res.returnValue, "hex"))[0])
    );
  }

  return (
    <Card>
      <br />

      <Row>
        <Col>
          {" "}
          <Card>
            <ListGroup variant="flush">
              <ListGroup.Item>
                Contract Version : {view?.events[0].contractVersion}
              </ListGroup.Item>
              <ListGroup.Item>Dapibus ac facilisis in</ListGroup.Item>
              <ListGroup.Item>Vestibulum at eros</ListGroup.Item>
            </ListGroup>
          </Card>
        </Col>
        <Col>
          <Card>
            <Card.Header>NFTs owned</Card.Header>
            <Card.Body>
              <Card.Title>Ids</Card.Title>
              <Card.Text>
                {!account ? null : myNFTs == null ? (
                  <Spinner animation="border" />
                ) : myNFTs.length == 0 ? (
                  "No NFTs to rent !"
                ) : (
                  myNFTs.map((id) => {
                    return `${id} ,`;
                  })
                )}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <hr />
      <br />
      <Row>
        <Button
          style={{ width: "18rem" }}
          variant="dark"
          size="lg"
          onClick={() =>
            account &&
            mintNFT(
              account,
              CONTRACT_INDEX,
              CONTRACT_SUB_INDEX,
              input.current?.valueAsNumber
            )
          }
        >
          Mint NFT
        </Button>
      </Row>
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

      <br />
      <br />
    </Card>
  );
}
