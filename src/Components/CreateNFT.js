import React from "react";
import PropTypes from "prop-types";
import { Form, Button, Card, Container, Row, Alert, Col } from "react-bootstrap";
import { keys } from "regenerator-runtime";
const BN = require("bn.js");

const CreateNFT = () => {
  const mintNFT = async () => {
    await window.contract.nft_mint(
      {
        token_id: window.accountId,
        metadata: {
            title: "Tjelailah's SpringIsNEAR Meme",
            description: "Tjelailah's Meme Contest Submission for Challenge 1 of the NEAR Spring Hackathon",
            media:
              "ipfs://bafybeibavct5kgdgcbuqqvjl336g2m4zyfqdb7nyrmoic3jo43oo7tpu2q",
          },
        receiver_id: window.accountId,
      },
      300000000000000, // attached GAS (optional)
      new BN("1000000000000000000000000")
    );
  };

  return (
    <Card style={{
      border: 'none',
      borderRadius: 5,
      boxShadow: '0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)',
      paddingTop: 10,
      height: 300
    }}>
      <Container>
        {/* <Row style={{ marginBottom: "2vh" }}> */}
           {/* <Col> */}
            <p>
              Step 2: After you have logged in, hit this button to mint your "Go
              Team" Token and go your{" "}
              <a href='https://wallet.testnet.near.org/'> wallet</a> and see your
              NFT
            </p>
            <Button
            disabled={window.accountId === ""}
            onClick={mintNFT}
            style={{ 
              position: "absolute",
              bottom: 10,
              left: 20,
              }}
          >
            Mint NFT
          </Button>
           {/* </Col> */}
        {/* </Row> */}
        <Row className='d-flex justify-content-center'>
          {console.log(window.accountId)}
          {window.accountId ? (
            <Alert variant='danger' style={{ marginTop: "2vh" }}>
              <p style={{ textAlign: "center" }}>
                bruh/sis.... You have an NFT already. You can see it{" "}
                <a href={"https://wallet.testnet.near.org/?tab=collectibles"}>
                  here!
                </a>
                :)
              </p>
            </Alert>
          ) : null}
        </Row>
      </Container>
    </Card>
  );
};

CreateNFT.propTypes = {};

export default CreateNFT;