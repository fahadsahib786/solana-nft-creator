require('dotenv').config();
const { Keypair, Connection, clusterApiUrl } = require('@solana/web3.js');
const { Metaplex, keypairIdentity } = require('@metaplex-foundation/js');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const connection = new Connection(clusterApiUrl('devnet'), "confirmed");
const wallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.WALLET_KEYPAIR))));
const metaplex = new Metaplex(connection).use(keypairIdentity(wallet));

async function uploadToIPFS(imagePath, name, description) {
  const data = new FormData();
  data.append('file', fs.createReadStream(imagePath));
  console.log("Uploading file to IPFS...");

  try {
    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', data, {
      headers: {
        ...data.getHeaders(),
        'pinata_api_key': process.env.PINATA_API_KEY,
        'pinata_secret_api_key': process.env.PINATA_API_SECRET
      }
    });
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    console.log("File uploaded to IPFS successfully. IPFS URL:", ipfsUrl);
    return ipfsUrl;
  } catch (error) {
    console.error("IPFS upload failed:", error.message);
    throw new Error("IPFS upload failed: " + error.message);
  }
}

async function mintNFT(imagePath, name, symbol, description) {
  console.log("Starting NFT minting process...");

  try {
    // Step 1: Upload image to IPFS
    const metadataUri = await uploadToIPFS(imagePath);
    console.log("Metadata URI received:", metadataUri);

    // Step 2: Define metadata for the NFT
    const nftMetadata = {
      name: name || "My Solana NFT",
      symbol: symbol || "",
      uri: metadataUri,
      sellerFeeBasisPoints: 500,
      creators: [{ address: wallet.publicKey, share: 100 }],
    };

    // Step 3: Use Metaplex SDK to create NFT and get transaction ID
    console.log("Creating NFT on Solana...");
    const { nft, response } = await metaplex.nfts().create({
      uri: nftMetadata.uri,
      name: nftMetadata.name,
      symbol: nftMetadata.symbol,
      sellerFeeBasisPoints: nftMetadata.sellerFeeBasisPoints,
      creators: nftMetadata.creators,
    });
    
    console.log("NFT created successfully with Mint Address:", nft.address.toString());
    return {
      success: true,
      metadataUri: nftMetadata.uri,
      mintAddress: nft.address.toString(),
      minterAddress: wallet.publicKey.toString(),
      transactionId: response.signature
    };
  } catch (error) {
    console.error("Error during NFT minting process:", error.message);
    throw new Error("NFT minting process failed: " + error.message);
  }
}

module.exports = mintNFT;
