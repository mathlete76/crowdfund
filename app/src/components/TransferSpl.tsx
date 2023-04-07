import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@project-serum/anchor";


(async () => {
  // Initialize the connection
  const connection = new Connection("https://palpable-twilight-general.solana-devnet.discover.quiknode.pro/1f256dd29d9aa74afb4c4f0aa8aa49f7f7d465bd/");

  // Generate a new wallet
  const wallet = anchor.web3.Keypair.generate();

//   const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID: PublicKey = new PublicKey(
//     'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
//   );
  
  // Set USDC mint address
  const usdcMintAddress = new PublicKey("4cHh7sn93hqWWmWaY4ALpCzDfvLi5qQ9svM5kUnLcd2d");

  function findAssociatedTokenAddress(
    walletAddress: PublicKey,
    tokenMintAddress: PublicKey
): PublicKey {
    return PublicKey.findProgramAddressSync(
        [
            walletAddress.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            tokenMintAddress.toBuffer(),
        ],
        TOKEN_PROGRAM_ID
    )[0];
}

    // Get the associated token address
    const associatedTokenAddress = findAssociatedTokenAddress(wallet.publicKey, usdcMintAddress);

    console.log("Wallet address: ", wallet.publicKey.toString());
    console.log("Associated token address: ", associatedTokenAddress.toString());
})();
