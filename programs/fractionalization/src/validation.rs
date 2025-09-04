use anchor_lang::prelude::*;
use anchor_lang::Bumps;

pub struct ValidatableContext<'a, 'b, 'c, 'info, T>(Context<'a, 'b, 'c, 'info, T>)
where
    T: Bumps + ValidateAccounts;

pub trait ValidateAccounts {
    /// Additional arguments required to validate the account.
    ///  (Usually these are going to be the arguments received by the IX)
    type Args;
    /// All validations required for the IX Accounts are done here
    fn validate(&self, args: &Self::Args) -> Result<()>;
}

impl<'a, 'b, 'c, 'info, T> ValidatableContext<'a, 'b, 'c, 'info, T>
where
    T: Bumps + ValidateAccounts,
{
    pub fn new(ctx: Context<'a, 'b, 'c, 'info, T>) -> ValidatableContext<'a, 'b, 'c, 'info, T> {
        Self(ctx)
    }

    /// Gets the usual Anchor `Context`  
    pub fn get_ctx(self) -> Context<'a, 'b, 'c, 'info, T> {
        self.0
    }
}
