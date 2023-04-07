use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use std::str::FromStr;

declare_id!("EYChmD6FbmkkAw84tHpeSAwTn75Uqht6YJQd9Ra7Lpkf");

// Mainnet USDC address. For devnet replace with a dummy token and use it's mint address
// const USDC_MINT_ADDRESS: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// Devnet "USDC" address
const USDC_MINT_ADDRESS: &str = "DDfaVKveDiXYcezeLQa2aZZyJRSd92MZBPRBLbweBbby";


#[program]
pub mod crowdfund {
    use super::*;

    pub fn create(ctx: Context<InitializeSale>, name: String) -> ProgramResult {
        let sale_vault = &mut ctx.accounts.sale_vault;
        sale_vault.name = name;
        sale_vault.balance = 0;
        sale_vault.usdc_balance = 0;
        sale_vault.owner = *ctx.accounts.admin.key;

        let sale_state = &mut ctx.accounts.sale_state;
        sale_state.started = false;
        sale_state.ended = false;
        Ok({})
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> ProgramResult {

        // let sale_state = &mut ctx.accounts.state;
        // if !sale_state.started || sale_state.ended {
        //     return Err(ProgramError::Custom(CustomError::SaleNotActive as u32));
        // }

        let cpi_accounts = Transfer {
            from: ctx.accounts.user_usdc_account.to_account_info(),
            to: ctx.accounts.usdc_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
    
        (&mut ctx.accounts.sale_vault).usdc_balance += amount;
        Ok(())
    }
    
    
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> ProgramResult {
        let sale_vault = &mut ctx.accounts.sale_vault;
        let user = &mut ctx.accounts.user;
        if sale_vault.owner != user.key() {
            return Err(ProgramError::Custom(CustomError::NotAuthorized as u32));
        }
    
        let cpi_accounts = Transfer {
            from: ctx.accounts.sale_usdc_account.to_account_info(),
            to: ctx.accounts.user_usdc_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
    
        (&mut ctx.accounts.sale_vault).usdc_balance += amount;
        Ok(())
    }

    pub fn start_sale(ctx: Context<StartSale>) -> ProgramResult {
        let sale_vault = &mut ctx.accounts.sale_vault;
        let sale_state = &mut ctx.accounts.sale_state;
        if sale_vault.owner != *ctx.accounts.admin.key {
            return Err(ProgramError::Custom(CustomError::NotAuthorized as u32));
        }
        sale_state.started = true;
        sale_state.ended = false;
        Ok({})
    }

    pub fn end_sale(ctx: Context<EndSale>) -> ProgramResult {
        let sale_vault = &mut ctx.accounts.sale_vault;
        let sale_state = &mut ctx.accounts.sale_state;
        if sale_vault.owner != *ctx.accounts.admin.key {
            return Err(ProgramError::Custom(CustomError::NotAuthorized as u32));
        }
        sale_state.ended = true;
        Ok({})
    }
}

#[derive(Accounts)]
pub struct InitializeSale<'info> {
    #[account(
        init,
        payer=admin,
        space=1024,
        seeds=[b"crowdfund",
        admin.key().as_ref()],
        bump
    )]
    pub sale_vault: Account<'info, Vault>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer=admin,
        space=1024,
        seeds=[b"fund_state",
        admin.key().as_ref()],
        bump
    )]
    pub sale_state: Account<'info, State>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Vault {
    pub name: String,
    pub balance: u64,
    pub usdc_balance: u64,
    pub owner: Pubkey,
}

#[account]
pub struct State {
    pub started: bool,
    pub ended: bool,
}

#[derive(Accounts)]
pub struct Deposit<'info>{
    #[account(mut)]
    pub sale_vault: Account<'info, Vault>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub state: Account<'info, State>,
    #[account(mut)]
    pub user_usdc_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    #[account(mut)]
    pub usdc_vault: Account<'info, TokenAccount>, // The new field for usdc_vault
}



#[derive(Accounts)]
pub struct Withdraw<'info>{
    #[account(mut)]
    pub sale_vault: Account<'info, Vault>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub sale_usdc_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_usdc_account: Account<'info, TokenAccount>,
    #[account(constraint = usdc_mint.key() == usdc_mint_address())]
    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct StartSale<'info>{
    #[account(mut)]
    pub sale_vault: Account<'info, Vault>,
    #[account(mut)]
    pub sale_state: Account<'info, State>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct EndSale<'info>{
    #[account(mut)]
    pub sale_vault: Account<'info, Vault>,
    #[account(mut)]
    pub sale_state: Account<'info, State>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

#[error_code]
pub enum CustomError {
    #[msg("You are not authorized to perform this action.")]
    NotAuthorized = 1,
    #[msg("Sale is not active.")]
    SaleNotActive = 2,
}

fn usdc_mint_address() -> Pubkey {
    Pubkey::from_str(USDC_MINT_ADDRESS).unwrap()
}
