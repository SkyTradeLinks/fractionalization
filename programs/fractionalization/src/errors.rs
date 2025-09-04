use anchor_lang::prelude::*;

#[error_code]
#[derive(PartialEq)]
pub enum CustomError {
    #[msg("Invalid Rent Receiver account")]
    InvalidRentReceiver,
    
    #[msg("The owner of the auction doesnt match with the signer")]
    InvalidAuctionOwner,

    #[msg("Auctions with bids cannot be modified")]
    InvalidAuctionModification,

    #[msg("Invalid Offer Amount")]
    InvalidOfferAmount,
    
    #[msg("Invalid asset id")]
    InvalidAsset,

    #[msg("The Asset Collection is unverified")]
    UnverifiedAsset,

    #[msg("The Asset does not belong to a collection")]
    NoCollection,

    #[msg("The Creator of the Asset cannot be found")]
    CreatorNotFound,

    #[msg("Asset is not verified")]
    CreatorUnverified,

    #[msg("Asset was already verified. Bid has to be topped up")]
    AssetAlreadyVerified,

    #[msg("Auction asset was not verified by the auction creator")]
    AuctionNotVerified,

    #[msg("Auction is still in threshold for the winner to top up their bid deposit")]
    UnverifiedAuctionInThreshold,

    #[msg("Winner bid was topped up. Auction sale has to be executed")]
    AlreadyToppedUp,

    #[msg("Winner bid was not topped up by the auction winner")]
    BidNotToppedUp,

    #[msg("Expected optional account not received")]
    AccountInfoNotFound,

    #[msg("No previous bidder found")]
    BidderUnavailable,

    #[msg("Invalid buyer account")]
    InvalidBuyer,

    #[msg("Only Verified CNFTs are eligible for auctions and offers!")]
    InvalidCNFT,

    #[msg("Metadata of asset does not match the data hash")]
    AssetDoesNotMatch,

    #[msg("The owner provided is not the correct owner of the nft")]
    InvalidOwner,

    #[msg("The auction has ended")]
    AuctionExpired,

    #[msg("The auction is in progress")]
    AuctionInProgress,

    #[msg("Invalid end_time for the auction")]
    InvalidEndTime,

    #[msg("The bid is less than the minimum required")]
    InvalidBidAmount,

    #[msg("Program already initialized!")]
    AlreadyInitialized,

    #[msg("Invalid authority provided!")]
    InvalidAuthority,

    #[msg("Payment receiver is not the actual owner")]
    InvalidReceiver,

    #[msg("Caller doesn't have enough funds to complete this call")]
    InsuffientFunds,

    #[msg("Provided Land NFT data is invalid")]
    InvalidLandNFTData,

    #[msg("Provided Rental Address is invalid")]
    InvalidRentalAddressPassed,

    #[msg("Provided Accounts should be a multiple of 2")]
    InvalidRemainingAccountsPassed,

    #[msg("Provided minutes in the time should be 00 or 30")]
    InvalidTime,

    #[msg("the iso time string is invalid")]
    InvalidTimeString,

    #[msg("Provided time shouldnt be more than 3 month in future")]
    TimeToFarInFuture,

    #[msg("this token mint is not supoorted")]
    InvalidMint,

    #[msg("Rental token has not expired yet")]
    InvalidTransferTime,

    #[msg("Invalid Received Creators Hash")]
    InvalidReceivedCreatorHash,

    #[msg("Invalid Received Creator")]
    InvalidReceivedCreator,

    #[msg("Invalid number of creators!")]
    InvalidCreatorsAmount,

    #[msg("Invalid creator!")]
    InvalidCreator,

    #[msg("InvalidAssetId!")]
    InvalidAssetId,

    #[msg("InvalidAuction!")]
    InvalidAuction,

    #[msg("The auction is not valid to be verified")]
    AuctionInvalidToVerify,

    #[msg("The auction is not valid to top up")]
    AuctionInvalidToTopUp,

    #[msg("GenericError!")]
    GenericError,
}
