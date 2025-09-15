use anchor_lang::prelude::*;
use mpl_bubblegum::hash::{hash_creators, hash_metadata};
use mpl_bubblegum::instructions::{TransferInstructionArgs, UpdateMetadataInstructionArgs};
use mpl_bubblegum::types::{
    Collection, Creator as MplCreator, MetadataArgs, TokenProgramVersion, TokenStandard, UpdateArgs,
};

use borsh::{BorshDeserialize, BorshSerialize};
use mpl_token_metadata::instructions::CreateV1InstructionArgs;
use mpl_token_metadata::types::{
    Collection as MetadataCollection, Creator as MetadataCreator, DataV2,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AnchorTransferInstructionArgs {
    pub root: [u8; 32],
    pub data_hash: [u8; 32],
    pub creator_hash: [u8; 32],
    pub nonce: u64,
    pub index: u32,
}

impl AnchorTransferInstructionArgs {
    pub fn into_transfer_instruction_args(&self) -> Result<TransferInstructionArgs> {
        Ok(TransferInstructionArgs {
            root: self.root,
            data_hash: self.data_hash,
            creator_hash: self.creator_hash,
            nonce: self.nonce,
            index: self.index,
        })
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Eq, PartialEq)]
pub struct Creator {
    pub address: Pubkey,
    pub verified: bool,
    /// The percentage share.
    /// The value is a percentage, not basis points.
    pub share: u8,
}

impl Creator {
    pub fn to_mpl_creator(&self) -> mpl_bubblegum::types::Creator {
        mpl_bubblegum::types::Creator {
            address: self.address,
            verified: self.verified,
            share: self.share,
        }
    }

    pub fn to_metadata_creator(&self) -> MetadataCreator {
        MetadataCreator {
            address: self.address,
            share: self.share,
            verified: self.verified,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PartialAnchorTransferInstructionArgs {
    pub root: [u8; 32],
    pub nonce: u64,
    pub index: u32,
}

impl PartialAnchorTransferInstructionArgs {
    pub fn into_transfer_instruction_args(
        self,
        metadata: &MetadataArgs,
    ) -> Result<TransferInstructionArgs> {
        let data_hash = hash_metadata(metadata)?;
        let creator_hash = hash_creators(&metadata.creators);

        Ok(TransferInstructionArgs {
            root: self.root,
            data_hash,
            creator_hash,
            nonce: self.nonce,
            index: self.index,
        })
    }
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct AnchorUpdateMetadataInstructionArgs {
    pub root: [u8; 32],
    pub nonce: u64,
    pub index: u32,
    pub current_metadata: AnchorMetadataArgs,
    pub update_args: AnchorUpdateArgs,
}

impl AnchorUpdateMetadataInstructionArgs {
    pub fn to_mpl_update_metadata_instruction_args(self) -> UpdateMetadataInstructionArgs {
        UpdateMetadataInstructionArgs {
            root: self.root,
            nonce: self.nonce,
            index: self.index,
            current_metadata: self.current_metadata.to_mpl_metadata_args(),
            update_args: self.update_args.to_mpl_update_args(),
        }
    }
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct AnchorMetadataArgs {
    /// The name of the asset
    pub name: String,
    /// The symbol for the asset
    pub symbol: String,
    /// URI pointing to JSON representing the asset
    pub uri: String,
    /// Royalty basis points that goes to creators in secondary sales (0-10000)
    pub seller_fee_basis_points: u16,
    pub primary_sale_happened: bool,
    pub is_mutable: bool,
    /// Collection
    pub collection: Option<AnchorCollection>,
    pub creators: Vec<Creator>,
}

impl AnchorMetadataArgs {
    pub fn to_mpl_metadata_args(self) -> MetadataArgs {
        MetadataArgs {
            name: self.name,
            symbol: self.symbol,
            uri: self.uri,
            seller_fee_basis_points: self.seller_fee_basis_points,
            primary_sale_happened: self.primary_sale_happened,
            is_mutable: self.is_mutable,
            edition_nonce: None,
            token_standard: Some(TokenStandard::NonFungible),
            uses: None,
            token_program_version: TokenProgramVersion::Original,
            collection: self
                .collection
                .map(|collection| collection.to_mpl_collection()),
            creators: self
                .creators
                .into_iter()
                .map(|creator| creator.to_mpl_creator())
                .collect(),
        }
    }

    pub fn to_metadata_create_cpi_args(self) -> CreateV1InstructionArgs {
        CreateV1InstructionArgs {
            name: self.name,
            symbol: self.symbol,
            uri: self.uri,
            seller_fee_basis_points: self.seller_fee_basis_points,
            creators: None,
            primary_sale_happened: self.primary_sale_happened,
            is_mutable: self.is_mutable,
            token_standard: mpl_token_metadata::types::TokenStandard::FungibleAsset,
            collection: None,
            uses: None,
            collection_details: None,
            rule_set: None,
            decimals: Some(6),
            print_supply: None,
        }
    }
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct AnchorUpdateArgs {
    pub name: Option<String>,
    pub symbol: Option<String>,
    pub uri: Option<String>,
    pub creators: Option<Vec<AnchorCreator>>,
    pub seller_fee_basis_points: Option<u16>,
    pub primary_sale_happened: Option<bool>,
    pub is_mutable: Option<bool>,
}

impl AnchorUpdateArgs {
    pub fn to_mpl_update_args(self) -> UpdateArgs {
        UpdateArgs {
            name: self.name,
            symbol: self.symbol,
            uri: self.uri,
            creators: match self.creators {
                Some(creators) => {
                    let mpl_creators = creators
                        .into_iter()
                        .map(|creator| creator.to_mpl_creator())
                        .collect();

                    Some(mpl_creators)
                }
                None => None,
            },
            seller_fee_basis_points: self.seller_fee_basis_points,
            primary_sale_happened: self.primary_sale_happened,
            is_mutable: self.is_mutable,
        }
    }
}

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct AnchorCollection {
    pub verified: bool,
    pub key: Pubkey,
}

impl AnchorCollection {
    pub fn to_metadata_collection(self) -> MetadataCollection {
        MetadataCollection {
            key: self.key,
            verified: self.verified,
        }
    }

    pub fn to_mpl_collection(self) -> Collection {
        Collection {
            verified: self.verified,
            key: self.key,
        }
    }
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct AnchorCreator {
    pub address: Pubkey,
    pub verified: bool,
    pub share: u8,
}

impl AnchorCreator {
    pub fn to_mpl_creator(self) -> MplCreator {
        MplCreator {
            address: self.address,
            verified: self.verified,
            share: self.share,
        }
    }
}

#[derive(Clone, AnchorDeserialize, AnchorSerialize)]
pub struct LeafData {
    pub index: u32,
    pub nonce: u64,
    pub root: [u8; 32],
    pub hash: [u8; 32],
    pub creator_hash: [u8; 32],
}

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub enum LeafSchemaMpl {
    V1 {
        id: Pubkey,
        owner: Pubkey,
        delegate: Pubkey,
        nonce: u64,
        data_hash: [u8; 32],
        creator_hash: [u8; 32],
    },
}

// #[derive(AnchorDeserialize, AnchorSerialize, Debug)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub struct PartialAnchorMetadataArgs {
    /// The name of the asset
    pub name: String,
    /// The symbol for the asset
    pub symbol: String,
    /// URI pointing to JSON representing the asset
    pub uri: String,
}
