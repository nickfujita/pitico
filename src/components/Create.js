import React, { useEffect } from "react";
import "../index.css";
import styled from "styled-components";
import { withRouter } from "react-router-dom";
import { ButtonQR } from "badger-components-react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { WalletContext } from "../utils/context";
import { Input, Button, notification, Spin, Icon, Row, Col, Card, Form, Typography } from "antd";
// import createToken from "../utils/broadcastTransaction";
import { QRCode } from "./QRCode";
import { getAddress, createToken } from "bitcoin-wallet-api";

const { Paragraph, Text } = Typography;

const Create = ({ history }) => {
  const ContextValue = React.useContext(WalletContext);
  const { wallet, balances, loading: loadingContext } = ContextValue;
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState({
    dirty: true,
    tokenName: "",
    tokenSymbol: "",
    documentHash: "",
    documentUri: "",
    amount: "",
    decimals: "",
    hasMintBaton: false
  });

  function handleCreateToken() {
    setData({
      ...data,
      dirty: false
    });

    if (!data.tokenName || !data.tokenSymbol || !data.amount || Number(data.amount) <= 0) {
      return;
    }

    setLoading(true);
    const {
      tokenName,
      tokenSymbol,
      documentHash,
      documentUri,
      amount,
      decimals,
      hasMintBaton
    } = data;

    getAddress({ protocol: "SLP" })
      .then(({ address }) => {
        return createToken({
          name: tokenName,
          symbol: tokenSymbol,
          documentHash,
          documentUri: documentUri || "pitico.cash",
          initialSupply: amount,
          tokenReceiverAddress: address,
          decimals,
          batonReceiverAddress: hasMintBaton && address
        });
      })
      .then(({ tokenId }) => {
        notification.success({
          message: "Success",
          description: (
            <a href={`https://explorer.bitcoin.com/bch/tx/${tokenId}`} target="_blank">
              <Paragraph>Transaction successful. Click or tap here for more details</Paragraph>
            </a>
          ),
          duration: 0
        });
        setLoading(false);
      })
      .catch(err => {
        notification.error({
          message: `Error: ${err}`
        });
        setLoading(false);
      });
  }

  const handleChange = e => {
    const { value, name, checked, type } = e.target;

    setData(p => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };
  return (
    <Row justify="center" type="flex">
      <Col lg={8} span={24}>
        <Spin spinning={loading || loadingContext}>
          <Card
            style={{ boxShadow: "0px 0px 40px 0px rgba(0,0,0,0.35)", borderRadius: "8px" }}
            title={
              <h2>
                <Icon type="plus-square" theme="filled" /> Create
              </h2>
            }
            bordered={true}
          >
            <Form>
              <Form.Item
                validateStatus={!data.dirty && !data.tokenSymbol ? "error" : ""}
                help={
                  !data.dirty && !data.tokenSymbol
                    ? "Should be combination of numbers & alphabets"
                    : ""
                }
              >
                <Input
                  placeholder="token symbol e.g.: PTC"
                  name="tokenSymbol"
                  onChange={e => handleChange(e)}
                  required
                />
              </Form.Item>
              <Form.Item
                validateStatus={!data.dirty && Number(data.tokenName) <= 0 ? "error" : ""}
                help={
                  !data.dirty && Number(data.tokenName) <= 0
                    ? "Should be combination of numbers & alphabets"
                    : ""
                }
              >
                <Input
                  placeholder="token name"
                  name="tokenName"
                  onChange={e => handleChange(e)}
                  required
                />
              </Form.Item>
              <Form.Item>
                <Input
                  placeholder="white paper/document hash"
                  name="documentHash"
                  onChange={e => handleChange(e)}
                  required
                />
              </Form.Item>
              <Form.Item>
                <Input
                  placeholder="token website e.g.: pitico.cash"
                  name="documentUri"
                  onChange={e => handleChange(e)}
                  required
                />
              </Form.Item>
              <Form.Item
                validateStatus={!data.dirty && Number(data.amount) <= 0 ? "error" : ""}
                help={!data.dirty && Number(data.amount) <= 0 ? "Should be greater than 0" : ""}
              >
                <Input
                  style={{ padding: "0px 20px" }}
                  placeholder="quantity"
                  name="amount"
                  onChange={e => handleChange(e)}
                  required
                  type="number"
                />
              </Form.Item>
              <Form.Item
                validateStatus={!data.dirty && Number(data.amount) <= 0 ? "error" : ""}
                help={
                  !data.dirty && Number(data.amount) < 0
                    ? "Should be greater than or equal to 0"
                    : ""
                }
              >
                <Input
                  style={{ padding: "0px 20px" }}
                  placeholder="number of decimal places"
                  name="decimals"
                  onChange={e => handleChange(e)}
                  required
                  type="number"
                />
              </Form.Item>
              <Form.Item
                validateStatus={!data.dirty && Number(data.amount) <= 0 ? "error" : ""}
                help={
                  !data.dirty && Number(data.amount) < 0
                    ? "Should be greater than or equal to 0"
                    : ""
                }
              >
                <Input
                  style={{ padding: "0px 20px" }}
                  name="hasMintBaton"
                  onChange={e => handleChange(e)}
                  required
                  type="checkbox"
                />
                <span style={{ marginLeft: "16px" }}>Create mint baton</span>
              </Form.Item>
              <div style={{ paddingTop: "12px" }}>
                <Button onClick={() => handleCreateToken()}>Create Token</Button>
              </div>
            </Form>
          </Card>
        </Spin>
      </Col>
    </Row>
  );
};

export default withRouter(Create);
