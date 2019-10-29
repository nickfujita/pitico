import BITBOX from "slp-sdk";

// Set NETWORK to either testnet or mainnet
const NETWORK = process.env.REACT_APP_NETWORK;

// Instantiate bitbox.

// Instantiate SLP based on the network.
let bitbox;
if (NETWORK === `mainnet`) bitbox = new BITBOX({ restURL: `https://rest.bitcoin.com/v2/` });
else bitbox = new BITBOX({ restURL: `https://trest.bitcoin.com/v2/` });

export async function sendBch(walletInfo, { addresses, values }) {
  try {
    const value = values.reduce((previous, current) => previous + current, 0);
    const SEND_ADDR = walletInfo.cashAddress;
    const SEND_MNEMONIC = walletInfo.mnemonic;

    // Get the balance of the sending address.
    const balance = await getBCHBalance(SEND_ADDR, false);

    // Exit if the balance is zero.
    if (balance <= 0.0) {
      console.log(`Balance of sending address is zero. Exiting.`);
      return;
    }

    const u = await bitbox.Address.utxo(SEND_ADDR);
    const utxo = findBiggestUtxo(u.utxos);

    let transactionBuilder;

    // instance of transaction builder
    if (NETWORK === `mainnet`) transactionBuilder = new bitbox.TransactionBuilder();
    else transactionBuilder = new bitbox.TransactionBuilder("testnet");

    const satoshisToSend = bitbox.BitcoinCash.toSatoshi(value);
    const originalAmount = utxo.satoshis;
    const vout = utxo.vout;
    const txid = utxo.txid;

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout);

    // get byte count to calculate fee. paying 1.2 sat/byte
    const byteCount = bitbox.BitcoinCash.getByteCount({ P2PKH: 1 }, { P2PKH: 2 });
    const satoshisPerByte = 1.0 * addresses.length;
    const txFee = Math.floor(satoshisPerByte * byteCount);

    // amount to send back to the sending address.
    // It's the original amount - 1 sat/byte for tx size
    const remainder = originalAmount - satoshisToSend - txFee;

    // add output w/ address and amount to send
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      transactionBuilder.addOutput(address, bitbox.BitcoinCash.toSatoshi(values[i]));
    }
    transactionBuilder.addOutput(SEND_ADDR, remainder);

    // Generate a change address from a Mnemonic of a private key.
    const change = changeAddrFromMnemonic(SEND_MNEMONIC);

    // Generate a keypair from the change address.
    const keyPair = bitbox.HDNode.toKeyPair(change);

    // Sign the transaction with the HD node.
    let redeemScript;
    transactionBuilder.sign(
      0,
      keyPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      originalAmount
    );

    // build tx
    const tx = transactionBuilder.build();
    // output rawhex
    const hex = tx.toHex();

    // Broadcast transation to the network
    const txidStr = await bitbox.RawTransactions.sendRawTransaction([hex]);
    let link;
    if (NETWORK === `mainnet`) {
      link = `https://explorer.bitcoin.com/bch/tx/${txidStr}`;
    } else {
      link = `https://explorer.bitcoin.com/tbch/tx/${txidStr}`;
    }
    console.log(link);

    return link;
  } catch (err) {
    console.log(`error: `, err);
    throw err;
  }
}

// Generate a change address from a Mnemonic of a private key.
function changeAddrFromMnemonic(mnemonic) {
  // root seed buffer
  const rootSeed = bitbox.Mnemonic.toSeed(mnemonic);

  // master HDNode
  let masterHDNode;
  if (NETWORK === `mainnet`) masterHDNode = bitbox.HDNode.fromSeed(rootSeed);
  else masterHDNode = bitbox.HDNode.fromSeed(rootSeed, "testnet");

  // HDNode of BIP44 account
  const account = bitbox.HDNode.derivePath(masterHDNode, "m/44'/145'/0'");

  // derive the first external change address HDNode which is going to spend utxo
  const change = bitbox.HDNode.derivePath(account, "0/0");

  return change;
}

// Get the balance in BCH of a BCH address.
async function getBCHBalance(addr, verbose) {
  try {
    const result = await bitbox.Address.details(addr);

    if (verbose) console.log(result);

    const bchBalance = result;

    return bchBalance.balance;
  } catch (err) {
    console.error(`Error in getBCHBalance: `, err);
    console.log(`addr: ${addr}`);
    throw err;
  }
}

// Returns the utxo with the biggest balance from an array of utxos.
function findBiggestUtxo(utxos) {
  let largestAmount = 0;
  let largestIndex = 0;

  for (var i = 0; i < utxos.length; i++) {
    const thisUtxo = utxos[i];

    if (thisUtxo.satoshis > largestAmount) {
      largestAmount = thisUtxo.satoshis;
      largestIndex = i;
    }
  }

  return utxos[largestIndex];
}