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

    #[msg("Invalid Proof account len")]
    InvalidProofAccLen,

    #[msg("Unable to verify metadata")]
    InvalidMetadata,

    #[msg("Invalid fractions owner by the payer")]
    InvalidFractionsOwned,
}
