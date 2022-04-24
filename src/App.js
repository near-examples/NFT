import "regenerator-runtime/runtime";
import React, { useEffect, useState } from "react";
import { login, logout } from "./utils";

// React Bootstrap css
import "bootstrap/dist/css/bootstrap.min.css";

// React Bootstraps imports
import { Nav, Navbar, Container, Row, Card, Alert, Col } from "react-bootstrap";

// Custom Components
import MintingTool from "./Components/MintingTool";
import InfoBubble from "./Components/InfoBubble";
import CreateNFT from "./Components/CreateNFT";

// assets
import Logo from "./assets/main.png";

import getConfig from "./config";
const { networkId } = getConfig(process.env.NODE_ENV || "development");

export default function App() {
  const [userHasNFT, setuserHasNFT] = useState(false);

  console.log(window.contract)
  useEffect(() => {
    const receivedNFT = async () => {
      
      if (window.accountId !== "") {
        const userNFTs =
          await window.contract.nft_tokens_for_owner({
            account_id: window.accountId,
          })

        if (userNFTs.length > 0) {
          setuserHasNFT(true);
        }
      }
    };
    receivedNFT();
  }, []);

  return (
    <React.Fragment>
      {" "}
      <Navbar bg='dark' variant='dark'>
        <Container>
          <Navbar.Brand href='#home'>
            <img
              alt=''
              src={Logo}
              width='30'
              height='30'
              className='d-inline-block align-top'
            />{" "}
            Tjelailah's NEAR NFT
          </Navbar.Brand>
          <Navbar.Toggle aria-controls='responsive-navbar-nav' />
          <Navbar.Collapse id='responsive-navbar-nav'>
            <Nav className='me-auto'></Nav>
            <Nav>
              <Nav.Link
                onClick={window.walletConnection.isSignedIn() ? logout : login}
              >
                {window.walletConnection.isSignedIn()
                  ? window.accountId
                  : "Login"}
              </Nav.Link>{" "}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container style={{ marginTop: "3vh" }}>
        {" "}
        <Row>
          <Alert>
            Hello! We are going to mint an NFT and have it appear in your
            wallet! Sign in, mint your nft and head over to{" "}
            <a href='https://wallet.testnet.near.org/'>
              wallet.testnet.near.org
            </a>{" "}
            to see your new "Go Team" NFT!
          </Alert>
        </Row>
        <Row className="cards">
          <Col >
            <InfoBubble />
          </Col>
          <Col>
            <MintingTool userNFTStatus={userHasNFT} />
          </Col>
          <Col>
            <CreateNFT />
          </Col>
        </Row>
      </Container>
    </React.Fragment>
  );
}