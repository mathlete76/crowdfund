
import { verify } from '@noble/ed25519';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { FC, useCallback, useEffect, useState } from 'react';
import { notify } from "../utils/notifications";

import { Program, AnchorProvider, web3, utils, BN } from '@project-serum/anchor';
import idl from "../../crowdfund.json";
import { PublicKey } from '@solana/web3.js';
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    createMint, getOrCreateAssociatedTokenAccount,
    mintTo,
} from "@solana/spl-token"
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';


const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.metadata.address);

export const CreateCrowdFund: FC = () => {
    const ourWallet = useWallet();
    const { connection } = useConnection();

    const [funds, setFunds] = useState([]);

    const getProvider = () => {
        const provider = new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions());
        return provider;
    }

    const [saleVaultPDA, setSaleVaultPDA] = useState(null);
    const [saleStatePDA, setSaleStatePDA] = useState(null);


    const fetchPDAs = async (): Promise<void> => {
        return new Promise<void>(async (resolve, reject) => {
            try {
                const wallet = ourWallet;

                const [saleVault, saleVaultNonce] = PublicKey.findProgramAddressSync(
                    [utils.bytes.utf8.encode("crowdfund"), wallet.publicKey.toBuffer()],
                    programID
                );
                const [saleState, saleStateNonce] = PublicKey.findProgramAddressSync(
                    [utils.bytes.utf8.encode("fund_state"), wallet.publicKey.toBuffer()],
                    programID
                );

                setSaleVaultPDA(saleVault.toString());
                setSaleStatePDA(saleState.toString());
                resolve();
            } catch (error) {
                console.error("Error fetching PDAs:", error);
                reject(error);
            }
        });
    };

    const [walletStatus, setWalletStatus] = useState(null);

    const checkCrowdFunderStatus = async () => {
        try {
            await fetchPDAs();

            if (saleVaultPDA && saleStatePDA) {
                setWalletStatus(`Crowd Funder Account: ${saleVaultPDA}\nCrowd Funder State Account: ${saleStatePDA}`);
            } else {
                setWalletStatus('No associated crowdfunder account found.');
            }
        } catch (error) {
            console.error("Error checking CrowdFunder status:", error);
        }
    };



    useEffect(() => {
        if (ourWallet?.publicKey) {
            checkCrowdFunderStatus();
        } else {
            setWalletStatus(null);
        }
    }, [ourWallet]);


    const createCrowdFund = async () => {
        try {
            const anchProvider = getProvider();
            const program = new Program(idl_object, programID, anchProvider);

            const [saleVault] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("crowdfund"),
                anchProvider.wallet.publicKey.toBuffer(),
            ], program.programId);

            const [saleState] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("fund_state"),
                anchProvider.wallet.publicKey.toBuffer(),
            ], program.programId);

            await program.rpc.create("CrowdFunding", {
                accounts: {
                    saleVault,
                    admin: anchProvider.wallet.publicKey,
                    saleState,
                    systemProgram: web3.SystemProgram.programId,
                }
            })

            notify({ type: 'success', message: 'CrowdFunder Created!' });

            console.log("Crowd Funder Account Created at : " + saleVault.toString());
            console.log("Crowd Funder State Account Created at : " + saleState.toString());
            checkCrowdFunderStatus();
        } catch (error) {
            notify({ type: 'error', message: 'CrowdFunder Creation Failed!' });
            console.log("Error while initlising crowd funder" + error);
            checkCrowdFunderStatus();
        }
    }


    const startCrowdFund = async () => {
        const anchProvider = getProvider();
        const program = new Program(idl_object, programID, anchProvider);

        const [saleVault] = await PublicKey.findProgramAddressSync([
            utils.bytes.utf8.encode("crowdfund"),
            anchProvider.wallet.publicKey.toBuffer(),
        ], program.programId);

        const [saleState] = await PublicKey.findProgramAddressSync([
            utils.bytes.utf8.encode("fund_state"),
            anchProvider.wallet.publicKey.toBuffer(),
        ], program.programId);

        try {
            await program.rpc.startSale({
                accounts: {
                    saleVault,
                    saleState,
                    admin: anchProvider.wallet.publicKey,
                }
            })

            notify({ type: 'success', message: 'CrowdFunder Opened!' });
            checkCrowdFunderStatus();
            console.log("Crowd Funder Started at : " + saleVault.toString());
        } catch (error) {
            checkCrowdFunderStatus();
            console.log("Error while starting crowd funder" + error);
        }
    }

    const endCrowdFund = async () => {
        const anchProvider = getProvider();
        const program = new Program(idl_object, programID, anchProvider);

        const [saleVault] = await PublicKey.findProgramAddressSync([
            utils.bytes.utf8.encode("crowdfund"),
            anchProvider.wallet.publicKey.toBuffer(),
        ], program.programId);

        const [saleState] = await PublicKey.findProgramAddressSync([
            utils.bytes.utf8.encode("fund_state"),
            anchProvider.wallet.publicKey.toBuffer(),
        ], program.programId);

        try {
            await program.rpc.endSale({
                accounts: {
                    saleVault,
                    saleState,
                    admin: anchProvider.wallet.publicKey,
                }
            })

            notify({ type: 'success', message: 'CrowdFunder Closed!' });
            console.log("Crowd Funder Ended at : " + saleVault.toString());
        } catch (error) {
            console.log("Error while ending crowd funder" + error);
        }
    }


    const deposit = async () => {
        const amount = 1000;
        const adminPK = ourWallet.publicKey;
        const anchProvider = getProvider();
        const program = new Program(idl_object, programID, anchProvider);


        const [saleVault] = await PublicKey.findProgramAddressSync(
            [utils.bytes.utf8.encode("crowdfund"), new PublicKey(adminPK).toBuffer()],
            program.programId
        );

        const [saleState] = await PublicKey.findProgramAddressSync(
            [utils.bytes.utf8.encode("fund_state"), new PublicKey(adminPK).toBuffer()],
            program.programId
        );

        const usdcMint = "DDfaVKveDiXYcezeLQa2aZZyJRSd92MZBPRBLbweBbby";

        // Get the associated token address for the user's wallet
        // const userUsdcAccount = findAssociatedTokenAddress(
        //     anchProvider.wallet.publicKey,
        //     new PublicKey(usdcMint)
        // );

        const userUsdcAccount = new PublicKey("B5mNKuaqnW8W4yauGd8wCeuN1vZC3tt3fAp167dpMNFt");

        // Get the associated token address for the usdcVault
        const usdcVault = new PublicKey("56bDAExQgn1Nx1ZBMtX2gxi6yLWh1rTa61YyFzejZKov");

        const userUsdcAccountInfo = await connection.getAccountInfo(userUsdcAccount);
        const usdcVaultAccountInfo = await connection.getAccountInfo(usdcVault);

        console.log("saleVault:", saleVault.toString());
        console.log("user:", anchProvider.wallet.publicKey.toString());
        console.log("state:", saleState.toString());
        console.log("userUsdcAccount:", userUsdcAccount.toString());
        console.log("usdcMint:", new PublicKey(usdcMint).toString());
        console.log("usdcVault:", usdcVault.toString());
        console.log("tokenProgram:", TOKEN_PROGRAM_ID.toString());

        try {
            await program.rpc.deposit(new BN(amount), {
                accounts: {
                    saleVault,
                    user: anchProvider.wallet.publicKey,
                    state: saleState,
                    userUsdcAccount,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    usdcVault, // Make sure this variable is defined with the correct PublicKey

                },
            });
            

            console.log(
                "Deposited " + amount + " USDC to " + saleVault.toString()
            );
        } catch (error) {
            const [saleVault] = await PublicKey.findProgramAddressSync(
                [utils.bytes.utf8.encode("crowdfund"), new PublicKey(adminPK).toBuffer()],
                program.programId
            );

            console.log("Error while depositing to crowd funder " + error);
            console.log(
                "Failed to deposit " + amount + " USDC to " + usdcVault.toString()
            );
        }
    };

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

    const withdraw = async () => {
        const amount = 1000;
        const adminPK = "87NmtJLRUxwKZf72QHoz8HgFVjPQrabUmCKeKHMAPWo2";
        const anchProvider = getProvider();
        const program = new Program(idl_object, programID, anchProvider);
        try {
            const [saleVault] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("crowdfund"),
                new PublicKey(adminPK).toBuffer(),
            ], program.programId);

            const [saleState] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("fund_state"),
                new PublicKey(adminPK).toBuffer(),
            ], program.programId);

            const usdcMint = "4cHh7sn93hqWWmWaY4ALpCzDfvLi5qQ9svM5kUnLcd2d";

            await program.rpc.withdraw(new BN(amount), {
                accounts: {
                    saleVault,
                    user: anchProvider.wallet.publicKey,
                    saleUsdcAccount: saleVault,
                    userUsdcAccount: anchProvider.wallet.publicKey,
                    usdcMint: new PublicKey(usdcMint),
                    tokenProgram: TOKEN_PROGRAM_ID,
                }
            })

            console.log("Withdrawn " + amount + " USDC from " + saleVault.toString());
        } catch (error) {
            const [saleVault] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("crowdfund"),
                new PublicKey(adminPK).toBuffer(),
            ], program.programId);

            console.log("Error while withdrawing from crowd funder " + error);
            console.log("Failed to withdraw " + amount + " USDC from " + saleVault.toString());
        }
    }

    return (
        <>
            <div className="mt-4 text-center">
                {walletStatus ? (
                    <pre>{walletStatus}</pre>
                ) : (
                    <p>Connect your wallet to see CrowdFunder account information.</p>
                )}
            </div>

            <div className="flex flex-row justify-center">
                <div className="relative group items-center">
                    <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                    <button
                        className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                        onClick={createCrowdFund}
                    >
                        <div className="hidden group-disabled:block">
                            Wallet not connected
                        </div>
                        <span className="block group-disabled:hidden" >
                            Create CrowdFund Wallet
                        </span>
                    </button>
                </div>
            </div>
            <div className="flex flex-row justify-center">
                <div className="relative group items-center">
                    <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                    <button
                        className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                        onClick={startCrowdFund}
                    >
                        <div className="hidden group-disabled:block">
                            Wallet not connected
                        </div>
                        <span className="block group-disabled:hidden" >
                            Open CrowdFund
                        </span>
                    </button>
                </div>
            </div>
            <div className="flex flex-row justify-center">
                <div className="relative group items-center">
                    <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                    <button
                        className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                        onClick={endCrowdFund}
                    >
                        <div className="hidden group-disabled:block">
                            Wallet not connected
                        </div>
                        <span className="block group-disabled:hidden" >
                            Close CrowdFund
                        </span>
                    </button>
                </div>
            </div>
            <div className="flex flex-row justify-center">
                <div className="relative group items-center">
                    <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                    <button
                        className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                        onClick={deposit}
                    >
                        <div className="hidden group-disabled:block">
                            Wallet not connected
                        </div>
                        <span className="block group-disabled:hidden" >
                            Deposit 1000 USDC
                        </span>
                    </button>
                </div>
            </div>
            <div className="flex flex-row justify-center">
                <div className="relative group items-center">
                    <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                    <button
                        className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                        onClick={withdraw}
                    >
                        <div className="hidden group-disabled:block">
                            Wallet not connected
                        </div>
                        <span className="block group-disabled:hidden" >
                            Withdraw 1000 USDC
                        </span>
                    </button>
                </div>
            </div>
        </>
    );
};
