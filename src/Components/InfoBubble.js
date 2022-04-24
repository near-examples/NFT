import React from "react";
import PropTypes from "prop-types";
import { Alert, Card, Button, Row, Col, Container } from "react-bootstrap";
import { login, logout } from "../utils";

const InfoBubble = (props) => {
  return (
    <Card style={{
      border: 'none',
      borderRadius: 5,
      boxShadow: '0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)',
      paddingTop: 10,
      height: 300
    }}>
      <Container>
      Step 1: Hit this button to login!<br />
      {/* <Col className='d-flex justify-content-center'> */}
        <Button
          style={{ 
            position: "absolute",
            bottom: 10,
            left: 20,
            }}
          onClick={window.walletConnection.isSignedIn() ? logout : login}
        >
          {window.walletConnection.isSignedIn() ? window.accountId : "Login"}
        </Button>
      {/* </Col> */}
      </Container>
    </Card>
  );
};

InfoBubble.propTypes = {};

export default InfoBubble;