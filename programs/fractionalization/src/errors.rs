use anchor_lang::prelude::*;

#[error_code]
#[derive(PartialEq)]
pub enum CustomError {
    #[msg("Invalid asset id")]
    InvalidAsset,

    #[msg("Invalid authority provided!")]
    InvalidAuthority,

    #[msg("GenericError!")]
    GenericError,
}
