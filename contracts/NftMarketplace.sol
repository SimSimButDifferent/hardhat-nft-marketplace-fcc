// SPDX-Licence-Identifier: MIT

pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

error NftMarketplace__PriceMustBeAboveZero();
error NftMarketplace__NotApprovedForMarketplace();

contract NftMarketplace {
    // Main Functions

    function listItem(address nftAddress, uint256 tokenId, uint256 price) external {
        if (price <= 0) {
            revert NftMarketplace__PriceMustBeAboveZero();
        }
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarketplace__NotApprovedForMarketplace();
        }
    }
}

// 1. `listItem`: List NFT's on the marketplace
// 2. `buyItem`: Buy NFT's
// 3. `cancelItem`: Cancel a listing
// 4. `updateListing`: Update price
// 5. `withdrawProceeds`: Withdraw payment for sold NFT's
